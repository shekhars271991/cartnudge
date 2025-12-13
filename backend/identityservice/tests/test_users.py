"""
Tests for User API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, auth_headers: dict):
    """Test getting current user profile."""
    response = await client.get(
        "/api/v1/users/me",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert data["name"] == "Test User"
    assert "_id" in data


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """Test getting current user without auth."""
    response = await client.get("/api/v1/users/me")
    
    assert response.status_code == 403  # No auth header


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: AsyncClient):
    """Test getting current user with invalid token."""
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_current_user(client: AsyncClient, auth_headers: dict):
    """Test updating current user profile."""
    response = await client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"name": "Updated Name"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["email"] == "testuser@example.com"


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, auth_headers: dict):
    """Test changing password."""
    response = await client.put(
        "/api/v1/users/me/password",
        headers=auth_headers,
        json={
            "current_password": "password123",
            "new_password": "newpassword123",
        },
    )
    
    assert response.status_code == 200
    assert "changed" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient, auth_headers: dict):
    """Test changing password with wrong current password."""
    response = await client.put(
        "/api/v1/users/me/password",
        headers=auth_headers,
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword123",
        },
    )
    
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_delete_account(client: AsyncClient, auth_headers: dict):
    """Test deleting account."""
    response = await client.delete(
        "/api/v1/users/me",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()
    
    # Verify can't access anymore
    response = await client.get(
        "/api/v1/users/me",
        headers=auth_headers,
    )
    assert response.status_code == 401






