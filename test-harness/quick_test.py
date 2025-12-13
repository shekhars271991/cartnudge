#!/usr/bin/env python3
"""
Quick Test Script
Simple script to send a few test events and verify the API is working
"""

import json
import sys
import time

import httpx
from rich.console import Console
from rich.table import Table

console = Console()

# Default configuration
DEFAULT_BASE_URL = "http://localhost:8010"


def send_event(client: httpx.Client, base_url: str, api_key: str, event: dict) -> dict:
    """Send a single event"""
    response = client.post(
        f"{base_url}/api/v1/events/ingest",
        json=event,
        headers={"X-API-Key": api_key},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def run_quick_test(api_key: str, base_url: str = DEFAULT_BASE_URL, user_id: str = "quick_test_user"):
    """Run a quick test with a few events"""
    
    console.print("\n[bold blue]🧪 Quick Test - Event Ingestion[/bold blue]\n")
    console.print(f"API: {base_url}")
    console.print(f"User: {user_id}")
    console.print()
    
    # Test events
    test_events = [
        {
            "name": "Page View",
            "event": {
                "topic": "page_events",
                "event_type": "page.view",
                "data": {
                    "user_id": user_id,
                    "session_id": "test-session-001",
                    "page_url": "/",
                    "page_title": "Home Page",
                    "page_type": "home",
                }
            }
        },
        {
            "name": "Cart Add",
            "event": {
                "topic": "cart_events",
                "event_type": "cart.add",
                "data": {
                    "user_id": user_id,
                    "session_id": "test-session-001",
                    "product_id": "prod_0001",
                    "product_name": "Test Product",
                    "quantity": 1,
                    "price": 29.99,
                    "currency": "USD",
                }
            }
        },
        {
            "name": "Order Created",
            "event": {
                "topic": "order_events",
                "event_type": "order.created",
                "data": {
                    "user_id": user_id,
                    "order_id": "ORD-TEST-001",
                    "total_amount": 29.99,
                    "currency": "USD",
                    "status": "pending",
                    "item_count": 1,
                    "payment_method": "credit_card",
                }
            }
        },
    ]
    
    results = []
    
    with httpx.Client() as client:
        for test in test_events:
            try:
                start = time.time()
                result = send_event(client, base_url, api_key, test["event"])
                elapsed = (time.time() - start) * 1000
                
                results.append({
                    "name": test["name"],
                    "status": "✅ Success",
                    "event_id": result.get("event_id", "N/A"),
                    "time_ms": f"{elapsed:.1f}",
                })
                
            except httpx.HTTPStatusError as e:
                results.append({
                    "name": test["name"],
                    "status": f"❌ HTTP {e.response.status_code}",
                    "event_id": "-",
                    "time_ms": "-",
                })
                console.print(f"[red]Error: {e.response.text}[/red]")
                
            except Exception as e:
                results.append({
                    "name": test["name"],
                    "status": f"❌ Error",
                    "event_id": "-",
                    "time_ms": "-",
                })
                console.print(f"[red]Error: {str(e)}[/red]")
    
    # Print results table
    table = Table(title="Test Results")
    table.add_column("Event", style="cyan")
    table.add_column("Status")
    table.add_column("Event ID", style="dim")
    table.add_column("Time (ms)", justify="right")
    
    for r in results:
        table.add_row(r["name"], r["status"], r["event_id"], r["time_ms"])
    
    console.print(table)
    
    # Summary
    success_count = sum(1 for r in results if "Success" in r["status"])
    console.print()
    if success_count == len(results):
        console.print("[bold green]✅ All tests passed![/bold green]")
    else:
        console.print(f"[bold yellow]⚠️  {success_count}/{len(results)} tests passed[/bold yellow]")
    
    return success_count == len(results)


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        console.print("[red]Usage: python quick_test.py <api_key> [base_url] [user_id][/red]")
        console.print("\nExample:")
        console.print('  python quick_test.py "proj_693aaf4df7c091f934f75483_xxx"')
        console.print('  python quick_test.py "proj_xxx" "http://localhost:8010" "my_user"')
        sys.exit(1)
    
    api_key = sys.argv[1]
    base_url = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BASE_URL
    user_id = sys.argv[3] if len(sys.argv) > 3 else "quick_test_user"
    
    success = run_quick_test(api_key, base_url, user_id)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

