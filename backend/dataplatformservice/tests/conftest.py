"""
Pytest configuration and fixtures.
"""

import pytest
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.dependencies import get_db
from app.core.auth import (
    AuthenticatedUser,
    Role,
    get_authenticated_user,
    get_project_membership,
)
from main import app


# -----------------------------------------------------------------------------
# Mock user for tests
# -----------------------------------------------------------------------------

def create_mock_user(
    user_id: str = "test-user-123",
    email: str = "test@example.com",
    role: Role = Role.OWNER,
) -> AuthenticatedUser:
    """Create a mock authenticated user for testing."""
    user = AuthenticatedUser(user_id=user_id, email=email)
    # Pre-set project context with owner role (full permissions)
    user._project_role = role
    user._project_id = "test-project"
    return user


async def mock_get_authenticated_user() -> AuthenticatedUser:
    """Mock authentication - returns a test user."""
    return create_mock_user()


async def mock_get_project_membership(project_id: str, user_id: str) -> Role:
    """Mock project membership - always returns OWNER role."""
    return Role.OWNER


# -----------------------------------------------------------------------------
# Database fixtures
# -----------------------------------------------------------------------------

@pytest.fixture(scope="function")
async def mongo_client():
    """Create a MongoDB client for tests."""
    client = AsyncIOMotorClient(settings.mongodb_url)
    yield client
    client.close()


@pytest.fixture(scope="function")
async def test_db(mongo_client: AsyncIOMotorClient):
    """Create test database connection and clean up."""
    db = mongo_client["dataplatform_test"]
    
    # Clean up before each test
    await db.pipelines.delete_many({})
    await db.features.delete_many({})
    await db.deployments.delete_many({})
    await db.datablocks.delete_many({})
    await db.datablock_templates.delete_many({})
    await db.deployment_buckets.delete_many({})
    
    # Seed templates for tests
    from app.services.datablock_template_service import DatablockTemplateService
    template_service = DatablockTemplateService(db)
    await template_service.seed_from_json()
    
    yield db
    
    # Clean up after each test
    await db.pipelines.delete_many({})
    await db.features.delete_many({})
    await db.deployments.delete_many({})
    await db.datablocks.delete_many({})
    await db.datablock_templates.delete_many({})
    await db.deployment_buckets.delete_many({})


@pytest.fixture(scope="function")
async def client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with mocked database and authentication."""
    
    # Override database dependency
    app.dependency_overrides[get_db] = lambda: test_db
    
    # Override authentication - always return a test user with full permissions
    app.dependency_overrides[get_authenticated_user] = mock_get_authenticated_user
    
    # Mock the project membership check to always return OWNER role
    with patch(
        "app.core.auth.get_project_membership",
        new=AsyncMock(return_value=Role.OWNER)
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client
    
    # Clear all overrides
    app.dependency_overrides.clear()


# Alias for backwards compatibility with some tests
@pytest.fixture(scope="function")
async def authenticated_client(client: AsyncClient) -> AsyncClient:
    """Alias for client fixture - authenticated user with full permissions."""
    return client


# -----------------------------------------------------------------------------
# Fixtures for testing different permission levels
# -----------------------------------------------------------------------------

@pytest.fixture(scope="function")
async def viewer_client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with VIEWER role (read-only permissions)."""
    
    async def mock_viewer_user() -> AuthenticatedUser:
        return create_mock_user(role=Role.VIEWER)
    
    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_authenticated_user] = mock_viewer_user
    
    with patch(
        "app.core.auth.get_project_membership",
        new=AsyncMock(return_value=Role.VIEWER)
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def developer_client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with DEVELOPER role."""
    
    async def mock_developer_user() -> AuthenticatedUser:
        return create_mock_user(role=Role.DEVELOPER)
    
    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_authenticated_user] = mock_developer_user
    
    with patch(
        "app.core.auth.get_project_membership",
        new=AsyncMock(return_value=Role.DEVELOPER)
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def unauthenticated_client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client without authentication (should fail protected routes)."""
    
    # Only override database, not authentication
    app.dependency_overrides[get_db] = lambda: test_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    
    app.dependency_overrides.clear()
