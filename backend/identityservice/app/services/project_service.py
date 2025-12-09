"""
Project service - business logic for project management.
"""
from __future__ import annotations

import re
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """Service for project management."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_all_for_user(
        self, user_id: str, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict], int]:
        """Get all projects where user is a member."""
        query = {"members.user_id": ObjectId(user_id), "is_active": True}
        
        # Get total count
        total = await self.db.projects.count_documents(query)
        
        # Get projects
        cursor = self.db.projects.find(query).skip(skip).limit(limit).sort("created_at", -1)
        projects = await cursor.to_list(length=limit)
        
        # Enrich with member info
        for project in projects:
            project["_id"] = str(project["_id"])
            project["created_by"] = str(project["created_by"])
            project["members"] = await self._enrich_members(project.get("members", []))
        
        return projects, total
    
    async def get_by_id(self, project_id: str, user_id: str | None = None) -> dict | None:
        """Get a project by ID. Optionally check user membership."""
        try:
            query = {"_id": ObjectId(project_id), "is_active": True}
            if user_id:
                query["members.user_id"] = ObjectId(user_id)
            
            project = await self.db.projects.find_one(query)
            
            if project:
                project["_id"] = str(project["_id"])
                project["created_by"] = str(project["created_by"])
                project["members"] = await self._enrich_members(project.get("members", []))
            
            return project
        except Exception:
            return None
    
    async def create(self, user_id: str, data: ProjectCreate) -> dict:
        """Create a new project."""
        # Generate slug from name
        slug = await self._generate_unique_slug(data.name)
        
        now = datetime.utcnow()
        user_oid = ObjectId(user_id)
        
        project_doc = {
            "name": data.name,
            "slug": slug,
            "description": data.description,
            "timezone": data.timezone,
            "settings": {},
            "is_active": True,
            "created_by": user_oid,
            "members": [
                {
                    "user_id": user_oid,
                    "role": "owner",
                    "invited_by": None,
                    "joined_at": now,
                }
            ],
            "created_at": now,
            "updated_at": now,
        }
        
        result = await self.db.projects.insert_one(project_doc)
        project_doc["_id"] = str(result.inserted_id)
        project_doc["created_by"] = user_id
        project_doc["members"] = await self._enrich_members(project_doc["members"])
        
        return project_doc
    
    async def update(self, project_id: str, user_id: str, data: ProjectUpdate) -> dict | None:
        """Update a project."""
        # Check permission
        if not await self._has_permission(project_id, user_id, ["owner", "admin"]):
            raise PermissionError("You don't have permission to update this project")
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.db.projects.find_one_and_update(
            {"_id": ObjectId(project_id), "is_active": True},
            {"$set": update_data},
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
            result["created_by"] = str(result["created_by"])
            result["members"] = await self._enrich_members(result.get("members", []))
        
        return result
    
    async def delete(self, project_id: str, user_id: str) -> bool:
        """Delete a project (soft delete). Only owner can delete."""
        if not await self._has_permission(project_id, user_id, ["owner"]):
            raise PermissionError("Only the owner can delete this project")
        
        result = await self.db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        
        return result.modified_count > 0
    
    async def get_user_role(self, project_id: str, user_id: str) -> str | None:
        """Get user's role in a project."""
        project = await self.db.projects.find_one(
            {
                "_id": ObjectId(project_id),
                "members.user_id": ObjectId(user_id),
            },
            {"members.$": 1}
        )
        
        if project and project.get("members"):
            return project["members"][0]["role"]
        return None
    
    async def _has_permission(self, project_id: str, user_id: str, allowed_roles: list[str]) -> bool:
        """Check if user has one of the allowed roles."""
        role = await self.get_user_role(project_id, user_id)
        return role in allowed_roles
    
    async def _generate_unique_slug(self, name: str) -> str:
        """Generate a unique slug from project name."""
        # Convert to lowercase, replace spaces with hyphens, remove special chars
        slug = re.sub(r'[^a-z0-9-]', '', name.lower().replace(' ', '-'))
        slug = re.sub(r'-+', '-', slug).strip('-')
        
        if not slug:
            slug = "project"
        
        # Check uniqueness
        base_slug = slug
        counter = 1
        while await self.db.projects.find_one({"slug": slug}):
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        return slug
    
    async def _enrich_members(self, members: list[dict]) -> list[dict]:
        """Enrich member list with user info."""
        enriched = []
        for member in members:
            user_id = member.get("user_id")
            if user_id:
                user = await self.db.users.find_one(
                    {"_id": user_id if isinstance(user_id, ObjectId) else ObjectId(user_id)},
                    {"email": 1, "name": 1}
                )
                enriched.append({
                    "user_id": str(user_id),
                    "email": user.get("email", "") if user else "",
                    "name": user.get("name", "") if user else "",
                    "role": member.get("role"),
                    "joined_at": member.get("joined_at"),
                })
        return enriched

