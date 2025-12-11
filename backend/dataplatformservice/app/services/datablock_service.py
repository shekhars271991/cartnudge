"""
Datablock service - business logic for datablock management with MongoDB.

Datablocks are user-created data schemas that can be:
- Created from scratch (custom)
- Created from a template (from_template=True, template_id set)

Templates are stored in a separate collection (datablock_templates) and managed
by the DatablockTemplateService.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.datablock import (
    DatablockCreate,
    DatablockUpdate,
    DatablockStatus,
    IconType,
)
from app.services.datablock_template_service import DatablockTemplateService


class DatablockService:
    """Service for managing datablocks in MongoDB."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.datablocks
        self.template_service = DatablockTemplateService(db)
    
    # -------------------------------------------------------------------------
    # Datablock CRUD Operations
    # -------------------------------------------------------------------------
    
    async def get_all_for_project(
        self, project_id: str, skip: int = 0, limit: int = 100
    ) -> tuple[List[dict], int]:
        """Get all datablocks for a project."""
        query = {"project_id": project_id}
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get datablocks
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        datablocks = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for datablock in datablocks:
            datablock["_id"] = str(datablock["_id"])
        
        return datablocks, total
    
    async def get_by_id(self, datablock_id: str, project_id: str) -> Optional[dict]:
        """Get a datablock by ID."""
        try:
            datablock = await self.collection.find_one({
                "_id": ObjectId(datablock_id),
                "project_id": project_id,
            })
            if datablock:
                datablock["_id"] = str(datablock["_id"])
            return datablock
        except Exception:
            return None
    
    async def create(self, project_id: str, data: DatablockCreate) -> dict:
        """Create a new custom datablock."""
        now = datetime.utcnow()
        
        # Generate unique IDs for schema fields
        schema_fields = []
        for field in data.schema_fields:
            field_dict = field.model_dump()
            field_dict["id"] = str(uuid.uuid4())[:8]
            schema_fields.append(field_dict)
        
        datablock_doc = {
            "project_id": project_id,
            "name": data.name,
            "display_name": data.display_name,
            "description": data.description,
            "icon": data.icon.value if data.icon else IconType.DATABASE.value,
            "source_type": data.source_type.value,
            "status": DatablockStatus.NOT_CONFIGURED.value,
            "from_template": False,  # Custom datablock, not from template
            "template_id": None,
            "schema_fields": schema_fields,
            "record_count": 0,
            "last_sync": None,
            "event_topic": data.event_topic,
            "api_endpoint": data.api_endpoint,
            "created_at": now,
            "updated_at": now,
        }
        
        result = await self.collection.insert_one(datablock_doc)
        datablock_doc["_id"] = str(result.inserted_id)
        
        return datablock_doc
    
    async def create_from_template(
        self, project_id: str, template_id: str, overrides: Optional[dict] = None
    ) -> Optional[dict]:
        """Create a datablock from a template."""
        # Get template from the templates collection
        template = await self.template_service.get_by_id(template_id)
        if not template:
            return None
        
        now = datetime.utcnow()
        
        # Generate unique IDs for schema fields
        schema_fields = []
        for field in template["default_schema"]:
            field_copy = field.copy()
            field_copy["id"] = str(uuid.uuid4())[:8]
            schema_fields.append(field_copy)
        
        datablock_doc = {
            "project_id": project_id,
            "name": template["name"],
            "display_name": template["display_name"],
            "description": template["description"],
            "icon": template["icon"],
            "source_type": template["source_type"],
            "status": DatablockStatus.NOT_CONFIGURED.value,
            "from_template": True,  # Created from a template
            "template_id": template_id,
            "schema_fields": schema_fields,
            "record_count": 0,
            "last_sync": None,
            "event_topic": template.get("event_topic"),
            "api_endpoint": None,
            "created_at": now,
            "updated_at": now,
        }
        
        # Apply overrides if provided
        if overrides:
            for key, value in overrides.items():
                if key in datablock_doc and key not in ["_id", "project_id", "created_at"]:
                    datablock_doc[key] = value
        
        result = await self.collection.insert_one(datablock_doc)
        datablock_doc["_id"] = str(result.inserted_id)
        
        # Increment template usage count
        await self.template_service.increment_usage(template_id)
        
        return datablock_doc
    
    async def update(
        self, datablock_id: str, project_id: str, data: DatablockUpdate
    ) -> Optional[dict]:
        """Update a datablock."""
        update_data = data.model_dump(exclude_unset=True)
        
        # Convert enums to values
        if "icon" in update_data and update_data["icon"]:
            update_data["icon"] = update_data["icon"].value
        if "source_type" in update_data and update_data["source_type"]:
            update_data["source_type"] = update_data["source_type"].value
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value
        
        # Handle schema_fields
        if "schema_fields" in update_data and update_data["schema_fields"]:
            schema_fields = []
            for field in update_data["schema_fields"]:
                field_dict = field.model_dump() if hasattr(field, 'model_dump') else field
                if "id" not in field_dict or not field_dict["id"]:
                    field_dict["id"] = str(uuid.uuid4())[:8]
                schema_fields.append(field_dict)
            update_data["schema_fields"] = schema_fields
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(datablock_id), "project_id": project_id},
            {"$set": update_data},
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def delete(self, datablock_id: str, project_id: str) -> bool:
        """Delete a datablock."""
        result = await self.collection.delete_one({
            "_id": ObjectId(datablock_id),
            "project_id": project_id,
        })
        return result.deleted_count > 0
    
    async def mark_ready_for_deployment(
        self, datablock_id: str, project_id: str
    ) -> Optional[dict]:
        """Mark a datablock as ready for deployment."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(datablock_id), "project_id": project_id},
            {
                "$set": {
                    "status": DatablockStatus.READY_FOR_DEPLOYMENT.value,
                    "updated_at": datetime.utcnow(),
                }
            },
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def mark_deployed(self, datablock_id: str, project_id: str) -> Optional[dict]:
        """Mark a datablock as deployed."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(datablock_id), "project_id": project_id},
            {
                "$set": {
                    "status": DatablockStatus.DEPLOYED.value,
                    "updated_at": datetime.utcnow(),
                }
            },
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def check_exists_by_name(self, project_id: str, name: str) -> bool:
        """Check if a datablock with the given name exists in the project."""
        count = await self.collection.count_documents({
            "project_id": project_id,
            "name": name,
        })
        return count > 0
