"""
CartNudge.ai Data Platform Service
===================================

Main FastAPI application entry point.
Manages pipeline configs, event ingestion, and feature computation.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.api.v1 import router as api_v1_router
from app.services.datablock_template_service import DatablockTemplateService


async def seed_templates():
    """Seed datablock templates from JSON file if they don't exist."""
    try:
        db = get_database()
        template_service = DatablockTemplateService(db)
        added_count = await template_service.seed_from_json()
        if added_count > 0:
            print(f"✓ Seeded {added_count} datablock templates")
        else:
            print("✓ Datablock templates already exist")
    except Exception as e:
        print(f"⚠ Warning: Failed to seed templates: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await connect_to_mongo()
    
    # Seed templates automatically
    await seed_templates()
    
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="CartNudge Data Platform",
    description="API for managing pipelines, features, and event ingestion",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "cartnudge-data-platform",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from app.db.mongodb import get_database
    
    db = get_database()
    try:
        # Ping MongoDB
        await db.command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"
    
    return {
        "status": "healthy" if mongo_status == "connected" else "degraded",
        "service": "cartnudge-data-platform",
        "dependencies": {
            "mongodb": mongo_status,
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
