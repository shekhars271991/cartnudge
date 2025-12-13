#!/usr/bin/env python3
"""
Load Generator for Event Ingestion Testing
Generates configurable load against the data platform API
"""

import asyncio
import json
import logging
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
import httpx
import yaml
from rich.console import Console
from rich.live import Live
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

from event_generators import EventGenerator

console = Console()


@dataclass
class LoadStats:
    """Track load test statistics"""
    total_events: int = 0
    successful_events: int = 0
    failed_events: int = 0
    total_batches: int = 0
    successful_batches: int = 0
    failed_batches: int = 0
    start_time: float = field(default_factory=time.time)
    errors: list = field(default_factory=list)
    
    @property
    def elapsed_seconds(self) -> float:
        return time.time() - self.start_time
    
    @property
    def events_per_second(self) -> float:
        elapsed = self.elapsed_seconds
        return self.successful_events / elapsed if elapsed > 0 else 0
    
    @property
    def success_rate(self) -> float:
        if self.total_events == 0:
            return 0
        return (self.successful_events / self.total_events) * 100
    
    def to_dict(self) -> dict:
        return {
            "total_events": self.total_events,
            "successful_events": self.successful_events,
            "failed_events": self.failed_events,
            "total_batches": self.total_batches,
            "successful_batches": self.successful_batches,
            "failed_batches": self.failed_batches,
            "elapsed_seconds": round(self.elapsed_seconds, 2),
            "events_per_second": round(self.events_per_second, 2),
            "success_rate": round(self.success_rate, 2),
            "errors": self.errors[-10:],  # Last 10 errors
        }


