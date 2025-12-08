"""
Feature service - business logic for feature management with MongoDB.
"""

from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.feature import FeatureCreate, FeatureUpdate


class FeatureService:
    """Service for managing features in MongoDB."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.features
    
    async def get_all_for_project(
        self, project_id: str, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict], int]:
        """Get all features for a project."""
        query = {"project_id": project_id}
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get features
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        features = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for feature in features:
            feature["_id"] = str(feature["_id"])
        
        return features, total
    
    async def get_by_id(self, feature_id: str, project_id: str) -> dict | None:
        """Get a feature by ID."""
        try:
            feature = await self.collection.find_one({
                "_id": ObjectId(feature_id),
                "project_id": project_id,
            })
            if feature:
                feature["_id"] = str(feature["_id"])
            return feature
        except Exception:
            return None
    
    async def create(self, project_id: str, data: FeatureCreate) -> dict:
        """Create a new feature."""
        now = datetime.utcnow()
        
        feature_doc = {
            "project_id": project_id,
            "pipeline_id": data.pipeline_id,
            "name": data.name,
            "description": data.description,
            "source_event": data.source_event,
            "aggregation": data.aggregation.value,
            "field": data.field,
            "time_windows": [tw.value for tw in data.time_windows],
            "enabled": True,
            "created_at": now,
            "updated_at": now,
        }
        
        result = await self.collection.insert_one(feature_doc)
        feature_doc["_id"] = str(result.inserted_id)
        
        return feature_doc
    
    async def update(self, feature_id: str, project_id: str, data: FeatureUpdate) -> dict | None:
        """Update a feature."""
        update_data = data.model_dump(exclude_unset=True)
        
        # Convert enums to values
        if "aggregation" in update_data and update_data["aggregation"]:
            update_data["aggregation"] = update_data["aggregation"].value
        if "time_windows" in update_data and update_data["time_windows"]:
            update_data["time_windows"] = [tw.value for tw in update_data["time_windows"]]
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(feature_id), "project_id": project_id},
            {"$set": update_data},
            return_document=True,
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    async def delete(self, feature_id: str, project_id: str) -> bool:
        """Delete a feature."""
        result = await self.collection.delete_one({
            "_id": ObjectId(feature_id),
            "project_id": project_id,
        })
        return result.deleted_count > 0
    
    async def enable(self, feature_id: str, project_id: str) -> dict | None:
        """Enable a feature."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(feature_id), "project_id": project_id},
            {"$set": {"enabled": True, "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def disable(self, feature_id: str, project_id: str) -> dict | None:
        """Disable a feature."""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(feature_id), "project_id": project_id},
            {"$set": {"enabled": False, "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def get_enabled_for_project(self, project_id: str) -> list[dict]:
        """Get all enabled features for a project (used by compute service)."""
        cursor = self.collection.find({
            "project_id": project_id,
            "enabled": True,
        })
        features = await cursor.to_list(length=1000)
        
        for feature in features:
            feature["_id"] = str(feature["_id"])
        
        return features

