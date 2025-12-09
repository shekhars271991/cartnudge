"""
Tests for Internal API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_validate_token_valid(client: AsyncClient, registered_user: dict):
    """Test validating a valid token."""
    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "password123",
        },
    )
    access_token = login_response.json()["access_token"]
    
    # Validate token
    response = await client.post(
        "/api/v1/internal/validate-token",
        json={"token": access_token},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["user_id"] is not None
    assert data["error"] is None


@pytest.mark.asyncio
async def test_validate_token_invalid(client: AsyncClient):
    """Test validating an invalid token."""
    response = await client.post(
        "/api/v1/internal/validate-token",
        json={"token": "invalid-token"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert data["error"] is not None


@pytest.mark.asyncio
async def test_validate_api_key_valid(client: AsyncClient, auth_headers: dict, project: dict):
    """Test validating a valid API key."""
    # Create API key
    create_response = await client.post(
        f"/api/v1/projects/{project['_id']}/api-keys",
        headers=auth_headers,
        json={"name": "Test Key", "scopes": ["ingest"]},
    )
    api_key = create_response.json()["key"]
    
    # Validate API key
    response = await client.post(
        "/api/v1/internal/validate-api-key",
        json={"api_key": api_key},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["project_id"] == project["_id"]
    assert data["scopes"] == ["ingest"]


@pytest.mark.asyncio
async def test_validate_api_key_invalid(client: AsyncClient):
    """Test validating an invalid API key."""
    response = await client.post(
        "/api/v1/internal/validate-api-key",
        json={"api_key": "cn_invalid-key"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert data["error"] is not None


@pytest.mark.asyncio
async def test_get_permissions(client: AsyncClient, auth_headers: dict, project: dict, registered_user: dict):
    """Test getting user permissions."""
    response = await client.get(
        f"/api/v1/internal/projects/{project['_id']}/permissions/{registered_user['_id']}",
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "owner"
    assert data["permissions"] == ["*"]


@pytest.mark.asyncio
async def test_get_permissions_not_member(client: AsyncClient, project: dict):
    """Test getting permissions for non-member."""
    response = await client.get(
        f"/api/v1/internal/projects/{project['_id']}/permissions/000000000000000000000000",
    )
    
    assert response.status_code == 404