class LoadGenerator:
    """Main load generator class"""
    
    def __init__(self, config: dict):
        self.config = config
        self.api_config = config.get("api", {})
        self.base_url = self.api_config.get("base_url", "http://localhost:8010")
        self.api_key = self.api_config.get("api_key", "")
        self.timeout = self.api_config.get("timeout_seconds", 30)
        
        self.event_generator = EventGenerator(config)
        self.stats = LoadStats()
        self.running = False
        
        # Configure logging
        log_level = config.get("output", {}).get("log_level", "INFO")
        logging.basicConfig(
            level=getattr(logging, log_level),
            format="%(asctime)s - %(levelname)s - %(message)s",
        )
        self.logger = logging.getLogger(__name__)
    
    def _get_user_ids(self, count: int) -> list[str]:
        """Generate list of user IDs"""
        prefix = self.config.get("users", {}).get("user_id_prefix", "test_user_")
        return [f"{prefix}{i+1:05d}" for i in range(count)]
    
    async def _send_batch(self, client: httpx.AsyncClient, events: list[dict]) -> dict:
        """Send a batch of events to the API"""
        url = f"{self.base_url}/api/v1/events/ingest/batch"
        headers = {"X-API-Key": self.api_key}
        
        payload = {"events": events}
        
        try:
            response = await client.post(
                url,
                json=payload,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            self.logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            self.logger.error(f"Request error: {str(e)}")
            raise
    
    async def _send_single(self, client: httpx.AsyncClient, event: dict) -> dict:
        """Send a single event to the API"""
        url = f"{self.base_url}/api/v1/events/ingest"
        headers = {"X-API-Key": self.api_key}
        
        try:
            response = await client.post(
                url,
                json=event,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            self.logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            self.logger.error(f"Request error: {str(e)}")
            raise
    
    def _generate_events_batch(self, user_ids: list[str], count: int) -> list[dict]:
        """Generate a batch of events"""
        events = []
        weights = self.config.get("events", {}).get("weights", {
            "cart_add": 15, "cart_remove": 5, "page_view": 40, "page_click": 15,
        })
        
        for _ in range(count):
            user_id = user_ids[_ % len(user_ids)]
            event_type = self.event_generator.select_event_type(weights)
            event = self.event_generator.generate_event(event_type, user_id)
            events.append(event)
        
        return events
    
    async def run_load_test(
        self,
        users: int = None,
        duration_minutes: float = None,
        events_per_second: int = None,
        batch_size: int = None,
        use_batch_api: bool = True,
    ):
        """Run the load test"""
        # Get configuration
        users = users or self.config.get("users", {}).get("total_count", 100)
        duration_minutes = duration_minutes or self.config.get("events", {}).get("duration_minutes", 10)
        events_per_second = events_per_second or self.config.get("events", {}).get("events_per_second", 100)
        batch_size = batch_size or self.config.get("events", {}).get("batch_size", 50)
        
        user_ids = self._get_user_ids(users)
        duration_seconds = duration_minutes * 60
        
        console.print(f"\n[bold blue]Starting Load Test[/bold blue]")
        console.print(f"  • Users: {users}")
        console.print(f"  • Duration: {duration_minutes} minutes")
        console.print(f"  • Target: {events_per_second} events/second")
        console.print(f"  • Batch size: {batch_size}")
        console.print(f"  • API: {self.base_url}")
        console.print()
        
        self.stats = LoadStats()
        self.running = True
        
        # Calculate timing
        if use_batch_api:
            batches_per_second = events_per_second / batch_size
            interval = 1.0 / batches_per_second if batches_per_second > 0 else 1.0
        else:
            interval = 1.0 / events_per_second if events_per_second > 0 else 1.0
        
        async with httpx.AsyncClient() as client:
            end_time = time.time() + duration_seconds
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                console=console,
            ) as progress:
                task = progress.add_task(
                    f"[cyan]Generating events...",
                    total=duration_seconds,
                )
                
                while time.time() < end_time and self.running:
                    start = time.time()
                    
                    try:
                        if use_batch_api:
                            events = self._generate_events_batch(user_ids, batch_size)
                            result = await self._send_batch(client, events)
                            
                            self.stats.total_batches += 1
                            self.stats.total_events += len(events)
                            
                            if result.get("successful", 0) == len(events):
                                self.stats.successful_batches += 1
                                self.stats.successful_events += result.get("successful", 0)
                            else:
                                self.stats.failed_events += result.get("failed", 0)
                                self.stats.successful_events += result.get("successful", 0)
                        else:
                            event = self._generate_events_batch(user_ids, 1)[0]
                            await self._send_single(client, event)
                            
                            self.stats.total_events += 1
                            self.stats.successful_events += 1
                    
                    except Exception as e:
                        if use_batch_api:
                            self.stats.failed_batches += 1
                            self.stats.failed_events += batch_size
                            self.stats.total_events += batch_size
                        else:
                            self.stats.failed_events += 1
                            self.stats.total_events += 1
                        
                        self.stats.errors.append({
                            "time": datetime.utcnow().isoformat(),
                            "error": str(e),
                        })
                    
                    # Update progress
                    elapsed = time.time() - self.stats.start_time
                    progress.update(task, completed=min(elapsed, duration_seconds))
                    progress.update(
                        task,
                        description=f"[cyan]Events: {self.stats.successful_events:,} | Rate: {self.stats.events_per_second:.1f}/s | Errors: {self.stats.failed_events}"
                    )
                    
                    # Throttle
                    elapsed_batch = time.time() - start
                    if elapsed_batch < interval:
                        await asyncio.sleep(interval - elapsed_batch)
        
        self.running = False
        self._print_summary()
        self._save_results()
    
    def _print_summary(self):
        """Print test summary"""
        console.print("\n[bold green]Load Test Complete[/bold green]\n")
        
        table = Table(title="Results Summary")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Total Events", f"{self.stats.total_events:,}")
        table.add_row("Successful", f"{self.stats.successful_events:,}")
        table.add_row("Failed", f"{self.stats.failed_events:,}")
        table.add_row("Success Rate", f"{self.stats.success_rate:.2f}%")
        table.add_row("Duration", f"{self.stats.elapsed_seconds:.2f} seconds")
        table.add_row("Avg Events/Second", f"{self.stats.events_per_second:.2f}")
        
        if self.stats.total_batches > 0:
            table.add_row("Total Batches", f"{self.stats.total_batches:,}")
            table.add_row("Failed Batches", f"{self.stats.failed_batches:,}")
        
        console.print(table)
        
        if self.stats.errors:
            console.print("\n[bold red]Recent Errors:[/bold red]")
            for error in self.stats.errors[-5:]:
                console.print(f"  [{error['time']}] {error['error']}")
    
    def _save_results(self):
        """Save results to file"""
        if not self.config.get("output", {}).get("save_results", True):
            return
        
        results_file = self.config.get("output", {}).get("results_file", "results.json")
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "config": {
                "users": self.config.get("users", {}).get("total_count"),
                "events_per_second": self.config.get("events", {}).get("events_per_second"),
                "duration_minutes": self.config.get("events", {}).get("duration_minutes"),
                "batch_size": self.config.get("events", {}).get("batch_size"),
            },
            "stats": self.stats.to_dict(),
        }
        
        with open(results_file, "w") as f:
            json.dump(results, f, indent=2)
        
        console.print(f"\n[dim]Results saved to {results_file}[/dim]")


