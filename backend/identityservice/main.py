"""
CartNudge.ai Identity Service
==============================

Main FastAPI application entry point.
Handles authentication, users, projects, teams, and API keys.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.api.v1 import router as api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="CartNudge Identity Service",
    description="""
## Overview
The Identity Service handles authentication, user management, projects, teams, and API keys for CartNudge.ai.

## Features
- **Authentication**: Email/password login with JWT tokens
- **User Management**: Profile management, password changes
- **Projects**: Create and manage projects/workspaces
- **Team Management**: Invite members, assign roles
- **API Keys**: Generate and manage API keys for integrations

## Authentication
Most endpoints require authentication via Bearer token:
1. Register or login to get an access token
2. Include the token in the `Authorization` header: `Bearer <token>`

## Roles
| Role | Description |
|------|-------------|
| Owner | Full access, can delete project |
| Admin | Manage settings, members, API keys |
| Developer | Edit pipelines, features, deploy |
| Viewer | Read-only access |
""",
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


def custom_openapi():
    """Custom OpenAPI schema with security."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT access token",
        }
    }
    
    # Add security to all endpoints except auth
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            if "/auth/" not in path and path != "/" and path != "/health":
                openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "service": "cartnudge-identity-service",
        "version": "0.1.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    from app.db.mongodb import get_database
    
    db = get_database()
    try:
        await db.command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"
    
    return {
        "status": "healthy" if mongo_status == "connected" else "degraded",
        "service": "cartnudge-identity-service",
        "dependencies": {
            "mongodb": mongo_status,
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8010,
        reload=True,
    )

