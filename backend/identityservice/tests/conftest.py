"""
Pytest configuration and fixtures.
"""

from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


@pytest_asyncio.fixture
async def test_db():
    """Create test database connection (function-scoped to avoid event loop issues)."""
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client["identity_test"]
    
    # Clean up collections before test
    await db.users.delete_many({})
    await db.projects.delete_many({})
    await db.api_keys.delete_many({})
    await db.refresh_tokens.delete_many({})
    await db.invitations.delete_many({})
    await db.password_resets.delete_many({})
    
    yield db
    
    # Cleanup after test
    await db.users.delete_many({})
    await db.projects.delete_many({})
    await db.api_keys.delete_many({})
    await db.refresh_tokens.delete_many({})
    await db.invitations.delete_many({})
    await db.password_resets.delete_many({})
    client.close()


@pytest_asyncio.fixture
async def client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with mocked database."""
    from main import app
    from app.db import mongodb
    
    # Override the database
    original_db = mongodb._database
    mongodb._database = test_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    
    # Restore original
    mongodb._database = original_db


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient) -> dict:
    """Create a registered user and return user data."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "testuser@example.com",
            "password": "password123",
            "name": "Test User",
        },
    )
    assert response.status_code == 201
    return response.json()


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, registered_user: dict) -> dict:
    """Login and return auth headers."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    return {"Authorization": f"Bearer {data['access_token']}"}


@pytest_asyncio.fixture
async def project(client: AsyncClient, auth_headers: dict) -> dict:
    """Create a project and return project data."""
    response = await client.post(
        "/api/v1/projects",
        headers=auth_headers,
        json={
            "name": "Test Project",
            "description": "A test project",
            "timezone": "UTC",
        },
    )
    assert response.status_code == 201
    return response.json()
