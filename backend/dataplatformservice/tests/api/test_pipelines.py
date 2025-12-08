"""
Tests for Pipeline API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_pipeline(client: AsyncClient):
    """Test creating a pipeline."""
    response = await client.post(
        "/api/v1/projects/test-project/pipelines",
        json={
            "name": "Cart Events",
            "description": "Track cart behavior",
            "category": "behavioral",
            "events": [
                {
                    "name": "add_to_cart",
                    "description": "Item added to cart",
                    "enabled": True,
                    "fields": [
                        {"name": "user_id", "type": "string", "required": True},
                        {"name": "product_id", "type": "string", "required": True},
                        {"name": "quantity", "type": "number", "required": True},
                    ],
                }
            ],
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cart Events"
    assert data["category"] == "behavioral"
    assert data["status"] == "configuring"
    assert len(data["events"]) == 1
    assert data["events"][0]["name"] == "add_to_cart"


@pytest.mark.asyncio
async def test_list_pipelines(client: AsyncClient):
    """Test listing pipelines."""
    # Create a pipeline first
    await client.post(
        "/api/v1/projects/test-project/pipelines",
        json={
            "name": "Pipeline 1",
            "category": "behavioral",
        },
    )
    
    response = await client.get("/api/v1/projects/test-project/pipelines")
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_pipeline_not_found(client: AsyncClient):
    """Test getting non-existent pipeline."""
    response = await client.get(
        "/api/v1/projects/test-project/pipelines/000000000000000000000000"
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_activate_pipeline(client: AsyncClient):
    """Test activating a pipeline."""
    # Create pipeline
    create_response = await client.post(
        "/api/v1/projects/test-project/pipelines",
        json={
            "name": "Test Pipeline",
            "category": "behavioral",
        },
    )
    pipeline_id = create_response.json()["_id"]
    
    # Activate
    response = await client.post(
        f"/api/v1/projects/test-project/pipelines/{pipeline_id}/activate"
    )
    
    assert response.status_code == 200
    assert response.json()["status"] == "active"

