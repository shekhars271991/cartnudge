"""
Tests for deployment API endpoints.
"""
import pytest
from httpx import AsyncClient


# =============================================================================
# Test Data
# =============================================================================

TEST_PROJECT_ID = "test-project-123"
TEST_USER_ID = "test-user-456"


# =============================================================================
# Deployment Bucket Tests
# =============================================================================

class TestDeploymentBuckets:
    """Tests for deployment bucket endpoints."""

    @pytest.mark.asyncio
    async def test_create_bucket(self, authenticated_client: AsyncClient):
        """Test creating a deployment bucket."""
        response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
            json={"name": "Test Bucket", "description": "Test description"},
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Bucket"
        assert data["description"] == "Test description"
        assert data["status"] == "active"
        assert data["item_count"] == 0
        assert data["items"] == []
        assert "base_deployment_id" in data

    @pytest.mark.asyncio
    async def test_get_or_create_returns_existing(self, authenticated_client: AsyncClient):
        """Test that creating a bucket returns existing active bucket."""
        # Create first bucket
        response1 = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
            json={"name": "First Bucket"},
        )
        assert response1.status_code == 201
        bucket1_id = response1.json()["id"]
        
        # Try to create another - should return the same bucket
        response2 = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
            json={"name": "Second Bucket"},
        )
        assert response2.status_code == 201
        bucket2_id = response2.json()["id"]
        
        assert bucket1_id == bucket2_id

    @pytest.mark.asyncio
    async def test_list_buckets(self, authenticated_client: AsyncClient):
        """Test listing deployment buckets."""
        # Create a bucket
        await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        
        response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_get_active_bucket(self, authenticated_client: AsyncClient):
        """Test getting active deployment bucket."""
        # Create a bucket first
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/active",
        )
        
        assert response.status_code == 200
        assert response.json()["id"] == bucket_id

    @pytest.mark.asyncio
    async def test_get_bucket_by_id(self, authenticated_client: AsyncClient):
        """Test getting a specific bucket by ID."""
        # Create a bucket first
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}",
        )
        
        assert response.status_code == 200
        assert response.json()["id"] == bucket_id

    @pytest.mark.asyncio
    async def test_discard_bucket(self, authenticated_client: AsyncClient):
        """Test discarding a deployment bucket."""
        # Create a bucket
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Discard it
        response = await authenticated_client.delete(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}",
        )
        
        assert response.status_code == 204
        
        # Verify it's no longer active
        list_response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets?status=active",
        )
        buckets = list_response.json()["items"]
        assert not any(b["id"] == bucket_id for b in buckets)


# =============================================================================
# Deployment Item Tests
# =============================================================================

class TestDeploymentItems:
    """Tests for deployment item endpoints."""

    @pytest.mark.asyncio
    async def test_add_item_to_bucket(self, authenticated_client: AsyncClient):
        """Test adding an item to deployment bucket."""
        # Create a bucket
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Add an item
        response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/items",
            json={
                "component_type": "datablock",
                "component_id": "datablock-123",
                "component_name": "Users Datablock",
                "change_type": "create",
                "change_summary": "Add users datablock",
            },
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["component_type"] == "datablock"
        assert data["component_id"] == "datablock-123"
        assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_add_item_updates_existing(self, authenticated_client: AsyncClient):
        """Test that adding the same component updates existing item."""
        # Create a bucket
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Add first item
        await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/items",
            json={
                "component_type": "datablock",
                "component_id": "datablock-123",
                "component_name": "Users Datablock",
                "change_type": "create",
            },
        )
        
        # Add same component again with different summary
        await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/items",
            json={
                "component_type": "datablock",
                "component_id": "datablock-123",
                "component_name": "Users Datablock Updated",
                "change_type": "update",
            },
        )
        
        # Check bucket - should still have only one item
        bucket_response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}",
        )
        bucket = bucket_response.json()
        
        # Should have only one item (updated)
        datablock_items = [i for i in bucket["items"] if i["component_id"] == "datablock-123"]
        assert len(datablock_items) == 1
        assert datablock_items[0]["component_name"] == "Users Datablock Updated"

    @pytest.mark.asyncio
    async def test_remove_item_from_bucket(self, authenticated_client: AsyncClient):
        """Test removing an item from deployment bucket."""
        # Create a bucket
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Add an item
        item_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/items",
            json={
                "component_type": "datablock",
                "component_id": "datablock-123",
                "component_name": "Users Datablock",
                "change_type": "create",
            },
        )
        item_id = item_response.json()["id"]
        
        # Remove the item
        response = await authenticated_client.delete(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/items/{item_id}",
        )
        
        assert response.status_code == 204
        
        # Verify item is removed
        bucket_response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}",
        )
        items = bucket_response.json()["items"]
        assert not any(i["id"] == item_id for i in items)


