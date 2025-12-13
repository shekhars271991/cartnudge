#!/usr/bin/env python3
"""
Generate sample cURL commands for manual testing
Useful for quick tests without running the full load generator
"""

import json
import random
import uuid
from datetime import datetime

import click
import yaml
from rich.console import Console
from rich.syntax import Syntax

console = Console()


def generate_cart_add_event(user_id: str, session_id: str) -> dict:
    """Generate a cart.add event"""
    return {
        "topic": "cart_events",
        "event_type": "cart.add",
        "data": {
            "user_id": user_id,
            "session_id": session_id,
            "product_id": f"prod_{random.randint(1, 100):04d}",
            "product_name": f"Test Product {random.randint(1, 100)}",
            "quantity": random.randint(1, 3),
            "price": round(random.uniform(19.99, 199.99), 2),
            "currency": "USD",
        }
    }


def generate_page_view_event(user_id: str, session_id: str) -> dict:
    """Generate a page.view event"""
    page_types = ["home", "product", "category", "cart", "checkout"]
    page_type = random.choice(page_types)
    
    return {
        "topic": "page_events",
        "event_type": "page.view",
        "data": {
            "user_id": user_id,
            "session_id": session_id,
            "page_url": f"/{page_type}" if page_type != "home" else "/",
            "page_title": f"{page_type.title()} Page",
            "page_type": page_type,
            "referrer": random.choice(["", "https://google.com", ""]),
        }
    }


def generate_order_created_event(user_id: str) -> dict:
    """Generate an order.created event"""
    return {
        "topic": "order_events",
        "event_type": "order.created",
        "data": {
            "user_id": user_id,
            "order_id": f"ORD-{random.randint(100000, 999999)}",
            "total_amount": round(random.uniform(50, 500), 2),
            "currency": "USD",
            "status": "pending",
            "item_count": random.randint(1, 5),
            "payment_method": random.choice(["credit_card", "paypal"]),
        }
    }


def generate_user_signup_event(user_id: str) -> dict:
    """Generate a user.signup event"""
    return {
        "topic": "user_events",
        "event_type": "user.signup",
        "data": {
            "user_id": user_id,
            "email": f"{user_id}@example.com",
            "signup_source": random.choice(["organic", "google_ads", "referral"]),
        }
    }


def format_curl(base_url: str, api_key: str, event: dict) -> str:
    """Format event as a cURL command"""
    json_str = json.dumps(event, indent=2)
    
    return f'''curl -X POST "{base_url}/api/v1/events/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: {api_key}" \\
  -d '{json.dumps(event)}'
'''


def format_curl_batch(base_url: str, api_key: str, events: list) -> str:
    """Format events as a batch cURL command"""
    payload = {"events": events}
    
    return f'''curl -X POST "{base_url}/api/v1/events/ingest/batch" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: {api_key}" \\
  -d '{json.dumps(payload)}'
'''


@click.command()
@click.option("--config", "-c", default="config.yaml", help="Config file path")
@click.option("--api-key", "-k", default=None, help="API key override")
@click.option("--base-url", "-u", default=None, help="Base URL override")
@click.option("--user-id", default=None, help="Specific user ID to use")
@click.option("--event-type", "-t", default="all", 
              type=click.Choice(["all", "cart", "page", "order", "user", "batch"]),
              help="Type of events to generate")
@click.option("--count", "-n", default=1, type=int, help="Number of events for batch")
def main(config: str, api_key: str, base_url: str, user_id: str, event_type: str, count: int):
    """
    Generate sample cURL commands for event ingestion testing.
    
    Examples:
    
        # Generate all event types
        python generate_curls.py
        
        # Generate specific event type
        python generate_curls.py --event-type cart
        
        # Generate a batch of events
        python generate_curls.py --event-type batch --count 5
        
        # Use specific user
        python generate_curls.py --user-id "test_user_001"
    """
    # Load config
    try:
        with open(config) as f:
            cfg = yaml.safe_load(f)
    except FileNotFoundError:
        cfg = {"api": {"base_url": "http://localhost:8010", "api_key": ""}}
    
    # Apply overrides
    base_url = base_url or cfg.get("api", {}).get("base_url", "http://localhost:8010")
    api_key = api_key or cfg.get("api", {}).get("api_key", "YOUR_API_KEY_HERE")
    user_id = user_id or f"test_user_{random.randint(1, 1000):05d}"
    session_id = str(uuid.uuid4())
    
    console.print("\n[bold blue]Sample cURL Commands for Event Ingestion[/bold blue]\n")
    console.print(f"Base URL: {base_url}")
    console.print(f"User ID: {user_id}")
    console.print(f"Session ID: {session_id}")
    console.print()
    
    if api_key == "YOUR_API_KEY_HERE" or "YOUR_SECRET" in api_key:
        console.print("[yellow]⚠️  Replace YOUR_API_KEY_HERE with your actual API key[/yellow]\n")
    
    if event_type == "all":
        # Generate one of each type
        console.print("[bold cyan]Cart Add Event:[/bold cyan]")
        event = generate_cart_add_event(user_id, session_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
        console.print("\n[bold cyan]Page View Event:[/bold cyan]")
        event = generate_page_view_event(user_id, session_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
        console.print("\n[bold cyan]Order Created Event:[/bold cyan]")
        event = generate_order_created_event(user_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
        console.print("\n[bold cyan]User Signup Event:[/bold cyan]")
        event = generate_user_signup_event(user_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
    elif event_type == "cart":
        event = generate_cart_add_event(user_id, session_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
    elif event_type == "page":
        event = generate_page_view_event(user_id, session_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
    elif event_type == "order":
        event = generate_order_created_event(user_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
    elif event_type == "user":
        event = generate_user_signup_event(user_id)
        console.print(Syntax(format_curl(base_url, api_key, event), "bash"))
        
    elif event_type == "batch":
        events = []
        for i in range(count):
            uid = f"{user_id}_{i+1:03d}" if count > 1 else user_id
            events.extend([
                generate_page_view_event(uid, session_id),
                generate_cart_add_event(uid, session_id),
            ])
        
        console.print(f"[bold cyan]Batch of {len(events)} events:[/bold cyan]")
        console.print(Syntax(format_curl_batch(base_url, api_key, events), "bash"))
    
    console.print()


if __name__ == "__main__":
    main()

