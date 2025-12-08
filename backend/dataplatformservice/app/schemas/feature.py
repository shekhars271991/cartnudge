"""
Pydantic schemas for Feature API.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


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
    description: str | None = None
    source_event: str = Field(..., description="Event name to aggregate")
    aggregation: AggregationType
    field: str | None = Field(None, description="Field to aggregate (for SUM, AVG, etc.)")
    time_windows: list[TimeWindow] = [TimeWindow.TWENTY_FOUR_HOURS]


class FeatureCreate(FeatureBase):
    """Schema for creating a feature."""
    pipeline_id: str


class FeatureUpdate(BaseModel):
    """Schema for updating a feature."""
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    aggregation: AggregationType | None = None
    field: str | None = None
    time_windows: list[TimeWindow] | None = None
    enabled: bool | None = None


class FeatureResponse(FeatureBase):
    """Schema for feature response."""
    id: str = Field(..., alias="_id")
    project_id: str
    pipeline_id: str
    enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True


class FeatureListResponse(BaseModel):
    """Schema for list of features."""
    items: list[FeatureResponse]
    total: int

