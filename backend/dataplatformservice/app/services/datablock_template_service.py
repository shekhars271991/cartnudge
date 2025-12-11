"""
Datablock Template Service - manages predefined datablock templates in MongoDB.

Templates are stored separately from actual datablocks and can be used to quickly
create new datablocks with predefined schemas.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.datablock_template import (
    DatablockTemplateCreate,
    DatablockTemplateUpdate,
    TemplateCategory,
    TemplateStatus,
)


class DatablockTemplateService:
    """Service for managing datablock templates in MongoDB."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.datablock_templates
    
    # -------------------------------------------------------------------------
    # Template CRUD Operations
    # -------------------------------------------------------------------------
    
    async def get_all(
        self,
        category: Optional[TemplateCategory] = None,
        status: Optional[TemplateStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[List[dict], int]:
        """Get all active templates."""
        query = {}
        
        if category:
            query["category"] = category.value
        
        if status:
            query["status"] = status.value
        else:
            # By default, only return active templates
            query["status"] = TemplateStatus.ACTIVE.value
        
        total = await self.collection.count_documents(query)
        
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("display_name", 1)
        templates = await cursor.to_list(length=limit)
        
        for template in templates:
            template["_id"] = str(template["_id"])
        
        return templates, total
    
    async def get_by_id(self, template_id: str) -> Optional[dict]:
        """Get a template by its template_id (not MongoDB _id)."""
        template = await self.collection.find_one({"template_id": template_id})
        if template:
            template["_id"] = str(template["_id"])
        return template
    
    async def get_by_mongo_id(self, mongo_id: str) -> Optional[dict]:
        """Get a template by its MongoDB _id."""
        try:
            template = await self.collection.find_one({"_id": ObjectId(mongo_id)})
            if template:
                template["_id"] = str(template["_id"])
            return template
        except Exception:
            return None
    
    async def create(self, data: DatablockTemplateCreate) -> dict:
        """Create a new template."""
        now = datetime.utcnow()
        
        template_doc = {
            "template_id": data.template_id,
            "name": data.name,
            "display_name": data.display_name,
            "description": data.description,
            "icon": data.icon.value,
            "source_type": data.source_type.value,
            "category": data.category.value,
            "status": TemplateStatus.ACTIVE.value,
            "default_schema": [field.model_dump() for field in data.default_schema],
            "event_topic": data.event_topic,
            "tags": data.tags,
            "usage_count": 0,
            "created_at": now,
            "updated_at": now,
        }
        
        result = await self.collection.insert_one(template_doc)
        template_doc["_id"] = str(result.inserted_id)
        
        return template_doc
    
    async def update(self, template_id: str, data: DatablockTemplateUpdate) -> Optional[dict]:
        """Update a template."""
        update_data = data.model_dump(exclude_unset=True)
        
        # Convert enums to values
        if "icon" in update_data and update_data["icon"]:
            update_data["icon"] = update_data["icon"].value
        if "source_type" in update_data and update_data["source_type"]:
            update_data["source_type"] = update_data["source_type"].value
        if "category" in update_data and update_data["category"]:
            update_data["category"] = update_data["category"].value
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value
        
        # Handle schema fields
        if "default_schema" in update_data and update_data["default_schema"]:
            update_data["default_schema"] = [
                field.model_dump() if hasattr(field, 'model_dump') else field
                for field in update_data["default_schema"]
            ]
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"template_id": template_id},
            {"$set": update_data},
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def delete(self, template_id: str) -> bool:
        """Delete a template (soft delete by setting status to deprecated)."""
        result = await self.collection.update_one(
            {"template_id": template_id},
            {
                "$set": {
                    "status": TemplateStatus.DEPRECATED.value,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        return result.modified_count > 0
    
    async def increment_usage(self, template_id: str) -> None:
        """Increment the usage count when a datablock is created from this template."""
        await self.collection.update_one(
            {"template_id": template_id},
            {
                "$inc": {"usage_count": 1},
                "$set": {"updated_at": datetime.utcnow()},
            }
        )
    
    async def check_exists(self, template_id: str) -> bool:
        """Check if a template with the given ID exists."""
        count = await self.collection.count_documents({"template_id": template_id})
        return count > 0
    
    # -------------------------------------------------------------------------
    # Seeding from JSON file
    # -------------------------------------------------------------------------
    
    async def seed_from_json(self, json_path: Optional[Path] = None) -> int:
        """
        Seed templates from a JSON file.
        Only adds templates that don't already exist (based on template_id).
        Returns the number of templates added.
        """
        if json_path is None:
            # Path: services/ -> app/ -> dataplatformservice/ -> data/templates/datablocks.json
            json_path = Path(__file__).parent.parent.parent / "data" / "templates" / "datablocks.json"
        
        if not json_path.exists():
            return 0
        
        with open(json_path, "r") as f:
            templates_data = json.load(f)
        
        added_count = 0
        now = datetime.utcnow()
        
        for template_data in templates_data:
            # Check if template already exists
            existing = await self.collection.find_one({"template_id": template_data["template_id"]})
            if existing:
                continue
            
            # Map old schema format to new format
            default_schema = []
            for field in template_data.get("default_schema", []):
                default_schema.append({
                    "name": field.get("name"),
                    "type": field.get("type"),
                    "required": field.get("required", False),
                    "description": field.get("description"),
                    "is_primary_key": field.get("is_primary_key", False),
                })
            
            # Determine category based on template_id
            category = TemplateCategory.CUSTOM.value
            if "user" in template_data["template_id"]:
                category = TemplateCategory.USER_DATA.value
            elif "product" in template_data["template_id"]:
                category = TemplateCategory.PRODUCT_DATA.value
            elif "event" in template_data["template_id"] or "view" in template_data["template_id"]:
                category = TemplateCategory.EVENT_DATA.value
            elif "order" in template_data["template_id"] or "cart" in template_data["template_id"]:
                category = TemplateCategory.TRANSACTION_DATA.value
            
            template_doc = {
                "template_id": template_data["template_id"],
                "name": template_data["name"],
                "display_name": template_data["display_name"],
                "description": template_data["description"],
                "icon": template_data["icon"],
                "source_type": template_data["source_type"],
                "category": category,
                "status": TemplateStatus.ACTIVE.value,
                "default_schema": default_schema,
                "event_topic": template_data.get("event_topic"),
                "tags": template_data.get("tags", []),
                "usage_count": 0,
                "created_at": now,
                "updated_at": now,
            }
            
            await self.collection.insert_one(template_doc)
            added_count += 1
        
        return added_count

