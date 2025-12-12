"""
Deployment service - orchestrates deployments with version control and conflict detection.
"""
from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.statuses import (
    ChangeType,
    ComponentType,
    DeploymentBucketStatus,
    DeploymentStatus,
    COMPONENT_COLLECTIONS,
)
from app.schemas.deployment import (
    DeploymentBucketCreate,
    DeploymentItemCreate,
    DeploymentItemStatus,
)


# =============================================================================
# DEPLOYMENT SEQUENCE CONFIGURATION
# =============================================================================
# This defines the order in which components are deployed.
# Components are deployed in this sequence to handle dependencies.
# Modify this list to change deployment order or add new component types.

DEPLOYMENT_SEQUENCE: List[ComponentType] = [
    ComponentType.DATABLOCK,   # Data models first (foundation)
    ComponentType.PIPELINE,    # Pipelines depend on data models
    ComponentType.FEATURE,     # Features depend on pipelines
    # Add new components here in dependency order:
    # ComponentType.MODEL,
    # ComponentType.WORKFLOW,
]


class DeploymentService:
    """Service for managing deployment buckets and executing deployments."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.buckets_collection = db.deployment_buckets
        self.deployments_collection = db.deployments
        self.counters_collection = db.counters
    
    # =========================================================================
    # Counter Management (for incremental deployment IDs)
    # =========================================================================
    
    async def _get_next_deployment_id(self, project_id: str) -> int:
        """Get the next incremental deployment ID for a project."""
        result = await self.counters_collection.find_one_and_update(
            {"_id": f"deployment_{project_id}"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result["seq"]
    
    async def get_current_deployment_id(self, project_id: str) -> int:
        """Get the current (latest) deployment ID for a project."""
        counter = await self.counters_collection.find_one(
            {"_id": f"deployment_{project_id}"}
        )
        return counter["seq"] if counter else 0
    
    # =========================================================================
    # Deployment Bucket Management
    # =========================================================================
    
    async def get_or_create_active_bucket(
        self, 
        project_id: str, 
        user_id: str,
        data: Optional[DeploymentBucketCreate] = None
    ) -> dict:
        """Get user's active bucket or create a new one."""
        # Check for existing active bucket
        existing = await self.buckets_collection.find_one({
            "project_id": project_id,
            "user_id": user_id,
            "status": DeploymentBucketStatus.ACTIVE.value,
        })
        
        if existing:
            existing["_id"] = str(existing["_id"])
            return existing
        
        # Create new bucket
        return await self.create_bucket(project_id, user_id, data)
    
    async def create_bucket(
        self,
        project_id: str,
        user_id: str,
        data: Optional[DeploymentBucketCreate] = None,
    ) -> dict:
        """Create a new deployment bucket."""
        current_deployment_id = await self.get_current_deployment_id(project_id)
        now = datetime.utcnow()
        
        # Generate a default name based on date/time if not provided
        bucket_name = data.name if data and data.name else f"Deployment {now.strftime('%Y-%m-%d %H:%M')}"
        
        bucket_doc = {
            "project_id": project_id,
            "user_id": user_id,
            "name": bucket_name,
            "description": data.description if data else None,
            "status": DeploymentBucketStatus.ACTIVE.value,
            "items": [],
            "item_count": 0,
            "base_deployment_id": current_deployment_id,
            "has_conflicts": False,
            "conflict_details": None,
            "created_at": now,
            "updated_at": now,
        }
        
        result = await self.buckets_collection.insert_one(bucket_doc)
        bucket_doc["_id"] = str(result.inserted_id)
        
        return bucket_doc
    
    async def get_bucket(
        self, 
        bucket_id: str, 
        project_id: str, 
        user_id: Optional[str] = None
    ) -> Optional[dict]:
        """Get a deployment bucket by ID."""
        query = {
            "_id": ObjectId(bucket_id),
            "project_id": project_id,
        }
        if user_id:
            query["user_id"] = user_id
        
        bucket = await self.buckets_collection.find_one(query)
        if bucket:
            bucket["_id"] = str(bucket["_id"])
            # Convert item IDs
            for item in bucket.get("items", []):
                if "_id" in item:
                    item["_id"] = str(item["_id"])
        
        return bucket
    
    async def list_buckets(
        self,
        project_id: str,
        user_id: Optional[str] = None,
        status: Optional[DeploymentBucketStatus] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[dict], int]:
        """List deployment buckets for a project."""
        query: Dict[str, Any] = {"project_id": project_id}
        
        if user_id:
            query["user_id"] = user_id
        if status:
            query["status"] = status.value
        
        total = await self.buckets_collection.count_documents(query)
        
        cursor = self.buckets_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        buckets = await cursor.to_list(length=limit)
        
        for bucket in buckets:
            bucket["_id"] = str(bucket["_id"])
            for item in bucket.get("items", []):
                if "_id" in item:
                    item["_id"] = str(item["_id"])
        
        return buckets, total
    
    async def discard_bucket(self, bucket_id: str, project_id: str, user_id: str) -> bool:
        """Discard (soft delete) a deployment bucket and reset item statuses."""
        # First get the bucket to access its items
        bucket = await self.get_bucket(bucket_id, project_id, user_id)
        if not bucket:
            return False
        
        if bucket["status"] not in [
            DeploymentBucketStatus.ACTIVE.value,
            DeploymentBucketStatus.CONFLICT.value,
        ]:
            return False
        
        # Reset status of all items in the bucket
        now = datetime.utcnow()
        for item in bucket.get("items", []):
            component_type = item.get("component_type")
            component_id = item.get("component_id")
            change_type = item.get("change_type")
            
            collection_name = COMPONENT_COLLECTIONS.get(ComponentType(component_type))
            if collection_name and component_id:
                try:
                    if change_type == ChangeType.DELETE.value:
                        # For deletion items: reset pending_deletion back to deployed
                        await self.db[collection_name].update_one(
                            {
                                "_id": ObjectId(component_id),
                                "project_id": project_id,
                                "status": "pending_deletion",
                            },
                            {
                                "$set": {
                                    "status": "deployed",
                                    "updated_at": now,
                                }
                            }
                        )
                    elif change_type == ChangeType.CREATE.value:
                        # For newly created items: mark as discarded (never deployed)
                        await self.db[collection_name].update_one(
                            {
                                "_id": ObjectId(component_id),
                                "project_id": project_id,
                            },
                            {
                                "$set": {
                                    "status": "discarded",
                                    "updated_at": now,
                                }
                            }
                        )
                    elif change_type == ChangeType.UPDATE.value:
                        # For update items: reset pending_update back to deployed
                        await self.db[collection_name].update_one(
                            {
                                "_id": ObjectId(component_id),
                                "project_id": project_id,
                                "status": {"$in": ["pending_update", "ready_for_deployment"]},
                            },
                            {
                                "$set": {
                                    "status": "deployed",
                                    "updated_at": now,
                                }
                            }
                        )
                    else:
                        # For any other items: reset ready_for_deployment back to configured
                        await self.db[collection_name].update_one(
                            {
                                "_id": ObjectId(component_id),
                                "project_id": project_id,
                                "status": "ready_for_deployment",
                            },
                            {
                                "$set": {
                                    "status": "configured",
                                    "updated_at": now,
                                }
                            }
                        )
                except Exception as e:
                    print(f"Error resetting status for {component_type} {component_id}: {e}")
        
        # Mark bucket as discarded
        result = await self.buckets_collection.update_one(
            {"_id": ObjectId(bucket_id)},
            {
                "$set": {
                    "status": DeploymentBucketStatus.DISCARDED.value,
                    "updated_at": now,
                }
            }
        )
        return result.modified_count > 0
    
    # =========================================================================
    # Deployment Item Management
    # =========================================================================
    
    async def add_item_to_bucket(
        self,
        bucket_id: str,
        project_id: str,
        user_id: str,
        item: DeploymentItemCreate,
    ) -> Optional[dict]:
        """Add an item to a deployment bucket."""
        # Verify bucket exists and is active
        bucket = await self.get_bucket(bucket_id, project_id, user_id)
        if not bucket or bucket["status"] != DeploymentBucketStatus.ACTIVE.value:
            return None
        
        # Check if item already exists in bucket (same component)
        existing_idx = None
        for idx, existing_item in enumerate(bucket.get("items", [])):
            if (existing_item["component_type"] == item.component_type.value and
                existing_item["component_id"] == item.component_id):
                existing_idx = idx
                break
        
        now = datetime.utcnow()
        item_doc = {
            "_id": str(ObjectId()),
            "component_type": item.component_type.value,
            "component_id": item.component_id,
            "component_name": item.component_name,
            "change_type": item.change_type.value,
            "change_summary": item.change_summary,
            "previous_version": item.previous_version,
            "payload": item.payload,
            "status": DeploymentItemStatus.PENDING.value,
            "error_message": None,
            "deployed_at": None,
            "created_at": now,
        }
        
        if existing_idx is not None:
            # Update existing item
            update_path = f"items.{existing_idx}"
            result = await self.buckets_collection.update_one(
                {"_id": ObjectId(bucket_id)},
                {
                    "$set": {
                        update_path: item_doc,
                        "updated_at": now,
                    }
                }
            )
        else:
            # Add new item
            result = await self.buckets_collection.update_one(
                {"_id": ObjectId(bucket_id)},
                {
                    "$push": {"items": item_doc},
                    "$inc": {"item_count": 1},
                    "$set": {"updated_at": now},
                }
            )
        
        if result.modified_count > 0:
            return item_doc
        return None
    
    async def remove_item_from_bucket(
        self,
        bucket_id: str,
        project_id: str,
        user_id: str,
        item_id: str,
    ) -> bool:
        """Remove an item from a deployment bucket."""
        result = await self.buckets_collection.update_one(
            {
                "_id": ObjectId(bucket_id),
                "project_id": project_id,
                "user_id": user_id,
                "status": DeploymentBucketStatus.ACTIVE.value,
            },
            {
                "$pull": {"items": {"_id": item_id}},
                "$inc": {"item_count": -1},
                "$set": {"updated_at": datetime.utcnow()},
            }
        )
        return result.modified_count > 0
    
    # =========================================================================
    # Conflict Detection
    # =========================================================================
    
    async def check_conflicts(
        self,
        bucket_id: str,
        project_id: str,
        user_id: str,
    ) -> dict:
        """Check for deployment conflicts."""
        bucket = await self.get_bucket(bucket_id, project_id, user_id)
        if not bucket:
            return {
                "has_conflicts": True,
                "current_deployment_id": 0,
                "bucket_base_deployment_id": None,
                "conflicts": [{"type": "error", "message": "Bucket not found"}],
                "message": "Bucket not found",
            }
        
        current_deployment_id = await self.get_current_deployment_id(project_id)
        base_deployment_id = bucket.get("base_deployment_id", 0)
        
        conflicts = []
        
        # Check if any deployments happened since bucket was created
        if current_deployment_id > base_deployment_id:
            # Get deployments that happened after this bucket was created
            recent_deployments = await self.deployments_collection.find({
                "project_id": project_id,
                "deployment_id": {"$gt": base_deployment_id},
                "status": DeploymentStatus.SUCCESS.value,
            }).to_list(100)
            
            # Check for conflicts with items in this bucket
            for item in bucket.get("items", []):
                component_type = item["component_type"]
                component_id = item["component_id"]
                
                for deployment in recent_deployments:
                    # Check if the same component was deployed
                    deployed_items = []
                    if component_type == ComponentType.DATABLOCK.value:
                        deployed_items = deployment.get("deployed_datablocks", [])
                    elif component_type == ComponentType.PIPELINE.value:
                        deployed_items = deployment.get("deployed_pipelines", [])
                    elif component_type == ComponentType.FEATURE.value:
                        deployed_items = deployment.get("deployed_features", [])
                    
                    if component_id in deployed_items:
                        conflicts.append({
                            "type": "version_conflict",
                            "component_type": component_type,
                            "component_id": component_id,
                            "component_name": item["component_name"],
                            "conflicting_deployment_id": deployment["deployment_id"],
                            "deployed_by": deployment.get("user_id"),
                            "deployed_at": deployment.get("completed_at"),
                            "message": f"{item['component_name']} was modified in deployment #{deployment['deployment_id']}",
                        })
        
        has_conflicts = len(conflicts) > 0
        
        # Update bucket conflict status
        if has_conflicts:
            await self.buckets_collection.update_one(
                {"_id": ObjectId(bucket_id)},
                {
                    "$set": {
                        "has_conflicts": True,
                        "conflict_details": [c["message"] for c in conflicts],
                        "status": DeploymentBucketStatus.CONFLICT.value,
                        "updated_at": datetime.utcnow(),
                    }
                }
            )
        
        return {
            "has_conflicts": has_conflicts,
            "current_deployment_id": current_deployment_id,
            "bucket_base_deployment_id": base_deployment_id,
            "conflicts": conflicts,
            "message": (
                f"Found {len(conflicts)} conflict(s). Discard bucket and recreate with latest changes."
                if has_conflicts
                else "No conflicts detected. Ready to deploy."
            ),
        }
    
    # =========================================================================
    # Deployment Execution
    # =========================================================================
    
    async def execute_deployment(
        self,
        bucket_id: str,
        project_id: str,
        user_id: str,
        force: bool = False,
        dry_run: bool = False,
    ) -> dict:
        """Execute deployment from a bucket."""
        # Get bucket
        bucket = await self.get_bucket(bucket_id, project_id, user_id)
        if not bucket:
            return {
                "success": False,
                "deployment_id": None,
                "deployment": None,
                "message": "Bucket not found",
                "errors": [{"type": "error", "message": "Bucket not found"}],
            }
        
        if bucket["status"] != DeploymentBucketStatus.ACTIVE.value:
            return {
                "success": False,
                "deployment_id": None,
                "deployment": None,
                "message": f"Bucket is not active (status: {bucket['status']})",
                "errors": [],
            }
        
        if not bucket.get("items"):
            return {
                "success": False,
                "deployment_id": None,
                "deployment": None,
                "message": "Bucket is empty",
                "errors": [],
            }
        
        # Check for conflicts
        conflict_check = await self.check_conflicts(bucket_id, project_id, user_id)
        if conflict_check["has_conflicts"]:
            return {
                "success": False,
                "deployment_id": None,
                "deployment": None,
                "message": conflict_check["message"],
                "errors": conflict_check["conflicts"],
            }
        
        if dry_run:
            return {
                "success": True,
                "deployment_id": None,
                "deployment": None,
                "message": f"Dry run complete. {len(bucket['items'])} items would be deployed.",
                "errors": [],
            }
        
        # Start deployment
        start_time = time.time()
        deployment_id = await self._get_next_deployment_id(project_id)
        now = datetime.utcnow()
        
        # Update bucket status
        await self.buckets_collection.update_one(
            {"_id": ObjectId(bucket_id)},
            {"$set": {"status": DeploymentBucketStatus.DEPLOYING.value, "updated_at": now}}
        )
        
        # Create deployment record
        deployment_doc = {
            "deployment_id": deployment_id,
            "project_id": project_id,
            "user_id": user_id,
            "bucket_id": bucket_id,
            "status": DeploymentStatus.SUCCESS.value,
            "items_total": len(bucket["items"]),
            "items_succeeded": 0,
            "items_failed": 0,
            "deployed_datablocks": [],
            "deployed_pipelines": [],
            "deployed_features": [],
            "started_at": now,
            "completed_at": None,
            "duration_ms": None,
            "errors": [],
            "created_at": now,
        }
        
        errors = []
        
        # Deploy in sequence
        for component_type in DEPLOYMENT_SEQUENCE:
            items_of_type = [
                item for item in bucket["items"]
                if item["component_type"] == component_type.value
            ]
            
            for item in items_of_type:
                try:
                    success = await self._deploy_component(
                        project_id=project_id,
                        deployment_id=deployment_id,
                        item=item,
                    )
                    
                    if success:
                        deployment_doc["items_succeeded"] += 1
                        # Track deployed components
                        if component_type == ComponentType.DATABLOCK:
                            deployment_doc["deployed_datablocks"].append(item["component_id"])
                        elif component_type == ComponentType.PIPELINE:
                            deployment_doc["deployed_pipelines"].append(item["component_id"])
                        elif component_type == ComponentType.FEATURE:
                            deployment_doc["deployed_features"].append(item["component_id"])
                    else:
                        deployment_doc["items_failed"] += 1
                        errors.append({
                            "component_type": item["component_type"],
                            "component_id": item["component_id"],
                            "component_name": item["component_name"],
                            "message": "Deployment failed",
                        })
                        
                except Exception as e:
                    deployment_doc["items_failed"] += 1
                    errors.append({
                        "component_type": item["component_type"],
                        "component_id": item["component_id"],
                        "component_name": item["component_name"],
                        "message": str(e),
                    })
        
        # Complete deployment
        end_time = time.time()
        deployment_doc["completed_at"] = datetime.utcnow()
        deployment_doc["duration_ms"] = int((end_time - start_time) * 1000)
        deployment_doc["errors"] = errors
        
        if deployment_doc["items_failed"] > 0:
            if deployment_doc["items_succeeded"] > 0:
                deployment_doc["status"] = DeploymentStatus.PARTIAL_SUCCESS.value
            else:
                deployment_doc["status"] = DeploymentStatus.FAILED.value
        
        # Save deployment record
        result = await self.deployments_collection.insert_one(deployment_doc)
        deployment_doc["_id"] = str(result.inserted_id)
        
        # Update bucket status
        bucket_status = (
            DeploymentBucketStatus.DEPLOYED.value 
            if deployment_doc["status"] == DeploymentStatus.SUCCESS.value
            else DeploymentBucketStatus.ACTIVE.value  # Keep active if failed
        )
        await self.buckets_collection.update_one(
            {"_id": ObjectId(bucket_id)},
            {"$set": {"status": bucket_status, "updated_at": datetime.utcnow()}}
        )
        
        success = deployment_doc["status"] in [
            DeploymentStatus.SUCCESS.value,
            DeploymentStatus.PARTIAL_SUCCESS.value,
        ]
        
        return {
            "success": success,
            "deployment_id": deployment_id,
            "deployment": deployment_doc,
            "message": (
                f"Deployment #{deployment_id} completed. "
                f"{deployment_doc['items_succeeded']}/{deployment_doc['items_total']} items deployed."
            ),
            "errors": errors,
        }
    
    async def _deploy_component(
        self,
        project_id: str,
        deployment_id: int,
        item: dict,
    ) -> bool:
        """Deploy a single component."""
        component_type = item["component_type"]
        component_id = item["component_id"]
        change_type = item["change_type"]
        
        collection_name = COMPONENT_COLLECTIONS.get(ComponentType(component_type))
        if not collection_name:
            return False
        
        collection = self.db[collection_name]
        now = datetime.utcnow()
        
        try:
            if change_type == ChangeType.DELETE.value:
                # Mark as deprecated instead of deleting
                await collection.update_one(
                    {"_id": ObjectId(component_id), "project_id": project_id},
                    {
                        "$set": {
                            "status": "deprecated",
                            "deprecated_at": now,
                            "deprecated_by_deployment": deployment_id,
                            "updated_at": now,
                        }
                    }
                )
            else:
                # Update component with new deployment info
                update_fields = {
                    "status": "deployed",
                    "deployment_id": deployment_id,
                    "deployed_at": now,
                    "updated_at": now,
                }
                
                # If there's a previous version, mark it as deprecated
                previous_version = item.get("previous_version")
                if previous_version:
                    # Find and deprecate older versions
                    await collection.update_many(
                        {
                            "project_id": project_id,
                            "deployment_id": {"$lt": deployment_id},
                            "name": item.get("payload", {}).get("name"),
                            "status": "deployed",
                        },
                        {
                            "$set": {
                                "status": "deprecated",
                                "deprecated_at": now,
                                "deprecated_by_deployment": deployment_id,
                            }
                        }
                    )
                
                # Update the component
                await collection.update_one(
                    {"_id": ObjectId(component_id), "project_id": project_id},
                    {"$set": update_fields}
                )
            
            return True
            
        except Exception as e:
            print(f"Error deploying component {component_id}: {e}")
            return False
    
    # =========================================================================
    # Deployment History
    # =========================================================================
    
    async def list_deployments(
        self,
        project_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[dict], int]:
        """List deployment history for a project."""
        query = {"project_id": project_id}
        
        total = await self.deployments_collection.count_documents(query)
        
        cursor = self.deployments_collection.find(query).skip(skip).limit(limit).sort("deployment_id", -1)
        deployments = await cursor.to_list(length=limit)
        
        for deployment in deployments:
            deployment["_id"] = str(deployment["_id"])
        
        return deployments, total
    
    async def get_deployment(
        self,
        deployment_id: int,
        project_id: str,
    ) -> Optional[dict]:
        """Get a specific deployment by its sequence ID."""
        deployment = await self.deployments_collection.find_one({
            "deployment_id": deployment_id,
            "project_id": project_id,
        })
        
        if deployment:
            deployment["_id"] = str(deployment["_id"])
        
        return deployment

