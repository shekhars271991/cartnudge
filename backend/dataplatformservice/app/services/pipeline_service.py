"""
Pipeline service - business logic for event pipeline management with MongoDB.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    EventTypeConfigCreate,
    EventTypeConfigUpdate,
)


class PipelineService:
    """Service for managing event pipelines in MongoDB."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.event_pipelines  # Renamed collection for clarity
    
    async def get_all_for_project(
        self, project_id: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Dict[str, Any]], int]:
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
    
    async def get_by_id(self, pipeline_id: str, project_id: str) -> Optional[Dict[str, Any]]:
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
    
    async def get_by_topic(self, topic_id: str, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a pipeline by topic ID for a project."""
        pipeline = await self.collection.find_one({
            "topic_id": topic_id,
            "project_id": project_id,
        })
        if pipeline:
            pipeline["_id"] = str(pipeline["_id"])
        return pipeline
    
    async def create(self, project_id: str, data: PipelineCreate) -> Dict[str, Any]:
        """Create a new event pipeline."""
        now = datetime.utcnow()
        
        pipeline_doc = {
            "project_id": project_id,
            "name": data.name,
            "display_name": data.display_name,
            "description": data.description,
            "topic_id": data.topic_id,
            "event_configs": [
                {
                    "event_type": ec.event_type,
                    "display_name": ec.display_name,
                    "description": ec.description,
                    "fields": [field.model_dump() for field in ec.fields],
                }
                for ec in data.event_configs
            ],
            "is_active": False,
            "events_count": 0,
            "last_event_at": None,
            "created_at": now,
            "updated_at": now,
        }
        
        result = await self.collection.insert_one(pipeline_doc)
        pipeline_doc["_id"] = str(result.inserted_id)
        
        return pipeline_doc
    
    async def update(
        self, pipeline_id: str, project_id: str, data: PipelineUpdate
    ) -> Optional[Dict[str, Any]]:
        """Update a pipeline."""
        update_data = data.model_dump(exclude_unset=True)
        
        # Handle event_configs separately
        if "event_configs" in update_data and update_data["event_configs"] is not None:
            update_data["event_configs"] = [
                {
                    "event_type": ec["event_type"],
                    "display_name": ec["display_name"],
                    "description": ec.get("description"),
                    "fields": ec.get("fields", []),
                }
                for ec in update_data["event_configs"]
            ]
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER,
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
    
    async def set_active(
        self, pipeline_id: str, project_id: str, is_active: bool
    ) -> Optional[Dict[str, Any]]:
        """Set pipeline active status."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {"$set": {"is_active": is_active, "updated_at": datetime.utcnow()}},
            return_document=ReturnDocument.AFTER,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def increment_events_count(
        self, pipeline_id: str, project_id: str, count: int = 1
    ) -> Optional[Dict[str, Any]]:
        """Increment the events count for a pipeline."""
        now = datetime.utcnow()
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {
                "$inc": {"events_count": count},
                "$set": {"last_event_at": now, "updated_at": now},
            },
            return_document=ReturnDocument.AFTER,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    # -------------------------------------------------------------------------
    # Event Type Config Operations
    # -------------------------------------------------------------------------
    
    async def add_event_config(
        self, pipeline_id: str, project_id: str, data: EventTypeConfigCreate
    ) -> Optional[Dict[str, Any]]:
        """Add an event type configuration to a pipeline."""
        event_config_doc = {
            "event_type": data.event_type,
            "display_name": data.display_name,
            "description": data.description,
            "fields": [field.model_dump() for field in data.fields],
        }
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {
                "$push": {"event_configs": event_config_doc},
                "$set": {"updated_at": datetime.utcnow()},
            },
            return_document=ReturnDocument.AFTER,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def update_event_config(
        self,
        pipeline_id: str,
        project_id: str,
        event_type: str,
        data: EventTypeConfigUpdate,
    ) -> Optional[Dict[str, Any]]:
        """Update an event type configuration in a pipeline."""
        update_fields = {}
        update_data = data.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            if key == "fields" and value is not None:
                update_fields[f"event_configs.$.{key}"] = value
            else:
                update_fields[f"event_configs.$.{key}"] = value
        
        update_fields["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {
                "_id": ObjectId(pipeline_id),
                "project_id": project_id,
                "event_configs.event_type": event_type,
            },
            {"$set": update_fields},
            return_document=ReturnDocument.AFTER,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def delete_event_config(
        self, pipeline_id: str, project_id: str, event_type: str
    ) -> Optional[Dict[str, Any]]:
        """Delete an event type configuration from a pipeline."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(pipeline_id), "project_id": project_id},
            {
                "$pull": {"event_configs": {"event_type": event_type}},
                "$set": {"updated_at": datetime.utcnow()},
            },
            return_document=ReturnDocument.AFTER,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    # -------------------------------------------------------------------------
    # Validation
    # -------------------------------------------------------------------------
    
    async def validate_event_type(
        self, pipeline_id: str, project_id: str, event_type: str
    ) -> bool:
        """Check if an event type is configured in a pipeline."""
        pipeline = await self.collection.find_one(
            {
                "_id": ObjectId(pipeline_id),
                "project_id": project_id,
                "event_configs.event_type": event_type,
            },
            {"_id": 1},
        )
        return pipeline is not None
    
    async def get_event_config(
        self, pipeline_id: str, project_id: str, event_type: str
    ) -> Optional[Dict[str, Any]]:
        """Get a specific event type configuration from a pipeline."""
        pipeline = await self.collection.find_one(
            {
                "_id": ObjectId(pipeline_id),
                "project_id": project_id,
            },
            {"event_configs": {"$elemMatch": {"event_type": event_type}}},
        )
        
        if pipeline and pipeline.get("event_configs"):
            return pipeline["event_configs"][0]
        return None
