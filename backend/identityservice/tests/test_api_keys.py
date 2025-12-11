"""
Tests for API Key API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_api_key(client: AsyncClient, auth_headers: dict, project: dict):
    """Test creating an API key."""
    response = await client.post(
        f"/api/v1/projects/{project['_id']}/api-keys",
        headers=auth_headers,
        json={
            "name": "Production Key",
            "scopes": ["ingest", "read_features"],
            "expires_in_days": 365,
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Production Key"
    assert "key" in data  # Full key is returned only on creation
    assert data["key"].startswith("cn_")
    assert data["key_prefix"] == data["key"][:11]
    assert data["scopes"] == ["ingest", "read_features"]


@pytest.mark.asyncio
async def test_create_api_key_no_expiry(client: AsyncClient, auth_headers: dict, project: dict):
    """Test creating an API key without expiry."""
    response = await client.post(
        f"/api/v1/projects/{project['_id']}/api-keys",
        headers=auth_headers,
        json={
            "name": "Never Expires Key",
            "scopes": ["ingest"],
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["expires_at"] is None


@pytest.mark.asyncio
async def test_list_api_keys(client: AsyncClient, auth_headers: dict, project: dict):
    """Test listing API keys."""
    # Create a key first
    await client.post(
        f"/api/v1/projects/{project['_id']}/api-keys",
        headers=auth_headers,
        json={"name": "Test Key", "scopes": ["ingest"]},
    )
    
    response = await client.get(
        f"/api/v1/projects/{project['_id']}/api-keys",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    
    # Full key should NOT be in list response
    for key in data["items"]:
        assert "key" not in key or len(key.get("key", "")) <= 11


@pytest.mark.asyncio
async def test_revoke_api_key(client: AsyncClient, auth_headers: dict, project: dict):
    """Test revoking an API key."""
    # Create a key
    create_response = await client.post(
        f"/api/v1/projects/{project['_id']}/api-keys",
        headers=auth_headers,
        json={"name": "To Be Revoked", "scopes": ["ingest"]},
    )
    key_id = create_response.json()["_id"]
    
    # Revoke it
    response = await client.delete(
        f"/api/v1/projects/{project['_id']}/api-keys/{key_id}",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    assert "revoked" in response.json()["message"].lower()
    
    # Verify it's no longer in active keys
    list_response = await client.get(
        f"/api/v1/projects/{project['_id']}/api-keys",
        headers=auth_headers,
    )
    keys = list_response.json()["items"]
    assert not any(k["_id"] == key_id for k in keys)


@pytest.mark.asyncio
async def test_revoke_nonexistent_key(client: AsyncClient, auth_headers: dict, project: dict):
    """Test revoking a non-existent API key."""
    response = await client.delete(
        f"/api/v1/projects/{project['_id']}/api-keys/000000000000000000000000",
        headers=auth_headers,
    )
    
    assert response.status_code == 404