def load_config(config_path: str) -> dict:
    """Load configuration from YAML file"""
    with open(config_path) as f:
        return yaml.safe_load(f)


@click.command()
@click.option(
    "--config", "-c",
    default="config.yaml",
    help="Path to configuration file",
)
@click.option(
    "--scenario", "-s",
    default=None,
    help="Run a predefined scenario (quick_test, medium_load, heavy_load, stress_test)",
)
@click.option(
    "--users", "-u",
    default=None,
    type=int,
    help="Override number of users",
)
@click.option(
    "--duration", "-d",
    default=None,
    type=float,
    help="Override duration in minutes",
)
@click.option(
    "--rate", "-r",
    default=None,
    type=int,
    help="Override events per second",
)
@click.option(
    "--batch-size", "-b",
    default=None,
    type=int,
    help="Override batch size",
)
@click.option(
    "--single-events",
    is_flag=True,
    help="Use single event API instead of batch",
)
@click.option(
    "--api-key", "-k",
    default=None,
    help="Override API key",
)
@click.option(
    "--base-url",
    default=None,
    help="Override API base URL",
)
def main(
    config: str,
    scenario: Optional[str],
    users: Optional[int],
    duration: Optional[float],
    rate: Optional[int],
    batch_size: Optional[int],
    single_events: bool,
    api_key: Optional[str],
    base_url: Optional[str],
):
    """
    Load Generator for Event Ingestion Testing
    
    Generate configurable load against the data platform event ingestion API.
    
    Examples:
    
        # Quick test with defaults
        python load_generator.py --scenario quick_test
        
        # Custom load
        python load_generator.py --users 500 --duration 5 --rate 200
        
        # With specific API key
        python load_generator.py -k "proj_xxx_yyy" --scenario medium_load
    """
    try:
        cfg = load_config(config)
    except FileNotFoundError:
        console.print(f"[red]Config file not found: {config}[/red]")
        console.print("Creating default config.yaml...")
        # The config file should already exist from setup
        sys.exit(1)
    
    # Apply scenario overrides
    if scenario:
        scenarios = cfg.get("scenarios", {})
        if scenario not in scenarios:
            console.print(f"[red]Unknown scenario: {scenario}[/red]")
            console.print(f"Available: {', '.join(scenarios.keys())}")
            sys.exit(1)
        
        scenario_config = scenarios[scenario]
        users = users or scenario_config.get("users")
        duration = duration or scenario_config.get("duration_minutes")
        rate = rate or scenario_config.get("events_per_second")
    
    # Apply CLI overrides
    if api_key:
        cfg["api"]["api_key"] = api_key
    if base_url:
        cfg["api"]["base_url"] = base_url
    if users:
        cfg["users"]["total_count"] = users
    if duration:
        cfg["events"]["duration_minutes"] = duration
    if rate:
        cfg["events"]["events_per_second"] = rate
    if batch_size:
        cfg["events"]["batch_size"] = batch_size
    
    # Validate API key
    if not cfg.get("api", {}).get("api_key") or "YOUR_SECRET" in cfg.get("api", {}).get("api_key", ""):
        console.print("[yellow]Warning: API key not configured![/yellow]")
        console.print("Set it in config.yaml or use --api-key flag")
        console.print("Format: proj_{project_id}_{secret}")
        sys.exit(1)
    
    # Run load test
    generator = LoadGenerator(cfg)
    asyncio.run(generator.run_load_test(
        users=users,
        duration_minutes=duration,
        events_per_second=rate,
        batch_size=batch_size,
        use_batch_api=not single_events,
    ))


if __name__ == "__main__":
    main()

