"""
MongoDB client configuration.
"""
from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

# Global MongoDB client
_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo():
    """Connect to MongoDB."""
    global _client, _database
    
    _client = AsyncIOMotorClient(settings.mongodb_url)
    _database = _client[settings.mongodb_db_name]
    
    # Create indexes
    await create_indexes()
    
    print(f"Connected to MongoDB: {settings.mongodb_db_name}")


async def close_mongo_connection():
    """Close MongoDB connection."""
    global _client
    
    if _client:
        _client.close()
        print("Closed MongoDB connection")


async def create_indexes():
    """Create database indexes."""
    db = get_database()
    
    # Pipelines indexes (collection is event_pipelines)
    await db.event_pipelines.create_index("project_id")
    await db.event_pipelines.create_index([("project_id", 1), ("is_active", 1)])
    
    # Features indexes
    await db.features.create_index("project_id")
    await db.features.create_index([("project_id", 1), ("enabled", 1)])
    
    # Deployments indexes
    await db.deployments.create_index([("project_id", 1), ("created_at", -1)])


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance."""
    if _database is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return _database


def get_client() -> AsyncIOMotorClient:
    """Get MongoDB client instance."""
    if _client is None:
        raise RuntimeError("MongoDB client not initialized. Call connect_to_mongo() first.")
    return _client

