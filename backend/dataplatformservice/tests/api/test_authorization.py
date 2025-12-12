"""
Tests for authorization and permission checking.
"""

import pytest
from httpx import AsyncClient


class TestAuthentication:
    """Test authentication requirements."""
    
    @pytest.mark.asyncio
    async def test_unauthenticated_access_denied(self, unauthenticated_client: AsyncClient):
        """Test that unauthenticated requests are rejected."""
        response = await unauthenticated_client.get("/api/v1/projects/test-project/datablocks")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_public_endpoints_accessible(self, unauthenticated_client: AsyncClient):
        """Test that public endpoints (templates) are accessible without auth."""
        response = await unauthenticated_client.get("/api/v1/datablocks/templates")
        assert response.status_code == 200


class TestRoleBasedAccess:
    """Test role-based access control."""
    
    @pytest.mark.asyncio
    async def test_viewer_can_read(self, viewer_client: AsyncClient):
        """Test that VIEWER role can read datablocks."""
        response = await viewer_client.get("/api/v1/projects/test-project/datablocks")
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_viewer_cannot_create(self, viewer_client: AsyncClient):
        """Test that VIEWER role cannot create datablocks."""
        response = await viewer_client.post(
            "/api/v1/projects/test-project/datablocks",
            json={
                "name": "test_datablock",
                "display_name": "Test Datablock",
                "source_type": "event",
                "schema_fields": [],
            },
        )
        assert response.status_code == 403
        assert "permission" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_developer_can_create(self, developer_client: AsyncClient):
        """Test that DEVELOPER role can create datablocks."""
        response = await developer_client.post(
            "/api/v1/projects/test-project/datablocks",
            json={
                "name": "dev_datablock",
                "display_name": "Developer Datablock",
                "source_type": "event",
                "schema_fields": [],
            },
        )
        assert response.status_code == 201
    
    @pytest.mark.asyncio
    async def test_developer_cannot_deploy(self, developer_client: AsyncClient):
        """Test that DEVELOPER role cannot mark datablocks for deployment."""
        # First create a datablock (developer has permission for this)
        create_response = await developer_client.post(
            "/api/v1/projects/test-project/datablocks",
            json={
                "name": "deploy_test",
                "display_name": "Deploy Test",
                "source_type": "event",
                "schema_fields": [],
            },
        )
        assert create_response.status_code == 201
        datablock_id = create_response.json()["_id"]
        
        # Try to mark ready for deployment (should fail)
        response = await developer_client.post(
            f"/api/v1/projects/test-project/datablocks/{datablock_id}/mark-ready"
        )
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_owner_can_deploy(self, client: AsyncClient):
        """Test that OWNER role can mark datablocks for deployment."""
        # Create a datablock
        create_response = await client.post(
            "/api/v1/projects/test-project/datablocks",
            json={
                "name": "owner_deploy_test",
                "display_name": "Owner Deploy Test",
                "source_type": "event",
                "schema_fields": [],
            },
        )
        assert create_response.status_code == 201
        datablock_id = create_response.json()["_id"]
        
        # Mark ready for deployment (should succeed)
        response = await client.post(
            f"/api/v1/projects/test-project/datablocks/{datablock_id}/mark-ready"
        )
        assert response.status_code == 200


class TestPipelineAuthorization:
    """Test pipeline authorization."""
    
    @pytest.mark.asyncio
    async def test_viewer_can_list_pipelines(self, viewer_client: AsyncClient):
        """Test that VIEWER can list pipelines."""
        response = await viewer_client.get("/api/v1/projects/test-project/pipelines")
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_viewer_cannot_create_pipeline(self, viewer_client: AsyncClient):
        """Test that VIEWER cannot create pipelines."""
        response = await viewer_client.post(
            "/api/v1/projects/test-project/pipelines",
            json={
                "name": "Test Pipeline",
                "category": "general",
            },
        )
        assert response.status_code == 403


class TestFeatureAuthorization:
    """Test feature authorization."""
    
    @pytest.mark.asyncio
    async def test_viewer_can_list_features(self, viewer_client: AsyncClient):
        """Test that VIEWER can list features."""
        response = await viewer_client.get("/api/v1/projects/test-project/features")
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_viewer_cannot_create_feature(self, viewer_client: AsyncClient):
        """Test that VIEWER cannot create features."""
        response = await viewer_client.post(
            "/api/v1/projects/test-project/features",
            json={
                "name": "test_feature",
                "pipeline_id": "some-pipeline-id",
                "source_event": "test_event",
                "aggregation": "COUNT",
                "time_windows": ["1h"],
            },
        )
        assert response.status_code == 403

