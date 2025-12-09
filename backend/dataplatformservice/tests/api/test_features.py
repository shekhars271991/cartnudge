"""
Tests for Feature API endpoints.
"""

import pytest
from httpx import AsyncClient


# Helper to create a pipeline first (required for features)
async def create_test_pipeline(client: AsyncClient, project_id: str = "test-project"):
    """Create a test pipeline and return its ID."""
    response = await client.post(
        f"/api/v1/projects/{project_id}/pipelines",
        json={
            "name": "Test Pipeline",
            "category": "behavioral",
        },
    )
    return response.json()["_id"]


# -----------------------------------------------------------------------------
# Feature CRUD Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_feature(client: AsyncClient):
    """Test creating a feature."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    response = await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "user_purchase_count",
            "description": "Total number of purchases by a user",
            "source_event": "purchase",
            "aggregation": "COUNT",
            "pipeline_id": pipeline_id,
            "time_windows": ["24h", "7d"],
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "user_purchase_count"
    assert data["aggregation"] == "COUNT"
    assert data["enabled"] is True
    assert data["project_id"] == "test-project"


@pytest.mark.asyncio
async def test_create_feature_minimal(client: AsyncClient):
    """Test creating a feature with minimal fields."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    response = await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "simple_feature",
            "source_event": "page_view",
            "aggregation": "COUNT",
            "pipeline_id": pipeline_id,
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "simple_feature"


