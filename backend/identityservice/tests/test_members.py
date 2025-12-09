"""
Tests for Team Member API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_members(client: AsyncClient, auth_headers: dict, project: dict):
    """Test listing project members."""
    response = await client.get(
        f"/api/v1/projects/{project['_id']}/members",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["role"] == "owner"
    assert data[0]["email"] == "testuser@example.com"


@pytest.mark.asyncio
async def test_invite_member(client: AsyncClient, auth_headers: dict, project: dict):
    """Test inviting a new member."""
    response = await client.post(
        f"/api/v1/projects/{project['_id']}/members/invite",
        headers=auth_headers,
        json={
            "email": "newmember@example.com",
            "role": "developer",
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newmember@example.com"
    assert data["role"] == "developer"
    assert "expires_at" in data


@pytest.mark.asyncio
async def test_invite_member_as_owner_fails(client: AsyncClient, auth_headers: dict, project: dict):
    """Test that inviting as owner fails."""
    response = await client.post(
        f"/api/v1/projects/{project['_id']}/members/invite",
        headers=auth_headers,
        json={
            "email": "newmember@example.com",
            "role": "owner",
        },
    )
    
    assert response.status_code == 400
    assert "owner" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invite_duplicate_fails(client: AsyncClient, auth_headers: dict, project: dict):
    """Test that duplicate invitation fails."""
    # First invitation
    await client.post(
        f"/api/v1/projects/{project['_id']}/members/invite",
        headers=auth_headers,
        json={
            "email": "newmember@example.com",
            "role": "developer",
        },
    )
    
    # Second invitation to same email
    response = await client.post(
        f"/api/v1/projects/{project['_id']}/members/invite",
        headers=auth_headers,
        json={
            "email": "newmember@example.com",
            "role": "admin",
        },
    )
    
    assert response.status_code == 400
    assert "already" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_invitation(client: AsyncClient, auth_headers: dict, project: dict, test_db):
    """Test getting invitation details."""
    # Create invitation
    await client.post(
        f"/api/v1/projects/{project['_id']}/members/invite",
        headers=auth_headers,
        json={
            "email": "newmember@example.com",
            "role": "developer",
        },
    )
    
    # Get the token from the test database
    invitation = await test_db.invitations.find_one({"email": "newmember@example.com"})
    
    response = await client.get(
        f"/api/v1/invitations/{invitation['token']}",
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newmember@example.com"
    assert data["role"] == "developer"
    assert data["project_name"] == "Test Project"


@pytest.mark.asyncio
async def test_get_invalid_invitation(client: AsyncClient):
    """Test getting invalid invitation."""
    response = await client.get(
        "/api/v1/invitations/invalid-token",
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_accept_invitation(client: AsyncClient, auth_headers: dict, project: dict, test_db):
    """Test accepting an invitation."""
    # Create invitation for a new user
    await client.post(
        f"/api/v1/projects/{project['_id']}/members/invite",
        headers=auth_headers,
        json={
            "email": "invited@example.com",
            "role": "developer",
        },
    )
    
    # Register the invited user
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "invited@example.com",
            "password": "password123",
            "name": "Invited User",
        },
    )
    
    # Login as the invited user
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "invited@example.com",
            "password": "password123",
        },
    )
    invited_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
    
    # Get invitation token from the test database
    invitation = await test_db.invitations.find_one({"email": "invited@example.com"})
    
    # Accept invitation
    response = await client.post(
        f"/api/v1/invitations/{invitation['token']}/accept",
        headers=invited_headers,
    )
    
    assert response.status_code == 200
    
    # Verify user is now a member
    members_response = await client.get(
        f"/api/v1/projects/{project['_id']}/members",
        headers=auth_headers,
    )
    members = members_response.json()
    assert len(members) == 2
    assert any(m["email"] == "invited@example.com" and m["role"] == "developer" for m in members)