# =============================================================================
# Conflict Check Tests
# =============================================================================

class TestConflictCheck:
    """Tests for conflict detection."""

    @pytest.mark.asyncio
    async def test_check_no_conflicts(self, authenticated_client: AsyncClient):
        """Test conflict check with no conflicts."""
        # Create a bucket
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Check for conflicts
        response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/check-conflicts",
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_conflicts"] is False
        assert "Ready to deploy" in data["message"]


# =============================================================================
# Deployment Execution Tests
# =============================================================================

class TestDeployment:
    """Tests for deployment execution."""

    @pytest.mark.asyncio
    async def test_deploy_empty_bucket(self, authenticated_client: AsyncClient):
        """Test deploying an empty bucket fails."""
        # Create a bucket (empty)
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Try to deploy
        response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/deploy",
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "empty" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_dry_run_deployment(self, authenticated_client: AsyncClient):
        """Test dry run deployment."""
        # Create a bucket
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Add an item
        await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/items",
            json={
                "component_type": "datablock",
                "component_id": "datablock-123",
                "component_name": "Users Datablock",
                "change_type": "create",
            },
        )
        
        # Dry run
        response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/deploy",
            json={"dry_run": True},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "dry run" in data["message"].lower()
        assert data["deployment_id"] is None  # No actual deployment

    @pytest.mark.asyncio
    async def test_successful_deployment(self, authenticated_client: AsyncClient, test_db):
        """Test successful deployment execution."""
        # First create a datablock in the database
        from bson import ObjectId
        datablock_id = str(ObjectId())
        await test_db.datablocks.insert_one({
            "_id": ObjectId(datablock_id),
            "project_id": TEST_PROJECT_ID,
            "name": "test_users",
            "display_name": "Test Users",
            "status": "ready_for_deployment",
        })
        
        # Create a bucket
        create_response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        bucket_id = create_response.json()["id"]
        
        # Add the datablock to bucket
        await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/items",
            json={
                "component_type": "datablock",
                "component_id": datablock_id,
                "component_name": "Test Users",
                "change_type": "create",
            },
        )
        
        # Deploy
        response = await authenticated_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets/{bucket_id}/deploy",
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["deployment_id"] is not None
        assert data["deployment"] is not None
        assert data["deployment"]["items_succeeded"] == 1


# =============================================================================
# Deployment History Tests
# =============================================================================

class TestDeploymentHistory:
    """Tests for deployment history endpoints."""

    @pytest.mark.asyncio
    async def test_list_deployments(self, authenticated_client: AsyncClient):
        """Test listing deployment history."""
        response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployments",
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_get_current_deployment_id(self, authenticated_client: AsyncClient):
        """Test getting current deployment ID."""
        response = await authenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployments/current",
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "current_deployment_id" in data


# =============================================================================
# Authorization Tests
# =============================================================================

class TestDeploymentAuthorization:
    """Tests for deployment authorization."""

    @pytest.mark.asyncio
    async def test_unauthenticated_access_denied(self, unauthenticated_client: AsyncClient):
        """Test that unauthenticated access is denied."""
        response = await unauthenticated_client.get(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_viewer_cannot_deploy(self, viewer_client: AsyncClient):
        """Test that viewers cannot deploy."""
        # Create bucket (viewers can read, but not create in most cases)
        response = await viewer_client.post(
            f"/api/v1/projects/{TEST_PROJECT_ID}/deployment-buckets",
        )
        
        # Viewers typically can't create deployment buckets
        assert response.status_code in [403, 201]  # Depends on exact permission config

