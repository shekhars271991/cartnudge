#!/usr/bin/env python3
"""
Data Verification Script
Check that events are properly stored in ClickHouse and features are in Aerospike
"""

import sys

import httpx
from rich.console import Console
from rich.table import Table

console = Console()

DEFAULT_BASE_URL = "http://localhost:8010"


def check_clickhouse_events(client: httpx.Client, base_url: str, api_key: str, user_id: str = None):
    """Check events in ClickHouse via the API"""
    console.print("\n[bold cyan]📊 ClickHouse Events[/bold cyan]")
    
    try:
        # Get event stats
        params = {}
        if user_id:
            params["user_id"] = user_id
        
        # This endpoint may need to be implemented - using analytics if available
        response = client.get(
            f"{base_url}/api/v1/events/stats",
            headers={"X-API-Key": api_key},
            params=params,
            timeout=30,
        )
        
        if response.status_code == 200:
            data = response.json()
            console.print(f"  Total events: {data.get('total_events', 'N/A')}")
            console.print(f"  Unique users: {data.get('unique_users', 'N/A')}")
            return True
        else:
            console.print(f"  [yellow]Stats endpoint returned {response.status_code}[/yellow]")
            return False
            
    except Exception as e:
        console.print(f"  [yellow]Could not fetch stats: {e}[/yellow]")
        return False


def check_aerospike_features(client: httpx.Client, base_url: str, api_key: str, user_id: str, project_id: str):
    """Check features in Aerospike via the API"""
    console.print("\n[bold cyan]🔧 Aerospike Features[/bold cyan]")
    
    try:
        response = client.get(
            f"{base_url}/api/v1/features/user/{user_id}",
            headers={"X-API-Key": api_key},
            timeout=30,
        )
        
        if response.status_code == 200:
            data = response.json()
            features = data.get("features", {})
            
            if features:
                console.print(f"  ✅ Features found for user {user_id}")
                
                table = Table(show_header=True)
                table.add_column("Feature", style="cyan")
                table.add_column("Value")
                
                # Show first 10 features
                for i, (key, value) in enumerate(list(features.items())[:10]):
                    table.add_row(key, str(value))
                
                if len(features) > 10:
                    table.add_row("...", f"(+{len(features) - 10} more)")
                
                console.print(table)
                return True
            else:
                console.print(f"  [yellow]No features found for user {user_id}[/yellow]")
                console.print("  [dim]Features may not have been computed yet. Run the feature aggregation job.[/dim]")
                return False
                
        elif response.status_code == 404:
            console.print(f"  [yellow]No features found for user {user_id}[/yellow]")
            return False
        else:
            console.print(f"  [red]Error: {response.status_code}[/red]")
            return False
            
    except Exception as e:
        console.print(f"  [red]Error checking features: {e}[/red]")
        return False


def check_feature_groups(client: httpx.Client, base_url: str, api_key: str, user_id: str, project_id: str):
    """Check feature groups in Aerospike"""
    console.print("\n[bold cyan]📁 Feature Groups[/bold cyan]")
    
    try:
        response = client.get(
            f"{base_url}/api/v1/features/user/{user_id}/groups",
            headers={"X-API-Key": api_key},
            timeout=30,
        )
        
        if response.status_code == 200:
            data = response.json()
            groups = data.get("groups", {})
            available = data.get("available_groups", [])
            
            console.print(f"  Available groups: {', '.join(available) if available else 'None'}")
            
            if groups:
                table = Table(show_header=True)
                table.add_column("Group", style="cyan")
                table.add_column("Features")
                table.add_column("Updated")
                
                for group_name, group_data in groups.items():
                    features = group_data.get("features", {})
                    updated = group_data.get("updated_at", "N/A")
                    table.add_row(group_name, str(len(features)), updated[:19] if updated else "N/A")
                
                console.print(table)
                return True
            else:
                console.print("  [yellow]No feature groups found[/yellow]")
                return False
                
        else:
            console.print(f"  [yellow]Feature groups endpoint returned {response.status_code}[/yellow]")
            return False
            
    except Exception as e:
        console.print(f"  [yellow]Could not fetch feature groups: {e}[/yellow]")
        return False


def main():
    """Main entry point"""
    if len(sys.argv) < 3:
        console.print("[red]Usage: python verify_data.py <api_key> <user_id> [base_url][/red]")
        console.print("\nExample:")
        console.print('  python verify_data.py "proj_xxx_yyy" "test_user_00001"')
        console.print('  python verify_data.py "proj_xxx_yyy" "test_user_00001" "http://localhost:8010"')
        sys.exit(1)
    
    api_key = sys.argv[1]
    user_id = sys.argv[2]
    base_url = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_BASE_URL
    
    # Extract project_id from API key
    if api_key.startswith("proj_"):
        parts = api_key.split("_")
        if len(parts) >= 3:
            project_id = parts[1]
        else:
            project_id = "unknown"
    else:
        project_id = "unknown"
    
    console.print("\n[bold blue]🔍 Data Verification[/bold blue]")
    console.print(f"API: {base_url}")
    console.print(f"User: {user_id}")
    console.print(f"Project: {project_id}")
    
    with httpx.Client() as client:
        # Check ClickHouse
        ch_ok = check_clickhouse_events(client, base_url, api_key, user_id)
        
        # Check Aerospike features
        as_ok = check_aerospike_features(client, base_url, api_key, user_id, project_id)
        
        # Check feature groups
        fg_ok = check_feature_groups(client, base_url, api_key, user_id, project_id)
    
    # Summary
    console.print("\n[bold]Summary[/bold]")
    console.print(f"  ClickHouse: {'✅' if ch_ok else '⚠️'}")
    console.print(f"  Aerospike Features: {'✅' if as_ok else '⚠️'}")
    console.print(f"  Feature Groups: {'✅' if fg_ok else '⚠️'}")
    console.print()
    
    if not as_ok and not fg_ok:
        console.print("[dim]Note: If events were just ingested, features may take a few minutes to compute.")
        console.print("The feature aggregation job runs periodically to compute features from events.[/dim]")


if __name__ == "__main__":
    main()

