"""
Training Data API - Endpoints for ML training data generation.

These endpoints allow:
- Triggering training data generation manually
- Checking training data stats
- Getting training run history
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Header, Query, status
from pydantic import BaseModel

from app.services.clickhouse_service import get_clickhouse_service


router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class GenerateTrainingDataRequest(BaseModel):
    """Request to generate training data."""
    start_date: Optional[str] = None  # YYYY-MM-DD, default: yesterday
    end_date: Optional[str] = None    # YYYY-MM-DD, default: today
    project_id: Optional[str] = None  # Specific project, default: all
    label_window_hours: int = 24
    
    class Config:
        json_schema_extra = {
            "example": {
                "start_date": "2024-12-01",
                "end_date": "2024-12-10",
                "project_id": "testproject123",
                "label_window_hours": 24
            }
        }


class TrainingDataStats(BaseModel):
    """Training data statistics."""
    total_samples: int
    positive_samples: int
    negative_samples: int
    conversion_rate_pct: float
    date_range: Dict[str, str]


class TrainingRunInfo(BaseModel):
    """Information about a training data run."""
    run_id: str
    model_type: str
    project_id: str
    start_date: str
    end_date: str
    samples_generated: int
    positive_samples: int
    negative_samples: int
    status: str
    started_at: str
    completed_at: Optional[str]


def parse_api_key(api_key: str) -> str:
    """Parse API key to extract project_id."""
    if not api_key or not api_key.startswith("proj_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format",
        )
    parts = api_key.split("_")
    if len(parts) < 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format",
        )
    return parts[1]


# ============================================================================
# Background Task for Training Data Generation
# ============================================================================

def generate_training_data_task(
    project_id: Optional[str],
    start_date: str,
    end_date: str,
    label_window_hours: int,
):
    """Background task to generate training data."""
    from runtime.jobs.training_data_generator import PurchasePropensityTrainingDataGenerator
    
    generator = PurchasePropensityTrainingDataGenerator()
    generator.label_window_hours = label_window_hours
    
    if project_id:
        generator.generate_for_date_range(project_id, start_date, end_date)
    else:
        generator.generate_for_all_projects(start_date, end_date)


# ============================================================================
# Endpoints
# ============================================================================

@router.post(
    "/training/purchase-propensity/generate",
    summary="Generate purchase propensity training data",
    description="""
    Trigger training data generation for purchase propensity model.
    
    This will:
    1. Find all cart.add events in the date range
    2. Compute features for each event (looking back 30 days)
    3. Determine label (did user purchase within label_window_hours?)
    4. Store in ClickHouse training table
    
    Runs in background - use /training/runs to check status.
    """,
)
async def generate_training_data(
    request: GenerateTrainingDataRequest,
    background_tasks: BackgroundTasks,
    x_api_key: str = Header(..., description="API key"),
):
    """Trigger training data generation."""
    project_from_key = parse_api_key(x_api_key)
    
    # Default dates: yesterday to today
    if not request.start_date:
        start_date = (datetime.utcnow().date() - timedelta(days=1)).isoformat()
    else:
        start_date = request.start_date
        
    if not request.end_date:
        end_date = datetime.utcnow().date().isoformat()
    else:
        end_date = request.end_date
    
    # Use project from request or from API key
    project_id = request.project_id or project_from_key
    
    # Add to background tasks
    background_tasks.add_task(
        generate_training_data_task,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        label_window_hours=request.label_window_hours,
    )
    
    return {
        "status": "started",
        "message": "Training data generation started in background",
        "config": {
            "project_id": project_id,
            "start_date": start_date,
            "end_date": end_date,
            "label_window_hours": request.label_window_hours,
        }
    }


@router.get(
    "/training/purchase-propensity/stats",
    response_model=TrainingDataStats,
    summary="Get training data statistics",
    description="Get statistics about the training data in the database.",
)
async def get_training_data_stats(
    x_api_key: str = Header(..., description="API key"),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    """Get training data statistics."""
    project_id = parse_api_key(x_api_key)
    
    clickhouse = get_clickhouse_service()
    
    # Build query
    where_clauses = ["project_id = {project_id:String}"]
    params = {"project_id": project_id}
    
    if start_date:
        where_clauses.append("observation_date >= {start_date:String}")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("observation_date < {end_date:String}")
        params["end_date"] = end_date
    
    where_clause = " AND ".join(where_clauses)
    
    query = f"""
    SELECT
        count() as total,
        countIf(label = 1) as positive,
        countIf(label = 0) as negative,
        min(observation_date) as min_date,
        max(observation_date) as max_date
    FROM events.purchase_propensity_training
    WHERE {where_clause}
    """
    
    try:
        result = clickhouse.client.query(query, parameters=params)
        
        if result.result_rows:
            row = result.result_rows[0]
            total = int(row[0])
            positive = int(row[1])
            negative = int(row[2])
            min_date = str(row[3]) if row[3] else None
            max_date = str(row[4]) if row[4] else None
            
            return TrainingDataStats(
                total_samples=total,
                positive_samples=positive,
                negative_samples=negative,
                conversion_rate_pct=round(positive / max(total, 1) * 100, 2),
                date_range={"start": min_date, "end": max_date},
            )
        
        return TrainingDataStats(
            total_samples=0,
            positive_samples=0,
            negative_samples=0,
            conversion_rate_pct=0,
            date_range={"start": None, "end": None},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get training data stats: {str(e)}",
        )


@router.get(
    "/training/runs",
    response_model=List[TrainingRunInfo],
    summary="Get training run history",
    description="Get history of training data generation runs.",
)
async def get_training_runs(
    x_api_key: str = Header(..., description="API key"),
    limit: int = Query(20, description="Max runs to return"),
):
    """Get training run history."""
    project_id = parse_api_key(x_api_key)
    
    clickhouse = get_clickhouse_service()
    
    query = """
    SELECT
        run_id,
        model_type,
        project_id,
        toString(start_date) as start_date,
        toString(end_date) as end_date,
        samples_generated,
        positive_samples,
        negative_samples,
        status,
        toString(started_at) as started_at,
        toString(completed_at) as completed_at
    FROM events.training_data_runs
    WHERE project_id = {project_id:String}
    ORDER BY started_at DESC
    LIMIT {limit:Int32}
    """
    
    try:
        result = clickhouse.client.query(query, parameters={
            "project_id": project_id,
            "limit": limit,
        })
        
        runs = []
        for row in result.result_rows:
            runs.append(TrainingRunInfo(
                run_id=row[0],
                model_type=row[1],
                project_id=row[2],
                start_date=row[3],
                end_date=row[4],
                samples_generated=int(row[5]),
                positive_samples=int(row[6]),
                negative_samples=int(row[7]),
                status=row[8],
                started_at=row[9],
                completed_at=row[10] if row[10] else None,
            ))
        
        return runs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get training runs: {str(e)}",
        )


@router.get(
    "/training/purchase-propensity/summary",
    summary="Get training data summary by date",
    description="Get summary of training data grouped by observation date.",
)
async def get_training_data_summary(
    x_api_key: str = Header(..., description="API key"),
    days: int = Query(30, description="Number of days to show"),
):
    """Get training data summary by date."""
    project_id = parse_api_key(x_api_key)
    
    clickhouse = get_clickhouse_service()
    
    query = """
    SELECT
        toString(observation_date) as date,
        count() as total_samples,
        countIf(label = 1) as positive_samples,
        countIf(label = 0) as negative_samples,
        round(countIf(label = 1) / count() * 100, 2) as conversion_rate_pct
    FROM events.purchase_propensity_training
    WHERE project_id = {project_id:String}
      AND observation_date >= today() - {days:Int32}
    GROUP BY observation_date
    ORDER BY observation_date DESC
    """
    
    try:
        result = clickhouse.client.query(query, parameters={
            "project_id": project_id,
            "days": days,
        })
        
        summary = []
        for row in result.result_rows:
            summary.append({
                "date": row[0],
                "total_samples": int(row[1]),
                "positive_samples": int(row[2]),
                "negative_samples": int(row[3]),
                "conversion_rate_pct": float(row[4]),
            })
        
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get training data summary: {str(e)}",
        )


@router.get(
    "/training/purchase-propensity/export",
    summary="Export training data as CSV",
    description="Get training data in CSV format for model training.",
)
async def export_training_data(
    x_api_key: str = Header(..., description="API key"),
    start_date: Optional[str] = Query(None, description="Start date"),
    end_date: Optional[str] = Query(None, description="End date"),
    limit: int = Query(10000, description="Max rows to export"),
):
    """Export training data as CSV."""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    project_id = parse_api_key(x_api_key)
    
    clickhouse = get_clickhouse_service()
    
    # Build query
    where_clauses = ["project_id = {project_id:String}"]
    params = {"project_id": project_id, "limit": limit}
    
    if start_date:
        where_clauses.append("observation_date >= {start_date:String}")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("observation_date < {end_date:String}")
        params["end_date"] = end_date
    
    where_clause = " AND ".join(where_clauses)
    
    query = f"""
    SELECT
        user_id,
        toString(observation_timestamp) as observation_timestamp,
        cart_item_price, cart_total, cart_item_count,
        f_cart_adds_7d, f_cart_adds_30d, f_cart_removes_30d, f_checkouts_30d,
        f_unique_products_carted_30d, f_avg_cart_value_30d,
        f_cart_abandonment_rate, f_carts_abandoned_30d,
        f_page_views_7d, f_page_views_30d, f_sessions_7d, f_sessions_30d,
        f_avg_session_duration_ms, f_product_views_30d, f_unique_products_viewed_30d,
        f_checkout_page_views_30d,
        f_orders_30d, f_orders_90d, f_orders_lifetime,
        f_total_revenue_30d, f_total_revenue_lifetime, f_avg_order_value,
        f_days_since_last_visit, f_days_since_last_cart_add, f_days_since_last_order,
        f_day_of_week, f_hour_of_day, f_is_weekend,
        f_engagement_score, f_browse_to_cart_ratio,
        label
    FROM events.purchase_propensity_training
    WHERE {where_clause}
    ORDER BY observation_timestamp
    LIMIT {{limit:Int32}}
    """
    
    try:
        result = clickhouse.client.query(query, parameters=params)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        columns = [
            "user_id", "observation_timestamp",
            "cart_item_price", "cart_total", "cart_item_count",
            "f_cart_adds_7d", "f_cart_adds_30d", "f_cart_removes_30d", "f_checkouts_30d",
            "f_unique_products_carted_30d", "f_avg_cart_value_30d",
            "f_cart_abandonment_rate", "f_carts_abandoned_30d",
            "f_page_views_7d", "f_page_views_30d", "f_sessions_7d", "f_sessions_30d",
            "f_avg_session_duration_ms", "f_product_views_30d", "f_unique_products_viewed_30d",
            "f_checkout_page_views_30d",
            "f_orders_30d", "f_orders_90d", "f_orders_lifetime",
            "f_total_revenue_30d", "f_total_revenue_lifetime", "f_avg_order_value",
            "f_days_since_last_visit", "f_days_since_last_cart_add", "f_days_since_last_order",
            "f_day_of_week", "f_hour_of_day", "f_is_weekend",
            "f_engagement_score", "f_browse_to_cart_ratio",
            "label"
        ]
        writer.writerow(columns)
        
        # Data rows
        for row in result.result_rows:
            writer.writerow(row)
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=training_data_{project_id}.csv"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export training data: {str(e)}",
        )