@pytest.mark.asyncio
async def test_list_features(client: AsyncClient):
    """Test listing features."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    # Create features
    await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "feature_1",
            "source_event": "event1",
            "aggregation": "SUM",
            "pipeline_id": pipeline_id,
            "field": "amount",
        },
    )
    await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "feature_2",
            "source_event": "event2",
            "aggregation": "COUNT",
            "pipeline_id": pipeline_id,
        },
    )
    
    response = await client.get("/api/v1/projects/test-project/features")
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_list_features_pagination(client: AsyncClient):
    """Test pagination when listing features."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    # Create 3 features
    for i in range(3):
        await client.post(
            "/api/v1/projects/test-project/features",
            json={
                "name": f"feature_{i}",
                "source_event": f"event_{i}",
                "aggregation": "COUNT",
                "pipeline_id": pipeline_id,
            },
        )
    
    # Get with limit
    response = await client.get(
        "/api/v1/projects/test-project/features",
        params={"skip": 0, "limit": 2},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_get_feature(client: AsyncClient):
    """Test getting a specific feature."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    # Create a feature
    create_response = await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "cart_total",
            "description": "Total cart value",
            "source_event": "cart_update",
            "aggregation": "SUM",
            "field": "total",
            "pipeline_id": pipeline_id,
        },
    )
    feature_id = create_response.json()["_id"]
    
    # Get the feature
    response = await client.get(
        f"/api/v1/projects/test-project/features/{feature_id}"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["_id"] == feature_id
    assert data["name"] == "cart_total"


@pytest.mark.asyncio
async def test_get_feature_not_found(client: AsyncClient):
    """Test getting a non-existent feature."""
    response = await client.get(
        "/api/v1/projects/test-project/features/000000000000000000000000"
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_feature(client: AsyncClient):
    """Test updating a feature."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    # Create a feature
    create_response = await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "original_name",
            "source_event": "test_event",
            "aggregation": "COUNT",
            "pipeline_id": pipeline_id,
        },
    )
    feature_id = create_response.json()["_id"]
    
    # Update it
    response = await client.put(
        f"/api/v1/projects/test-project/features/{feature_id}",
        json={
            "description": "Updated description",
            "time_windows": ["7d", "30d"],
        },
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"
    assert "7d" in data["time_windows"]


@pytest.mark.asyncio
async def test_update_feature_not_found(client: AsyncClient):
    """Test updating a non-existent feature."""
    response = await client.put(
        "/api/v1/projects/test-project/features/000000000000000000000000",
        json={"description": "test"},
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_feature(client: AsyncClient):
    """Test deleting a feature."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    # Create a feature
    create_response = await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "to_be_deleted",
            "source_event": "test_event",
            "aggregation": "COUNT",
            "pipeline_id": pipeline_id,
        },
    )
    feature_id = create_response.json()["_id"]
    
    # Delete it
    response = await client.delete(
        f"/api/v1/projects/test-project/features/{feature_id}"
    )
    
    assert response.status_code == 204
    
    # Verify it's gone
    get_response = await client.get(
        f"/api/v1/projects/test-project/features/{feature_id}"
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_feature_not_found(client: AsyncClient):
    """Test deleting a non-existent feature."""
    response = await client.delete(
        "/api/v1/projects/test-project/features/000000000000000000000000"
    )
    
    assert response.status_code == 404


# -----------------------------------------------------------------------------
# Enable/Disable Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_enable_feature(client: AsyncClient):
    """Test enabling a feature."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    # Create a feature
    create_response = await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "enable_test",
            "source_event": "test_event",
            "aggregation": "AVG",
            "field": "value",
            "pipeline_id": pipeline_id,
        },
    )
    feature_id = create_response.json()["_id"]
    
    # Disable first
    await client.post(
        f"/api/v1/projects/test-project/features/{feature_id}/disable"
    )
    
    # Then enable
    response = await client.post(
        f"/api/v1/projects/test-project/features/{feature_id}/enable"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["enabled"] is True


@pytest.mark.asyncio
async def test_disable_feature(client: AsyncClient):
    """Test disabling a feature."""
    # Create pipeline first
    pipeline_id = await create_test_pipeline(client)
    
    # Create a feature (enabled by default)
    create_response = await client.post(
        "/api/v1/projects/test-project/features",
        json={
            "name": "disable_test",
            "source_event": "product_view",
            "aggregation": "COUNT",
            "pipeline_id": pipeline_id,
        },
    )
    feature_id = create_response.json()["_id"]
    
    # Disable it
    response = await client.post(
        f"/api/v1/projects/test-project/features/{feature_id}/disable"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["enabled"] is False


@pytest.mark.asyncio
async def test_enable_feature_not_found(client: AsyncClient):
    """Test enabling a non-existent feature."""
    response = await client.post(
        "/api/v1/projects/test-project/features/000000000000000000000000/enable"
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_disable_feature_not_found(client: AsyncClient):
    """Test disabling a non-existent feature."""
    response = await client.post(
        "/api/v1/projects/test-project/features/000000000000000000000000/disable"
    )
    
    assert response.status_code == 404


# -----------------------------------------------------------------------------
# Project Isolation Tests
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_features_isolated_by_project(client: AsyncClient):
    """Test that features are isolated between projects."""
    # Create pipelines for both projects
    pipeline_a = await create_test_pipeline(client, "project-a")
    pipeline_b = await create_test_pipeline(client, "project-b")
    
    # Create feature in project A
    await client.post(
        "/api/v1/projects/project-a/features",
        json={
            "name": "feature_a",
            "source_event": "event_a",
            "aggregation": "COUNT",
            "pipeline_id": pipeline_a,
        },
    )
    
    # Create feature in project B
    await client.post(
        "/api/v1/projects/project-b/features",
        json={
            "name": "feature_b",
            "source_event": "event_b",
            "aggregation": "SUM",
            "field": "amount",
            "pipeline_id": pipeline_b,
        },
    )
    
    # List project A - should only see feature_a
    response_a = await client.get("/api/v1/projects/project-a/features")
    data_a = response_a.json()
    assert data_a["total"] == 1
    assert data_a["items"][0]["name"] == "feature_a"
    
    # List project B - should only see feature_b
    response_b = await client.get("/api/v1/projects/project-b/features")
    data_b = response_b.json()
    assert data_b["total"] == 1
    assert data_b["items"][0]["name"] == "feature_b"
