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
    
    # Users indexes
    await db.users.create_index("email", unique=True)
    
    # Projects indexes
    await db.projects.create_index("slug", unique=True)
    await db.projects.create_index("created_by")
    await db.projects.create_index("members.user_id")
    
    # API Keys indexes
    await db.api_keys.create_index("project_id")
    await db.api_keys.create_index("key_prefix")
    
    # Refresh Tokens indexes
    await db.refresh_tokens.create_index("user_id")
    await db.refresh_tokens.create_index("token_hash")
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    
    # Invitations indexes
    await db.invitations.create_index("project_id")
    await db.invitations.create_index("email")
    await db.invitations.create_index("token", unique=True)
    await db.invitations.create_index("expires_at", expireAfterSeconds=0)


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

