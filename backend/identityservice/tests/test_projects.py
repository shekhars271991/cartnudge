"""
Tests for Project API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers: dict):
    """Test creating a project."""
    response = await client.post(
        "/api/v1/projects",
        headers=auth_headers,
        json={
            "name": "My Project",
            "description": "A test project",
            "timezone": "America/New_York",
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Project"
    assert data["description"] == "A test project"
    assert data["timezone"] == "America/New_York"
    assert data["slug"] == "my-project"
    assert data["is_active"] is True
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "owner"


@pytest.mark.asyncio
async def test_create_project_generates_unique_slug(client: AsyncClient, auth_headers: dict):
    """Test that duplicate project names get unique slugs."""
    # Create first project
    await client.post(
        "/api/v1/projects",
        headers=auth_headers,
        json={"name": "Test Project"},
    )
    
    # Create second project with same name
    response = await client.post(
        "/api/v1/projects",
        headers=auth_headers,
        json={"name": "Test Project"},
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "test-project-1"


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient, auth_headers: dict, project: dict):
    """Test listing user's projects."""
    response = await client.get(
        "/api/v1/projects",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    assert any(p["name"] == "Test Project" for p in data["items"])


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient, auth_headers: dict, project: dict):
    """Test getting a project by ID."""
    response = await client.get(
        f"/api/v1/projects/{project['_id']}",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["_id"] == project["_id"]
    assert data["name"] == "Test Project"


@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting non-existent project."""
    response = await client.get(
        "/api/v1/projects/000000000000000000000000",
        headers=auth_headers,
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, auth_headers: dict, project: dict):
    """Test updating a project."""
    response = await client.put(
        f"/api/v1/projects/{project['_id']}",
        headers=auth_headers,
        json={
            "name": "Updated Project",
            "description": "Updated description",
        },
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Project"
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient, auth_headers: dict, project: dict):
    """Test deleting a project."""
    response = await client.delete(
        f"/api/v1/projects/{project['_id']}",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()
    
    # Verify project is no longer accessible
    response = await client.get(
        f"/api/v1/projects/{project['_id']}",
        headers=auth_headers,
    )
    assert response.status_code == 404



