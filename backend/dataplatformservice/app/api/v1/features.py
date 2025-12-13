"""
Features API - Endpoints for user feature retrieval and computation.

Features are organized into GROUPS for better organization and independent TTLs:
- cart: Shopping cart behavior (adds, removes, checkout)
- page: Page view and session data
- order: Purchase history and revenue
- engagement: Computed engagement scores
- recency: Time-based recency features

These endpoints allow:
- Retrieving precomputed features for a user (all groups or specific groups)
- Triggering on-demand feature computation
- Getting feature definitions
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Header, Query, status
from pydantic import BaseModel

from app.services.feature_service import get_feature_store, get_feature_service
from app.services.aerospike_service import get_aerospike_service, FeatureGroup

router = APIRouter()


# Load feature definitions
FEATURE_DEFINITIONS_PATH = Path(__file__).parent.parent.parent.parent / "data" / "feature_definitions.json"

# Valid feature groups
VALID_GROUPS = FeatureGroup.all()


def parse_api_key(api_key: str) -> Tuple[str, str]:
    """Parse API key to extract project_id."""
    if not api_key or not api_key.startswith("proj_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format. Expected: proj_{project_id}_{secret}",
        )
    
    parts = api_key.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format",
        )
    
    project_id = parts[1]
    secret = "_".join(parts[2:])
    
    return project_id, secret


# ============================================================================
# Response Models
# ============================================================================

class UserFeaturesResponse(BaseModel):
    """Response model for user features."""
    user_id: str
    project_id: str
    features: Dict[str, Any]
    computed_at: Optional[str] = None


class FeatureGroupResponse(BaseModel):
    """Response model for a single feature group."""
    user_id: str
    project_id: str
    group: str
    features: Dict[str, Any]
    updated_at: Optional[str] = None


class AllFeatureGroupsResponse(BaseModel):
    """Response model for all feature groups."""
    user_id: str
    project_id: str
    groups: Dict[str, Dict[str, Any]]
    available_groups: List[str] = VALID_GROUPS


class FlattenedFeaturesResponse(BaseModel):
    """Response model for flattened features (all groups merged)."""
    user_id: str
    project_id: str
    features: Dict[str, Any]
    updated_at: Optional[str] = None


class FeatureDefinitionsResponse(BaseModel):
    """Response model for feature definitions."""
    version: str
    feature_groups: List[Dict[str, Any]]


class ComputeFeaturesResponse(BaseModel):
    """Response model for compute features."""
    success: bool
    user_id: str
    project_id: str
    features: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


# ============================================================================
# Endpoints
# ============================================================================

@router.get(
    "/features/definitions",
    response_model=FeatureDefinitionsResponse,
    summary="Get feature definitions",
    description="Get the definitions of all available features.",
)
async def get_feature_definitions():
    """Get feature definitions."""
    try:
        with open(FEATURE_DEFINITIONS_PATH) as f:
            definitions = json.load(f)
        
        return FeatureDefinitionsResponse(
            version=definitions.get("version", "1.0"),
            feature_groups=definitions.get("feature_groups", []),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load feature definitions: {str(e)}",
        )


@router.get(
    "/features/user/{user_id}",
    response_model=UserFeaturesResponse,
    summary="Get user features",
    description="""
    Get precomputed features for a user.
    
    Features are computed periodically by a background job and stored in the feature store.
    If features are not found, returns 404.
    
    **Authentication**: Requires a valid API key in the `X-API-Key` header.
    """,
)
async def get_user_features(
    user_id: str,
    x_api_key: str = Header(..., description="API key"),
):
    """Get features for a user."""
    project_id, _ = parse_api_key(x_api_key)
    
    feature_store = get_feature_store()
    features = feature_store.get_features(project_id, user_id)
    
    if features is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Features not found for user {user_id}. Features may not have been computed yet.",
        )
    
    return UserFeaturesResponse(
        user_id=user_id,
        project_id=project_id,
        features=features,
        computed_at=features.get("computed_at"),
    )


@router.post(
    "/features/user/{user_id}/compute",
    response_model=ComputeFeaturesResponse,
    summary="Compute user features on-demand",
    description="""
    Compute features for a user on-demand.
    
    This will:
    1. Query ClickHouse for user's event history
    2. Compute all features
    3. Store in the feature store
    4. Return the computed features
    
    **Note**: This is an expensive operation. Use sparingly.
    For bulk computation, use the background job.
    
    **Authentication**: Requires a valid API key in the `X-API-Key` header.
    """,
)
async def compute_user_features(
    user_id: str,
    x_api_key: str = Header(..., description="API key"),
    ttl_days: int = Query(default=7, description="Feature TTL in days"),
):
    """Compute and store features for a user."""
    project_id, _ = parse_api_key(x_api_key)
    
    feature_store = get_feature_store()
    
    try:
        features = feature_store.compute_and_store(
            project_id=project_id,
            user_id=user_id,
            ttl_days=ttl_days,
        )
        
        if features:
            return ComputeFeaturesResponse(
                success=True,
                user_id=user_id,
                project_id=project_id,
                features=features,
            )
        else:
            return ComputeFeaturesResponse(
                success=False,
                user_id=user_id,
                project_id=project_id,
                message="Failed to compute or store features",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute features: {str(e)}",
        )


@router.get(
    "/features/user/{user_id}/summary",
    summary="Get feature summary for a user",
    description="""
    Get a summarized view of key features for a user.
    
    Returns only the most important features for quick access.
    """,
)
async def get_user_feature_summary(
    user_id: str,
    x_api_key: str = Header(..., description="API key"),
):
    """Get a summary of key features for a user."""
    project_id, _ = parse_api_key(x_api_key)
    
    # Try new grouped features first
    aerospike = get_aerospike_service()
    all_groups = aerospike.get_all_feature_groups(project_id, user_id)
    
    if all_groups:
        # Build summary from grouped features
        cart = all_groups.get("cart", {}).get("features", {})
        page = all_groups.get("page", {}).get("features", {})
        order = all_groups.get("order", {}).get("features", {})
        engagement = all_groups.get("engagement", {}).get("features", {})
        recency = all_groups.get("recency", {}).get("features", {})
        
        summary = {
            "user_id": user_id,
            "engagement": {
                "views_30d": page.get("views_30d", 0),
                "sessions_30d": page.get("sessions_30d", 0),
                "engagement_score": engagement.get("engagement_score", 0),
            },
            "cart_behavior": {
                "adds_30d": cart.get("adds_30d", 0),
                "abandonment_rate": engagement.get("cart_abandonment_rate", 0),
                "unique_products": cart.get("unique_products", 0),
            },
            "purchase_history": {
                "orders_30d": order.get("count_30d", 0),
                "revenue_30d": order.get("revenue_30d", 0),
                "avg_order_value": order.get("avg_value", 0),
            },
            "recency": {
                "days_since_last": recency.get("days_since_last", 999),
                "hours_since_last": recency.get("hours_since_last", 9999),
            },
            "computed_at": recency.get("last_seen"),
        }
        return summary
    
    # Fallback to legacy single-blob features
    feature_store = get_feature_store()
    features = feature_store.get_features(project_id, user_id)
    
    if features is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Features not found for user {user_id}",
        )
    
    # Return only key features (legacy format)
    summary = {
        "user_id": user_id,
        "engagement": {
            "page_views_30d": features.get("page_views_30d", 0),
            "sessions_30d": features.get("sessions_30d", 0),
            "engagement_score": features.get("engagement_score", 0),
        },
        "cart_behavior": {
            "cart_adds_30d": features.get("cart_adds_30d", 0),
            "cart_abandonment_rate": features.get("cart_abandonment_rate", 0),
            "unique_products_carted": features.get("unique_products_carted_30d", 0),
        },
        "purchase_history": {
            "orders_30d": features.get("orders_30d", 0),
            "total_revenue_30d": features.get("total_revenue_30d", 0),
            "avg_order_value": features.get("avg_order_value", 0),
        },
        "recency": {
            "days_since_last_visit": features.get("days_since_last_visit", 999),
            "days_since_last_order": features.get("days_since_last_order", 999),
        },
        "trends": {
            "page_views_trend": features.get("page_views_trend", 0),
            "is_declining_engagement": features.get("is_declining_engagement", False),
        },
        "computed_at": features.get("computed_at"),
    }
    
    return summary


# ============================================================================
# Feature Groups API
# ============================================================================

@router.get(
    "/features/groups",
    summary="List available feature groups",
    description="Get the list of available feature groups.",
)
async def list_feature_groups():
    """List all available feature groups."""
    return {
        "groups": VALID_GROUPS,
        "description": {
            "cart": "Shopping cart behavior (adds, removes, checkout, cart values)",
            "page": "Page view and session data (views, sessions, duration)",
            "order": "Purchase history and revenue (orders, revenue, AOV)",
            "engagement": "Computed engagement scores and ratios",
            "recency": "Time-based recency features (days/hours since last activity)",
        },
    }


@router.get(
    "/features/user/{user_id}/groups",
    response_model=AllFeatureGroupsResponse,
    summary="Get all feature groups for a user",
    description="""
    Get all feature groups for a user.
    
    Features are organized into groups:
    - **cart**: Shopping cart behavior
    - **page**: Page view and session data
    - **order**: Purchase history
    - **engagement**: Computed engagement scores
    - **recency**: Time-based features
    
    **Authentication**: Requires a valid API key in the `X-API-Key` header.
    """,
)
async def get_all_user_feature_groups(
    user_id: str,
    x_api_key: str = Header(..., description="API key"),
    groups: Optional[str] = Query(None, description="Comma-separated list of groups to fetch (default: all)"),
):
    """Get all feature groups for a user."""
    project_id, _ = parse_api_key(x_api_key)
    
    # Parse groups filter
    group_list = None
    if groups:
        group_list = [g.strip() for g in groups.split(",")]
        invalid_groups = [g for g in group_list if g not in VALID_GROUPS]
        if invalid_groups:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid groups: {invalid_groups}. Valid groups: {VALID_GROUPS}",
            )
    
    aerospike = get_aerospike_service()
    all_groups = aerospike.get_all_feature_groups(project_id, user_id, group_list)
    
    if not all_groups:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No features found for user {user_id}. Features may not have been computed yet.",
        )
    
    return AllFeatureGroupsResponse(
        user_id=user_id,
        project_id=project_id,
        groups=all_groups,
    )


@router.get(
    "/features/user/{user_id}/groups/{group}",
    response_model=FeatureGroupResponse,
    summary="Get a specific feature group for a user",
    description="""
    Get features for a specific group.
    
    Available groups: cart, page, order, engagement, recency
    
    **Authentication**: Requires a valid API key in the `X-API-Key` header.
    """,
)
async def get_user_feature_group(
    user_id: str,
    group: str,
    x_api_key: str = Header(..., description="API key"),
):
    """Get a specific feature group for a user."""
    project_id, _ = parse_api_key(x_api_key)
    
    if group not in VALID_GROUPS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid group '{group}'. Valid groups: {VALID_GROUPS}",
        )
    
    aerospike = get_aerospike_service()
    features = aerospike.get_feature_group(project_id, user_id, group)
    
    if features is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature group '{group}' not found for user {user_id}",
        )
    
    updated_at = features.pop("_updated_at", None)
    features.pop("_group", None)
    
    return FeatureGroupResponse(
        user_id=user_id,
        project_id=project_id,
        group=group,
        features=features,
        updated_at=updated_at,
    )


@router.get(
    "/features/user/{user_id}/flat",
    response_model=FlattenedFeaturesResponse,
    summary="Get all features flattened into one dictionary",
    description="""
    Get all feature groups merged into a single flat dictionary.
    
    Feature names are prefixed with their group name (e.g., cart_adds_7d, page_views_30d).
    Useful for ML model inference where you need all features in one dict.
    
    **Authentication**: Requires a valid API key in the `X-API-Key` header.
    """,
)
async def get_flattened_features(
    user_id: str,
    x_api_key: str = Header(..., description="API key"),
    groups: Optional[str] = Query(None, description="Comma-separated list of groups to include"),
):
    """Get all features flattened into one dictionary."""
    project_id, _ = parse_api_key(x_api_key)
    
    # Parse groups filter
    group_list = None
    if groups:
        group_list = [g.strip() for g in groups.split(",")]
        invalid_groups = [g for g in group_list if g not in VALID_GROUPS]
        if invalid_groups:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid groups: {invalid_groups}. Valid groups: {VALID_GROUPS}",
            )
    
    aerospike = get_aerospike_service()
    flattened = aerospike.get_flattened_features(project_id, user_id, group_list)
    
    if len(flattened) <= 2:  # Only user_id and project_id, no actual features
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No features found for user {user_id}",
        )
    
    updated_at = flattened.pop("_updated_at", None)
    
    return FlattenedFeaturesResponse(
        user_id=user_id,
        project_id=project_id,
        features=flattened,
        updated_at=updated_at,
    )
