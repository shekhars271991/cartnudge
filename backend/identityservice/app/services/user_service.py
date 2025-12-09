"""
User service - business logic for user management.
"""
from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import get_password_hash, verify_password
from app.schemas.user import UserUpdate, PasswordChange


class UserService:
    """Service for user management."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_by_id(self, user_id: str) -> dict | None:
        """Get a user by ID."""
        try:
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user["_id"] = str(user["_id"])
                del user["password_hash"]
            return user
        except Exception:
            return None
    
    async def get_by_email(self, email: str) -> dict | None:
        """Get a user by email."""
        user = await self.db.users.find_one({"email": email.lower()})
        if user:
            user["_id"] = str(user["_id"])
        return user
    
    async def update(self, user_id: str, data: UserUpdate) -> dict | None:
        """Update user profile."""
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.db.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_data},
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
            del result["password_hash"]
        
        return result
    
    async def change_password(self, user_id: str, data: PasswordChange) -> bool:
        """Change user password."""
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise ValueError("User not found")
        
        if not verify_password(data.current_password, user["password_hash"]):
            raise ValueError("Current password is incorrect")
        
        await self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_hash": get_password_hash(data.new_password),
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        
        # Revoke all refresh tokens
        await self.db.refresh_tokens.update_many(
            {"user_id": ObjectId(user_id), "revoked_at": None},
            {"$set": {"revoked_at": datetime.utcnow()}}
        )
        
        return True
    
    async def delete(self, user_id: str) -> bool:
        """Delete a user account (soft delete)."""
        result = await self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        
        # Revoke all tokens
        await self.db.refresh_tokens.update_many(
            {"user_id": ObjectId(user_id), "revoked_at": None},
            {"$set": {"revoked_at": datetime.utcnow()}}
        )
        
        return result.modified_count > 0

