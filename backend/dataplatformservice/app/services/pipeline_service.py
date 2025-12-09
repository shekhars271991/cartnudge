"""
Pipeline service - business logic for pipeline management with MongoDB.
"""
from __future__ import annotations

import secrets
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    EventCreate,
    EventUpdate,
    PipelineStatus,
)


class PipelineService:
    """Service for managing pipelines in MongoDB."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.pipelines
    
    async def get_all_for_project(
        self, project_id: str, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict], int]:
        """Get all pipelines for a project."""
        query = {"project_id": project_id}
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get pipelines
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        pipelines = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for pipeline in pipelines:
            pipeline["_id"] = str(pipeline["_id"])
        
        return pipelines, total
    
    async def get_by_id(self, pipeline_id: str, project_id: str) -> dict | None:
        """Get a pipeline by ID."""
        try:
            pipeline = await self.collection.find_one({
                "_id": ObjectId(pipeline_id),
                "project_id": project_id,
            })
            if pipeline:
                pipeline["_id"] = str(pipeline["_id"])
            return pipeline
        except Exception:
            return None
    
    async def create(self, project_id: str, data: PipelineCreate) -> dict:
        """Create a new pipeline."""
        now = datetime.utcnow()
        
        pipeline_doc = {
            "project_id": project_id,
            "name": data.name,
            "description": data.description,
            "category": data.category.value,
            "status": PipelineStatus.CONFIGURING.value,
            "webhook_secret": secrets.token_hex(32),
            "events": [
                {
                    "name": event.name,
                    "description": event.description,
                    "enabled": event.enabled,
                    "fields": [field.model_dump() for field in event.fields],
                }
                for event in data.events
            ],
            "created_at": now,
            "updated_at": now,
        }
        
        result = await self.collection.insert_one(pipeline_doc)
        pipeline_doc["_id"] = str(result.inserted_id)
        
        return pipeline_doc
    
    async def update(self, pipeline_id: str, project_id: str, data: PipelineUpdate) -> dict | None:
        """Update a pipeline."""
        update_data = data.model_dump(exclude_unset=True)
        
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {"$set": update_data},
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def delete(self, pipeline_id: str, project_id: str) -> bool:
        """Delete a pipeline."""
        result = await self.collection.delete_one({
            "_id": ObjectId(pipeline_id),
            "project_id": project_id,
        })
        return result.deleted_count > 0
    
    async def activate(self, pipeline_id: str, project_id: str) -> dict | None:
        """Activate a pipeline."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {"$set": {"status": PipelineStatus.ACTIVE.value, "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def deactivate(self, pipeline_id: str, project_id: str) -> dict | None:
        """Deactivate a pipeline."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {"$set": {"status": PipelineStatus.INACTIVE.value, "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def rotate_webhook_secret(self, pipeline_id: str, project_id: str) -> str | None:
        """Generate a new webhook secret."""
        new_secret = secrets.token_hex(32)
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {"$set": {"webhook_secret": new_secret, "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        
        return new_secret if result else None
    
    async def get_webhook_secret(self, pipeline_id: str, project_id: str) -> str | None:
        """Get webhook secret for a pipeline."""
        pipeline = await self.collection.find_one(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {"webhook_secret": 1},
        )
        return pipeline.get("webhook_secret") if pipeline else None
    
    # -------------------------------------------------------------------------
    # Event Operations (nested in pipeline document)
    # -------------------------------------------------------------------------
    
    async def add_event(self, pipeline_id: str, project_id: str, data: EventCreate) -> dict | None:
        """Add an event to a pipeline."""
        event_doc = {
            "name": data.name,
            "description": data.description,
            "enabled": data.enabled,
            "fields": [field.model_dump() for field in data.fields],
        }
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {
                "$push": {"events": event_doc},
                "$set": {"updated_at": datetime.utcnow()},
            },
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def update_event(
        self, pipeline_id: str, project_id: str, event_name: str, data: EventUpdate
    ) -> dict | None:
        """Update an event in a pipeline."""
        update_fields = {}
        update_data = data.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            if key == "fields" and value is not None:
                update_fields[f"events.$.{key}"] = [f.model_dump() if hasattr(f, 'model_dump') else f for f in value]
            else:
                update_fields[f"events.$.{key}"] = value
        
        update_fields["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {
                "_id": ObjectId(pipeline_id),
                "project_id": project_id,
                "events.name": event_name,
            },
            {"$set": update_fields},
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def delete_event(self, pipeline_id: str, project_id: str, event_name: str) -> dict | None:
        """Delete an event from a pipeline."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {
                "$pull": {"events": {"name": event_name}},
                "$set": {"updated_at": datetime.utcnow()},
            },
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
