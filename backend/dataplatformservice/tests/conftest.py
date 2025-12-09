"""
Pytest configuration and fixtures.
"""

import pytest
from typing import AsyncGenerator

from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.dependencies import get_db
from main import app


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
    
    yield db
    
    # Clean up after each test
    await db.pipelines.delete_many({})
    await db.features.delete_many({})
    await db.deployments.delete_many({})
    await db.datablocks.delete_many({})


@pytest.fixture(scope="function")
async def client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with mocked database."""
    
    # Override the dependency using FastAPI's dependency_overrides
    app.dependency_overrides[get_db] = lambda: test_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    
    # Clear the override
    app.dependency_overrides.clear()
