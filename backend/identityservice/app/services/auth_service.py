"""
Authentication service - business logic for auth operations.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    verify_token_hash,
    generate_password_reset_token,
)
from app.schemas.auth import RegisterRequest, LoginRequest


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def register(self, data: RegisterRequest) -> dict:
        """Register a new user."""
        # Check if email already exists
        existing = await self.db.users.find_one({"email": data.email.lower()})
        if existing:
            raise ValueError("Email already registered")
        
        now = datetime.utcnow()
        user_doc = {
            "email": data.email.lower(),
            "password_hash": get_password_hash(data.password),
            "name": data.name,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
        }
        
        result = await self.db.users.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)
        del user_doc["password_hash"]
        
        return user_doc
    
    async def login(self, data: LoginRequest) -> dict:
        """Authenticate user and return tokens."""
        user = await self.db.users.find_one({"email": data.email.lower()})
        
        if not user:
            raise ValueError("Invalid email or password")
        
        if not user.get("is_active"):
            raise ValueError("Account is inactive")
        
        if not verify_password(data.password, user["password_hash"]):
            raise ValueError("Invalid email or password")
        
        # Update last login
        await self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login_at": datetime.utcnow()}}
        )
        
        user_id = str(user["_id"])
        
        # Create tokens
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})
        
        # Store refresh token
        await self._store_refresh_token(user_id, refresh_token)
        
        # Prepare user response
        user_response = {
            "_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "is_active": user["is_active"],
            "created_at": user["created_at"],
            "updated_at": user["updated_at"],
            "last_login_at": datetime.utcnow(),
        }
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user_response,
        }
    
    async def logout(self, refresh_token: str) -> None:
        """Revoke a refresh token."""
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")
        
        # Mark token as revoked
        await self.db.refresh_tokens.update_many(
            {"user_id": ObjectId(payload["sub"]), "revoked_at": None},
            {"$set": {"revoked_at": datetime.utcnow()}}
        )
    
    async def refresh_access_token(self, refresh_token: str) -> str:
        """Refresh an access token."""
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")
        
        user_id = payload.get("sub")
        
        # Check if token is in our database and not revoked
        stored = await self.db.refresh_tokens.find_one({
            "user_id": ObjectId(user_id),
            "revoked_at": None,
        })
        
        if not stored:
            raise ValueError("Token has been revoked")
        
        # Verify the token hash
        if not verify_token_hash(refresh_token, stored["token_hash"]):
            raise ValueError("Invalid refresh token")
        
        # Check if user still exists and is active
        user = await self.db.users.find_one({
            "_id": ObjectId(user_id),
            "is_active": True,
        })
        
        if not user:
            raise ValueError("User not found or inactive")
        
        # Create new access token
        return create_access_token({"sub": user_id})
    
    async def request_password_reset(self, email: str) -> str | None:
        """Request a password reset token."""
        user = await self.db.users.find_one({"email": email.lower()})
        
        if not user:
            # Don't reveal if email exists
            return None
        
        token = generate_password_reset_token()
        expires_at = datetime.utcnow() + timedelta(hours=settings.password_reset_token_expire_hours)
        
        # Store the reset token (hashed)
        await self.db.password_resets.update_one(
            {"user_id": user["_id"]},
            {
                "$set": {
                    "token_hash": hash_token(token),
                    "expires_at": expires_at,
                    "created_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )
        
        return token
    
    async def reset_password(self, token: str, new_password: str) -> None:
        """Reset password using a token."""
        # Find the reset request
        reset = await self.db.password_resets.find_one({
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not reset or not verify_token_hash(token, reset["token_hash"]):
            raise ValueError("Invalid or expired reset token")
        
        # Update password
        await self.db.users.update_one(
            {"_id": reset["user_id"]},
            {
                "$set": {
                    "password_hash": get_password_hash(new_password),
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        
        # Delete the reset token
        await self.db.password_resets.delete_one({"_id": reset["_id"]})
        
        # Revoke all refresh tokens for this user
        await self.db.refresh_tokens.update_many(
            {"user_id": reset["user_id"], "revoked_at": None},
            {"$set": {"revoked_at": datetime.utcnow()}}
        )
    
    async def _store_refresh_token(
        self, user_id: str, token: str, device_info: dict | None = None
    ) -> None:
        """Store a refresh token in the database."""
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
        
        await self.db.refresh_tokens.insert_one({
            "user_id": ObjectId(user_id),
            "token_hash": hash_token(token),
            "device_info": device_info,
            "expires_at": expires_at,
            "revoked_at": None,
            "created_at": datetime.utcnow(),
        })

