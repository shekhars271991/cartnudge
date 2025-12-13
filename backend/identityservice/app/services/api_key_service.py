"""
API Key service - business logic for API key management.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import generate_api_key, hash_token, verify_token_hash
from app.schemas.api_key import ApiKeyCreate


class ApiKeyService:
    """Service for API key management."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_all_for_project(
        self, project_id: str, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict], int]:
        """Get all API keys for a project."""
        query = {"project_id": ObjectId(project_id), "is_active": True}
        
        # Get total count
        total = await self.db.api_keys.count_documents(query)
        
        # Get keys (without the hash)
        cursor = self.db.api_keys.find(
            query,
            {"key_hash": 0}  # Exclude the hash from results
        ).skip(skip).limit(limit).sort("created_at", -1)
        
        keys = await cursor.to_list(length=limit)
        
        for key in keys:
            key["_id"] = str(key["_id"])
            key["project_id"] = str(key["project_id"])
            key["created_by"] = str(key["created_by"])
        
        return keys, total
    
    async def create(
        self, project_id: str, user_id: str, data: ApiKeyCreate
    ) -> tuple[dict, str]:
        """Create a new API key. Returns (key_doc, full_key)."""
        # Check permission
        if not await self._has_permission(project_id, user_id, ["owner", "admin"]):
            raise PermissionError("You don't have permission to create API keys")
        
        # Generate key with project_id embedded
        full_key, prefix = generate_api_key(project_id)
        
        now = datetime.utcnow()
        expires_at = None
        if data.expires_in_days:
            expires_at = now + timedelta(days=data.expires_in_days)
        
        key_doc = {
            "project_id": ObjectId(project_id),
            "name": data.name,
            "key_prefix": prefix,
            "key_hash": hash_token(full_key),
            "scopes": data.scopes,
            "last_used_at": None,
            "expires_at": expires_at,
            "is_active": True,
            "created_by": ObjectId(user_id),
            "created_at": now,
        }
        
        result = await self.db.api_keys.insert_one(key_doc)
        
        # Prepare response (without hash)
        response = {
            "_id": str(result.inserted_id),
            "project_id": project_id,
            "name": data.name,
            "key": full_key,  # Only returned once!
            "key_prefix": prefix,
            "scopes": data.scopes,
            "expires_at": expires_at,
            "created_at": now,
        }
        
        return response, full_key
    
    async def revoke(self, project_id: str, user_id: str, key_id: str) -> bool:
        """Revoke an API key."""
        # Check permission
        if not await self._has_permission(project_id, user_id, ["owner", "admin"]):
            raise PermissionError("You don't have permission to revoke API keys")
        
        result = await self.db.api_keys.update_one(
            {
                "_id": ObjectId(key_id),
                "project_id": ObjectId(project_id),
            },
            {"$set": {"is_active": False}}
        )
        
        return result.modified_count > 0
    
    async def validate(self, api_key: str) -> dict | None:
        """Validate an API key and return its info if valid."""
        # Support both old (cn_) and new (proj_) formats
        if api_key.startswith("proj_"):
            # New format: proj_{project_id}_{secret}
            parts = api_key.split("_", 2)
            if len(parts) < 3:
                return None
            project_id = parts[1]
            prefix = f"proj_{project_id[:8]}"
        elif api_key.startswith("cn_"):
            # Legacy format
            prefix = api_key[:11]
        else:
            return None
        
        # Find key by prefix
        key_doc = await self.db.api_keys.find_one({
            "key_prefix": prefix,
            "is_active": True,
        })
        
        if not key_doc:
            return None
        
        # Check expiration
        if key_doc.get("expires_at") and key_doc["expires_at"] < datetime.utcnow():
            return None
        
        # Verify the full key
        if not verify_token_hash(api_key, key_doc["key_hash"]):
            return None
        
        # Update last used
        await self.db.api_keys.update_one(
            {"_id": key_doc["_id"]},
            {"$set": {"last_used_at": datetime.utcnow()}}
        )
        
        return {
            "project_id": str(key_doc["project_id"]),
            "scopes": key_doc.get("scopes", []),
        }
    
    async def _has_permission(self, project_id: str, user_id: str, allowed_roles: list[str]) -> bool:
        """Check if user has one of the allowed roles."""
        project = await self.db.projects.find_one(
            {
                "_id": ObjectId(project_id),
                "members.user_id": ObjectId(user_id),
            },
            {"members.$": 1}
        )
        
        if project and project.get("members"):
            return project["members"][0]["role"] in allowed_roles
        return False

