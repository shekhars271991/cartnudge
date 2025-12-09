"""
Pydantic schemas for Feature API.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AggregationType(str, Enum):
    """Supported aggregation types."""
    COUNT = "COUNT"
    SUM = "SUM"
    AVG = "AVG"
    MIN = "MIN"
    MAX = "MAX"
    COUNT_DISTINCT = "COUNT_DISTINCT"
    LAST = "LAST"
    FIRST = "FIRST"


class TimeWindow(str, Enum):
    """Supported time windows."""
    FIVE_SECONDS = "5s"
    THIRTY_SECONDS = "30s"
    ONE_MINUTE = "1m"
    FIVE_MINUTES = "5m"
    ONE_HOUR = "1h"
    TWENTY_FOUR_HOURS = "24h"
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"
    LIFETIME = "lifetime"


# -----------------------------------------------------------------------------
# Feature Schema
# -----------------------------------------------------------------------------

class FeatureBase(BaseModel):
    """Base schema for feature."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    source_event: str = Field(..., description="Event name to aggregate")
    aggregation: AggregationType
    field: Optional[str] = Field(None, description="Field to aggregate (for SUM, AVG, etc.)")
    time_windows: List[TimeWindow] = [TimeWindow.TWENTY_FOUR_HOURS]


class FeatureCreate(FeatureBase):
    """Schema for creating a feature."""
    pipeline_id: str


class FeatureUpdate(BaseModel):
    """Schema for updating a feature."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    aggregation: Optional[AggregationType] = None
    field: Optional[str] = None
    time_windows: Optional[List[TimeWindow]] = None
    enabled: Optional[bool] = None


class FeatureResponse(FeatureBase):
    """Schema for feature response."""
    model_config = ConfigDict(populate_by_name=True, by_alias=True)
    
    id: str = Field(..., alias="_id")
    project_id: str
    pipeline_id: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


class FeatureListResponse(BaseModel):
    """Schema for list of features."""
    items: List[FeatureResponse]
    total: int
