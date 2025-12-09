"""
Tests for Datablock API endpoints.
"""

import pytest
from httpx import AsyncClient


# -----------------------------------------------------------------------------
# Template Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_templates(client: AsyncClient):
    """Test listing predefined datablock templates."""
    response = await client.get("/api/v1/datablocks/templates")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Check that each template has required fields
    for template in data:
        assert "template_id" in template
        assert "name" in template
        assert "display_name" in template
        assert "description" in template
        assert "source_type" in template
        assert "default_schema" in template


@pytest.mark.asyncio
async def test_get_template_users(client: AsyncClient):
    """Test getting the 'users' predefined template."""
    response = await client.get("/api/v1/datablocks/templates/users")
    
    assert response.status_code == 200
    data = response.json()
    assert data["template_id"] == "users"
    assert data["name"] == "users"
    assert data["display_name"] == "Users"
    assert data["source_type"] == "hybrid"
    assert len(data["default_schema"]) > 0


@pytest.mark.asyncio
async def test_get_template_not_found(client: AsyncClient):
    """Test getting a non-existent template."""
    response = await client.get("/api/v1/datablocks/templates/nonexistent")
    
    assert response.status_code == 404


# -----------------------------------------------------------------------------
# Datablock CRUD Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_custom_datablock(client: AsyncClient):
    """Test creating a custom datablock."""
    response = await client.post(
        "/api/v1/projects/test-project/datablocks",
        json={
            "name": "custom_events",
            "display_name": "Custom Events",
            "description": "My custom event tracking",
            "source_type": "event",
            "icon": "database",
            "schema_fields": [
                {
                    "name": "event_id",
                    "type": "string",
                    "required": True,
                    "is_primary_key": True,
                    "description": "Unique event ID",
                },
                {
                    "name": "user_id",
                    "type": "string",
                    "required": True,
                    "is_primary_key": False,
                    "description": "User identifier",
                },
                {
                    "name": "event_type",
                    "type": "string",
                    "required": True,
                    "is_primary_key": False,
                    "description": "Type of event",
                },
            ],
            "event_topic": "custom.event",
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "custom_events"
    assert data["display_name"] == "Custom Events"
    assert data["source_type"] == "event"
    assert data["status"] == "not_configured"
    assert data["project_id"] == "test-project"
    assert len(data["schema_fields"]) == 3


@pytest.mark.asyncio
async def test_create_datablock_from_template(client: AsyncClient):
    """Test creating a datablock from a predefined template."""
    response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/products"
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "products"
    assert data["display_name"] == "Products"
    assert data["source_type"] == "csv"
    assert data["status"] == "not_configured"
    assert data["project_id"] == "test-project"
    assert data["is_predefined"] is True


@pytest.mark.asyncio
async def test_create_datablock_from_template_not_found(client: AsyncClient):
    """Test creating from a non-existent template."""
    response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/nonexistent"
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_duplicate_datablock(client: AsyncClient):
    """Test creating a datablock with duplicate name."""
    # Create first datablock from template
    await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/users"
    )
    
    # Try to create duplicate from same template
    response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/users"
    )
    
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_datablocks(client: AsyncClient):
    """Test listing datablocks for a project."""
    # Create some datablocks
    await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/users"
    )
    await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/products"
    )
    
    response = await client.get("/api/v1/projects/test-project/datablocks")
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_list_datablocks_pagination(client: AsyncClient):
    """Test pagination when listing datablocks."""
    # Create 3 datablocks
    await client.post("/api/v1/projects/test-project/datablocks/from-template/users")
    await client.post("/api/v1/projects/test-project/datablocks/from-template/products")
    await client.post("/api/v1/projects/test-project/datablocks/from-template/orders")
    
    # Get with limit
    response = await client.get(
        "/api/v1/projects/test-project/datablocks",
        params={"skip": 0, "limit": 2},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_get_datablock(client: AsyncClient):
    """Test getting a specific datablock."""
    # Create a datablock
    create_response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/cart_events"
    )
    datablock_id = create_response.json()["_id"]
    
    # Get the datablock
    response = await client.get(
        f"/api/v1/projects/test-project/datablocks/{datablock_id}"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["_id"] == datablock_id
    assert data["name"] == "cart_events"
    assert data["display_name"] == "Cart Events"


@pytest.mark.asyncio
async def test_get_datablock_not_found(client: AsyncClient):
    """Test getting a non-existent datablock."""
    response = await client.get(
        "/api/v1/projects/test-project/datablocks/000000000000000000000000"
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_datablock(client: AsyncClient):
    """Test updating a datablock."""
    # Create a datablock
    create_response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/page_views"
    )
    datablock_id = create_response.json()["_id"]
    
    # Update it
    response = await client.put(
        f"/api/v1/projects/test-project/datablocks/{datablock_id}",
        json={
            "description": "Updated description for page views",
        },
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description for page views"


@pytest.mark.asyncio
async def test_delete_datablock(client: AsyncClient):
    """Test deleting a datablock."""
    # Create a datablock
    create_response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/users"
    )
    datablock_id = create_response.json()["_id"]
    
    # Delete it
    response = await client.delete(
        f"/api/v1/projects/test-project/datablocks/{datablock_id}"
    )
    
    assert response.status_code == 204
    
    # Verify it's gone
    get_response = await client.get(
        f"/api/v1/projects/test-project/datablocks/{datablock_id}"
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_datablock_not_found(client: AsyncClient):
    """Test deleting a non-existent datablock."""
    response = await client.delete(
        "/api/v1/projects/test-project/datablocks/000000000000000000000000"
    )
    
    assert response.status_code == 404


# -----------------------------------------------------------------------------
# Status Update Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mark_datablock_ready_for_deployment(client: AsyncClient):
    """Test marking a datablock as ready for deployment."""
    # Create a datablock
    create_response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/products"
    )
    datablock_id = create_response.json()["_id"]
    
    # Mark as ready
    response = await client.post(
        f"/api/v1/projects/test-project/datablocks/{datablock_id}/mark-ready"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready_for_deployment"


@pytest.mark.asyncio
async def test_mark_datablock_deployed(client: AsyncClient):
    """Test marking a datablock as deployed."""
    # Create a datablock
    create_response = await client.post(
        "/api/v1/projects/test-project/datablocks/from-template/orders"
    )
    datablock_id = create_response.json()["_id"]
    
    # Mark as deployed
    response = await client.post(
        f"/api/v1/projects/test-project/datablocks/{datablock_id}/mark-deployed"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "deployed"


@pytest.mark.asyncio
async def test_mark_ready_not_found(client: AsyncClient):
    """Test marking a non-existent datablock."""
    response = await client.post(
        "/api/v1/projects/test-project/datablocks/000000000000000000000000/mark-ready"
    )
    
    assert response.status_code == 404


# -----------------------------------------------------------------------------
# Project Isolation Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_datablocks_isolated_by_project(client: AsyncClient):
    """Test that datablocks are isolated between projects."""
    # Create datablock in project A
    await client.post(
        "/api/v1/projects/project-a/datablocks/from-template/users"
    )
    
    # Create datablock in project B
    await client.post(
        "/api/v1/projects/project-b/datablocks/from-template/products"
    )
    
    # List project A - should only see users
    response_a = await client.get("/api/v1/projects/project-a/datablocks")
    data_a = response_a.json()
    assert data_a["total"] == 1
    assert data_a["items"][0]["name"] == "users"
    assert data_a["items"][0]["display_name"] == "Users"
    
    # List project B - should only see products
    response_b = await client.get("/api/v1/projects/project-b/datablocks")
    data_b = response_b.json()
    assert data_b["total"] == 1
    assert data_b["items"][0]["name"] == "products"
    assert data_b["items"][0]["display_name"] == "Products"
