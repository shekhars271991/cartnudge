"""
Datablock service - business logic for datablock management with MongoDB.
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
    DataSourceType,
    IconType,
    FieldType,
    SchemaFieldCreate,
)


# Predefined datablock templates
PREDEFINED_TEMPLATES = [
    {
        "template_id": "users",
        "name": "users",
        "display_name": "Users",
        "description": "Anonymous user profiles and behavioral attributes. No PII stored.",
        "icon": IconType.USERS.value,
        "source_type": DataSourceType.HYBRID.value,
        "event_topic": "user.updated",
        "default_schema": [
            {"name": "user_id", "type": FieldType.STRING.value, "required": True, "description": "Anonymous user identifier", "is_primary_key": True},
            {"name": "created_at", "type": FieldType.DATE.value, "required": True, "description": "Account creation date", "is_primary_key": False},
            {"name": "segment", "type": FieldType.STRING.value, "required": False, "description": "Customer segment", "is_primary_key": False},
            {"name": "lifetime_value", "type": FieldType.NUMBER.value, "required": False, "description": "Customer lifetime value", "is_primary_key": False},
            {"name": "first_purchase_date", "type": FieldType.DATE.value, "required": False, "description": "Date of first purchase", "is_primary_key": False},
            {"name": "total_orders", "type": FieldType.NUMBER.value, "required": False, "description": "Total number of orders", "is_primary_key": False},
        ],
    },
    {
        "template_id": "products",
        "name": "products",
        "display_name": "Products",
        "description": "Product catalog with pricing and inventory. Typically bulk imported from your catalog system.",
        "icon": IconType.PACKAGE.value,
        "source_type": DataSourceType.CSV.value,
        "event_topic": None,
        "default_schema": [
            {"name": "product_id", "type": FieldType.STRING.value, "required": True, "description": "Unique product identifier", "is_primary_key": True},
            {"name": "name", "type": FieldType.STRING.value, "required": True, "description": "Product name", "is_primary_key": False},
            {"name": "category", "type": FieldType.STRING.value, "required": True, "description": "Product category", "is_primary_key": False},
            {"name": "price", "type": FieldType.NUMBER.value, "required": True, "description": "Current price", "is_primary_key": False},
            {"name": "image_url", "type": FieldType.STRING.value, "required": False, "description": "Product image URL", "is_primary_key": False},
            {"name": "is_active", "type": FieldType.BOOLEAN.value, "required": True, "description": "Product availability", "is_primary_key": False},
        ],
    },
    {
        "template_id": "cart_events",
        "name": "cart_events",
        "display_name": "Cart Events",
        "description": "Real-time cart activity including add, remove, and checkout events. Essential for purchase prediction.",
        "icon": IconType.CART.value,
        "source_type": DataSourceType.EVENT.value,
        "event_topic": "cart.*",
        "default_schema": [
            {"name": "event_id", "type": FieldType.STRING.value, "required": True, "description": "Unique event identifier", "is_primary_key": True},
            {"name": "user_id", "type": FieldType.STRING.value, "required": True, "description": "Anonymous user identifier", "is_primary_key": False},
            {"name": "session_id", "type": FieldType.STRING.value, "required": True, "description": "Session identifier", "is_primary_key": False},
            {"name": "event_type", "type": FieldType.STRING.value, "required": True, "description": "Type: cart_add, cart_remove, checkout_start, purchase", "is_primary_key": False},
            {"name": "product_id", "type": FieldType.STRING.value, "required": True, "description": "Product involved", "is_primary_key": False},
            {"name": "quantity", "type": FieldType.NUMBER.value, "required": True, "description": "Quantity", "is_primary_key": False},
            {"name": "cart_total", "type": FieldType.NUMBER.value, "required": False, "description": "Current cart total", "is_primary_key": False},
            {"name": "timestamp", "type": FieldType.DATE.value, "required": True, "description": "Event timestamp", "is_primary_key": False},
        ],
    },
    {
        "template_id": "page_views",
        "name": "page_views",
        "display_name": "Page Views",
        "description": "Browsing behavior and page interactions. Used for engagement scoring.",
        "icon": IconType.CURSOR.value,
        "source_type": DataSourceType.EVENT.value,
        "event_topic": "page.view",
        "default_schema": [
            {"name": "event_id", "type": FieldType.STRING.value, "required": True, "description": "Unique event identifier", "is_primary_key": True},
            {"name": "user_id", "type": FieldType.STRING.value, "required": True, "description": "Anonymous user identifier", "is_primary_key": False},
            {"name": "session_id", "type": FieldType.STRING.value, "required": True, "description": "Session identifier", "is_primary_key": False},
            {"name": "page_type", "type": FieldType.STRING.value, "required": True, "description": "Type: home, product, category, cart, checkout", "is_primary_key": False},
            {"name": "product_id", "type": FieldType.STRING.value, "required": False, "description": "Product ID if on product page", "is_primary_key": False},
            {"name": "duration_seconds", "type": FieldType.NUMBER.value, "required": False, "description": "Time spent on page", "is_primary_key": False},
            {"name": "timestamp", "type": FieldType.DATE.value, "required": True, "description": "Event timestamp", "is_primary_key": False},
        ],
    },
    {
        "template_id": "orders",
        "name": "orders",
        "display_name": "Orders",
        "description": "Completed purchase orders. Can be synced via events or bulk imported.",
        "icon": IconType.CREDIT_CARD.value,
        "source_type": DataSourceType.HYBRID.value,
        "event_topic": "order.created",
        "default_schema": [
            {"name": "order_id", "type": FieldType.STRING.value, "required": True, "description": "Unique order identifier", "is_primary_key": True},
            {"name": "user_id", "type": FieldType.STRING.value, "required": True, "description": "Anonymous user identifier", "is_primary_key": False},
            {"name": "total_amount", "type": FieldType.NUMBER.value, "required": True, "description": "Order total", "is_primary_key": False},
            {"name": "status", "type": FieldType.STRING.value, "required": True, "description": "Order status", "is_primary_key": False},
            {"name": "item_count", "type": FieldType.NUMBER.value, "required": True, "description": "Number of items in order", "is_primary_key": False},
            {"name": "created_at", "type": FieldType.DATE.value, "required": True, "description": "Order creation date", "is_primary_key": False},
        ],
    },
]


class DatablockService:
    """Service for managing datablocks in MongoDB."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.datablocks
    
    # -------------------------------------------------------------------------
    # Predefined Templates
    # -------------------------------------------------------------------------
    
    def get_predefined_templates(self) -> List[dict]:
        """Get all predefined datablock templates."""
        return PREDEFINED_TEMPLATES
    
    def get_template_by_id(self, template_id: str) -> Optional[dict]:
        """Get a specific predefined template by ID."""
        for template in PREDEFINED_TEMPLATES:
            if template["template_id"] == template_id:
                return template
        return None
    
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
        """Create a new datablock."""
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
            "is_predefined": False,
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
        """Create a datablock from a predefined template."""
        template = self.get_template_by_id(template_id)
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
            "is_predefined": True,
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

