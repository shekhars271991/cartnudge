"""
Centralized status definitions for all components.

This file is the single source of truth for all statuses used across the application.
When adding new statuses, update this file and regenerate the frontend constants.
"""
from __future__ import annotations

from enum import Enum
from typing import Dict, List


# =============================================================================
# DATABLOCK STATUSES
# =============================================================================

class DatablockStatus(str, Enum):
    """
    Datablock lifecycle statuses.
    
    Flow:
    - NOT_CONFIGURED -> CONFIGURED -> READY_FOR_DEPLOYMENT -> DEPLOYED
    - DEPLOYED -> PENDING_UPDATE -> DEPLOYED (after deployment)
    - DEPLOYED -> PENDING_DELETION -> DEPRECATED (after deployment)
    - Any pre-deployed state -> DISCARDED (if bucket discarded)
    """
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    READY_FOR_DEPLOYMENT = "ready_for_deployment"
    DEPLOYED = "deployed"
    PENDING_UPDATE = "pending_update"
    PENDING_DELETION = "pending_deletion"
    DEPRECATED = "deprecated"
    DISCARDED = "discarded"
    ERROR = "error"


# Statuses that are visible in the UI (not hidden)
DATABLOCK_VISIBLE_STATUSES: List[str] = [
    DatablockStatus.NOT_CONFIGURED.value,
    DatablockStatus.CONFIGURED.value,
    DatablockStatus.READY_FOR_DEPLOYMENT.value,
    DatablockStatus.DEPLOYED.value,
    DatablockStatus.PENDING_UPDATE.value,
    DatablockStatus.PENDING_DELETION.value,
]

# Statuses that are hidden from UI
DATABLOCK_HIDDEN_STATUSES: List[str] = [
    DatablockStatus.DEPRECATED.value,
    DatablockStatus.DISCARDED.value,
    DatablockStatus.ERROR.value,
]

# Statuses that indicate item is in deployment bucket
DATABLOCK_IN_BUCKET_STATUSES: List[str] = [
    DatablockStatus.READY_FOR_DEPLOYMENT.value,
    DatablockStatus.PENDING_UPDATE.value,
    DatablockStatus.PENDING_DELETION.value,
]

# Statuses that can be edited
DATABLOCK_EDITABLE_STATUSES: List[str] = [
    DatablockStatus.NOT_CONFIGURED.value,
    DatablockStatus.CONFIGURED.value,
    DatablockStatus.DEPLOYED.value,
    DatablockStatus.PENDING_UPDATE.value,
]


# =============================================================================
# DEPLOYMENT BUCKET STATUSES
# =============================================================================

class DeploymentBucketStatus(str, Enum):
    """
    Deployment bucket statuses.
    
    Flow:
    - ACTIVE -> DEPLOYING -> DEPLOYED
    - ACTIVE -> CONFLICT (if conflicts detected)
    - ACTIVE -> DISCARDED (if user discards)
    """
    ACTIVE = "active"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"
    CONFLICT = "conflict"
    DISCARDED = "discarded"


# =============================================================================
# DEPLOYMENT STATUSES
# =============================================================================

class DeploymentStatus(str, Enum):
    """
    Deployment execution statuses.
    """
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


# =============================================================================
# CHANGE TYPES
# =============================================================================

class ChangeType(str, Enum):
    """
    Types of changes in a deployment bucket.
    """
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


# =============================================================================
# COMPONENT TYPES
# =============================================================================

class ComponentType(str, Enum):
    """
    Types of components that can be deployed.
    """
    DATABLOCK = "datablock"
    PIPELINE = "pipeline"
    FEATURE = "feature"


# Mapping of component types to their MongoDB collections
COMPONENT_COLLECTIONS: Dict[ComponentType, str] = {
    ComponentType.DATABLOCK: "datablocks",
    ComponentType.PIPELINE: "pipelines",
    ComponentType.FEATURE: "features",
}


# =============================================================================
# PIPELINE STATUSES
# =============================================================================

class PipelineStatus(str, Enum):
    """
    Pipeline lifecycle statuses.
    """
    DRAFT = "draft"
    CONFIGURED = "configured"
    READY_FOR_DEPLOYMENT = "ready_for_deployment"
    DEPLOYED = "deployed"
    PENDING_UPDATE = "pending_update"
    PENDING_DELETION = "pending_deletion"
    DEPRECATED = "deprecated"
    DISCARDED = "discarded"
    ERROR = "error"


# =============================================================================
# FEATURE STATUSES
# =============================================================================

class FeatureStatus(str, Enum):
    """
    Feature lifecycle statuses.
    """
    DRAFT = "draft"
    CONFIGURED = "configured"
    READY_FOR_DEPLOYMENT = "ready_for_deployment"
    DEPLOYED = "deployed"
    PENDING_UPDATE = "pending_update"
    PENDING_DELETION = "pending_deletion"
    DEPRECATED = "deprecated"
    DISCARDED = "discarded"
    ERROR = "error"


# =============================================================================
# STATUS METADATA (for UI display)
# =============================================================================

STATUS_DISPLAY_CONFIG: Dict[str, Dict[str, str]] = {
    # Datablock statuses
    "not_configured": {
        "label": "Not Configured",
        "color": "slate",
        "description": "Initial state, needs configuration",
    },
    "configured": {
        "label": "Configured",
        "color": "blue",
        "description": "Configured and ready to be added to deployment",
    },
    "ready_for_deployment": {
        "label": "Ready for Deployment",
        "color": "amber",
        "description": "In deployment bucket, waiting to be deployed",
    },
    "deployed": {
        "label": "Deployed",
        "color": "emerald",
        "description": "Successfully deployed and active",
    },
    "pending_update": {
        "label": "Pending Update",
        "color": "blue",
        "description": "Has pending schema changes in deployment bucket",
    },
    "pending_deletion": {
        "label": "Pending Deletion",
        "color": "red",
        "description": "Marked for deletion, waiting for deployment",
    },
    "deprecated": {
        "label": "Deprecated",
        "color": "gray",
        "description": "Replaced by a newer version",
    },
    "discarded": {
        "label": "Discarded",
        "color": "gray",
        "description": "Discarded before deployment",
    },
    "error": {
        "label": "Error",
        "color": "red",
        "description": "Error state",
    },
    # Deployment statuses
    "active": {
        "label": "Active",
        "color": "blue",
        "description": "Active deployment bucket",
    },
    "deploying": {
        "label": "Deploying",
        "color": "amber",
        "description": "Deployment in progress",
    },
    "conflict": {
        "label": "Conflict",
        "color": "red",
        "description": "Conflicts detected with other deployments",
    },
    "pending": {
        "label": "Pending",
        "color": "slate",
        "description": "Waiting to start",
    },
    "in_progress": {
        "label": "In Progress",
        "color": "amber",
        "description": "Currently executing",
    },
    "success": {
        "label": "Success",
        "color": "emerald",
        "description": "Completed successfully",
    },
    "partial_success": {
        "label": "Partial Success",
        "color": "amber",
        "description": "Some items failed",
    },
    "failed": {
        "label": "Failed",
        "color": "red",
        "description": "Deployment failed",
    },
    "rolled_back": {
        "label": "Rolled Back",
        "color": "orange",
        "description": "Changes were rolled back",
    },
}

