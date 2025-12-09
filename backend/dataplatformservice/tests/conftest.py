"""
Pytest configuration and fixtures.
"""

import pytest
import asyncio
from typing import AsyncGenerator

from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.dependencies import get_db
from main import app


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_db():
    """Create test database connection."""
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client["dataplatform_test"]
    
    yield db
    
    # Cleanup - drop test database
    await client.drop_database("dataplatform_test")
    client.close()


@pytest.fixture
async def client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client."""
    
    async def override_get_db():
        return test_db
    
    # Override the dependency using FastAPI's dependency_overrides
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    
    # Clear the override
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
async def cleanup_collections(test_db):
    """Clean up collections before each test."""
    await test_db.pipelines.delete_many({})
    await test_db.features.delete_many({})
    await test_db.deployments.delete_many({})
    yield
