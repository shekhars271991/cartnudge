"""
CartNudge.ai - Identity Service Plan
=====================================

This document outlines the Identity Service architecture.
Handles authentication, user management, projects, teams, and API keys.

This is a separate service from the Data Platform Service.
Uses PostgreSQL for relational data (users, projects, teams, permissions).

Architecture Overview:
----------------------
┌─────────────────────────────────────────────────────────────────────────┐
│                       IDENTITY SERVICE                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 AUTHENTICATION                                   │   │
│  │                                                                  │   │
│  │   • Email/Password login                                        │   │
│  │   • OAuth2 (Google, GitHub)                                     │   │
│  │   • Magic link / passwordless                                   │   │
│  │   • JWT tokens (access + refresh)                               │   │
│  │   • API key authentication (for service-to-service)             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 USER MANAGEMENT                                  │   │
│  │                                                                  │   │
│  │   • User registration & profile                                 │   │
│  │   • Email verification                                          │   │
│  │   • Password reset                                              │   │
│  │   • Account settings                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 PROJECTS & TEAMS                                 │   │
│  │                                                                  │   │
│  │   Project                                                        │   │
│  │   ├── Settings (name, timezone, etc.)                           │   │
│  │   ├── API Keys (for webhook auth)                               │   │
│  │   └── Team Members                                               │   │
│  │       ├── Owner (full access)                                   │   │
│  │       ├── Admin (manage settings, invite)                       │   │
│  │       ├── Developer (edit pipelines, features)                  │   │
│  │       └── Viewer (read-only)                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 DATA STORE (PostgreSQL)                          │   │
│  │                                                                  │   │
│  │   Tables:                                                        │   │
│  │   • users              - User accounts                          │   │
│  │   • projects           - Projects/workspaces                    │   │
│  │   • project_members    - User-project membership with role      │   │
│  │   • api_keys           - Project API keys                       │   │
│  │   • refresh_tokens     - JWT refresh token tracking             │   │
│  │   • invitations        - Pending team invitations               │   │
│  │   • audit_logs         - Security audit trail                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

Tech Stack:
-----------
• Python 3.11+ / FastAPI
• PostgreSQL (relational data)
• Redis (session cache, rate limiting)
• Alembic (migrations)
• Passlib + bcrypt (password hashing)
• python-jose (JWT)
"""

# =============================================================================
# SERVICE INFO
# =============================================================================

SERVICE_INFO = {
    "name": "identity-service",
    "description": "Authentication, users, projects, teams, and API keys",
    "path": "backend/identityservice",
    "port": 8010,
}

# =============================================================================
# TECH STACK
# =============================================================================

TECH_STACK = {
    "database": {
        "technology": "PostgreSQL",
        "purpose": "Users, projects, teams, permissions (relational data)",
        "driver": "asyncpg + SQLAlchemy 2.0",
        "port": 5432,
    },
    "cache": {
        "technology": "Redis",
        "purpose": "Session cache, rate limiting, token blacklist",
        "driver": "redis",
        "port": 6379,
    },
    "migrations": {
        "technology": "Alembic",
        "purpose": "Database schema migrations",
    },
    "auth": {
        "password_hashing": "bcrypt via passlib",
        "jwt": "python-jose",
        "oauth": "authlib (optional)",
    },
}

# =============================================================================
# DATABASE SCHEMA
# =============================================================================

DATABASE_TABLES = {
    "users": {
        "description": "User accounts",
        "columns": {
            "id": "UUID PRIMARY KEY",
            "email": "VARCHAR(255) UNIQUE NOT NULL",
            "password_hash": "VARCHAR(255)",  # Null for OAuth-only users
            "name": "VARCHAR(255)",
            "avatar_url": "VARCHAR(500)",
            "email_verified": "BOOLEAN DEFAULT FALSE",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_at": "TIMESTAMP DEFAULT NOW()",
            "updated_at": "TIMESTAMP DEFAULT NOW()",
            "last_login_at": "TIMESTAMP",
        },
        "indexes": ["email"],
    },
    "projects": {
        "description": "Projects/workspaces",
        "columns": {
            "id": "UUID PRIMARY KEY",
            "name": "VARCHAR(255) NOT NULL",
            "slug": "VARCHAR(100) UNIQUE NOT NULL",  # URL-friendly identifier
            "description": "TEXT",
            "timezone": "VARCHAR(50) DEFAULT 'UTC'",
            "settings": "JSONB DEFAULT '{}'",  # Flexible project settings
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_by": "UUID REFERENCES users(id)",
            "created_at": "TIMESTAMP DEFAULT NOW()",
            "updated_at": "TIMESTAMP DEFAULT NOW()",
        },
        "indexes": ["slug", "created_by"],
    },
    "project_members": {
        "description": "User-project membership with roles",
        "columns": {
            "id": "UUID PRIMARY KEY",
            "project_id": "UUID REFERENCES projects(id) ON DELETE CASCADE",
            "user_id": "UUID REFERENCES users(id) ON DELETE CASCADE",
            "role": "VARCHAR(50) NOT NULL",  # owner, admin, developer, viewer
            "invited_by": "UUID REFERENCES users(id)",
            "joined_at": "TIMESTAMP DEFAULT NOW()",
        },
        "indexes": [
            "project_id",
            "user_id",
            "(project_id, user_id) UNIQUE",
        ],
    },
    "api_keys": {
        "description": "Project API keys for webhook authentication",
        "columns": {
            "id": "UUID PRIMARY KEY",
            "project_id": "UUID REFERENCES projects(id) ON DELETE CASCADE",
            "name": "VARCHAR(255) NOT NULL",
            "key_prefix": "VARCHAR(8) NOT NULL",  # First 8 chars for identification
            "key_hash": "VARCHAR(255) NOT NULL",  # Hashed full key
            "scopes": "VARCHAR[] DEFAULT '{}'",  # e.g., ['ingest', 'read_features']
            "last_used_at": "TIMESTAMP",
            "expires_at": "TIMESTAMP",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_by": "UUID REFERENCES users(id)",
            "created_at": "TIMESTAMP DEFAULT NOW()",
        },
        "indexes": ["project_id", "key_prefix"],
    },
    "refresh_tokens": {
        "description": "JWT refresh token tracking",
        "columns": {
            "id": "UUID PRIMARY KEY",
            "user_id": "UUID REFERENCES users(id) ON DELETE CASCADE",
            "token_hash": "VARCHAR(255) NOT NULL",
            "device_info": "JSONB",  # Browser, OS, etc.
            "ip_address": "VARCHAR(45)",
            "expires_at": "TIMESTAMP NOT NULL",
            "revoked_at": "TIMESTAMP",
            "created_at": "TIMESTAMP DEFAULT NOW()",
        },
        "indexes": ["user_id", "token_hash"],
    },
    "invitations": {
        "description": "Pending team invitations",
        "columns": {
            "id": "UUID PRIMARY KEY",
            "project_id": "UUID REFERENCES projects(id) ON DELETE CASCADE",
            "email": "VARCHAR(255) NOT NULL",
            "role": "VARCHAR(50) NOT NULL",
            "token": "VARCHAR(255) UNIQUE NOT NULL",
            "invited_by": "UUID REFERENCES users(id)",
            "expires_at": "TIMESTAMP NOT NULL",
            "accepted_at": "TIMESTAMP",
            "created_at": "TIMESTAMP DEFAULT NOW()",
        },
        "indexes": ["project_id", "email", "token"],
    },
    "audit_logs": {
        "description": "Security audit trail",
        "columns": {
            "id": "UUID PRIMARY KEY",
            "user_id": "UUID REFERENCES users(id)",
            "project_id": "UUID REFERENCES projects(id)",
            "action": "VARCHAR(100) NOT NULL",  # e.g., 'login', 'api_key_created'
            "resource_type": "VARCHAR(50)",
            "resource_id": "VARCHAR(255)",
            "ip_address": "VARCHAR(45)",
            "user_agent": "TEXT",
            "metadata": "JSONB",
            "created_at": "TIMESTAMP DEFAULT NOW()",
        },
        "indexes": ["user_id", "project_id", "action", "created_at"],
    },
}

# =============================================================================
# ROLES & PERMISSIONS
# =============================================================================

ROLES = {
    "owner": {
        "description": "Full access, can delete project",
        "permissions": ["*"],
    },
    "admin": {
        "description": "Manage settings, invite members, manage API keys",
        "permissions": [
            "project:read",
            "project:update",
            "members:read",
            "members:invite",
            "members:remove",
            "api_keys:*",
            "pipelines:*",
            "features:*",
            "deployments:*",
        ],
    },
    "developer": {
        "description": "Edit pipelines, features, deploy",
        "permissions": [
            "project:read",
            "members:read",
            "api_keys:read",
            "pipelines:*",
            "features:*",
            "deployments:create",
            "deployments:read",
        ],
    },
    "viewer": {
        "description": "Read-only access",
        "permissions": [
            "project:read",
            "members:read",
            "pipelines:read",
            "features:read",
            "deployments:read",
        ],
    },
}

# =============================================================================
# API ENDPOINTS
# =============================================================================

API_ENDPOINTS = {
    "auth": {
        "description": "Authentication endpoints",
        "endpoints": [
            {"method": "POST", "path": "/api/v1/auth/register",      "description": "Register new user"},
            {"method": "POST", "path": "/api/v1/auth/login",         "description": "Login with email/password"},
            {"method": "POST", "path": "/api/v1/auth/logout",        "description": "Logout (revoke refresh token)"},
            {"method": "POST", "path": "/api/v1/auth/refresh",       "description": "Refresh access token"},
            {"method": "POST", "path": "/api/v1/auth/forgot-password",   "description": "Request password reset"},
            {"method": "POST", "path": "/api/v1/auth/reset-password",    "description": "Reset password with token"},
            {"method": "POST", "path": "/api/v1/auth/verify-email",      "description": "Verify email address"},
            {"method": "GET",  "path": "/api/v1/auth/oauth/{provider}",  "description": "OAuth redirect"},
            {"method": "GET",  "path": "/api/v1/auth/oauth/{provider}/callback", "description": "OAuth callback"},
        ],
    },
    "users": {
        "description": "User management",
        "endpoints": [
            {"method": "GET",    "path": "/api/v1/users/me",         "description": "Get current user"},
            {"method": "PUT",    "path": "/api/v1/users/me",         "description": "Update current user"},
            {"method": "PUT",    "path": "/api/v1/users/me/password", "description": "Change password"},
            {"method": "DELETE", "path": "/api/v1/users/me",         "description": "Delete account"},
        ],
    },
    "projects": {
        "description": "Project management",
        "endpoints": [
            {"method": "GET",    "path": "/api/v1/projects",                "description": "List user's projects"},
            {"method": "POST",   "path": "/api/v1/projects",                "description": "Create project"},
            {"method": "GET",    "path": "/api/v1/projects/{project_id}",   "description": "Get project"},
            {"method": "PUT",    "path": "/api/v1/projects/{project_id}",   "description": "Update project"},
            {"method": "DELETE", "path": "/api/v1/projects/{project_id}",   "description": "Delete project"},
        ],
    },
    "members": {
        "description": "Team member management",
        "endpoints": [
            {"method": "GET",    "path": "/api/v1/projects/{project_id}/members",            "description": "List members"},
            {"method": "POST",   "path": "/api/v1/projects/{project_id}/members/invite",     "description": "Invite member"},
            {"method": "PUT",    "path": "/api/v1/projects/{project_id}/members/{user_id}",  "description": "Update role"},
            {"method": "DELETE", "path": "/api/v1/projects/{project_id}/members/{user_id}",  "description": "Remove member"},
            {"method": "POST",   "path": "/api/v1/invitations/{token}/accept",               "description": "Accept invite"},
        ],
    },
    "api_keys": {
        "description": "API key management",
        "endpoints": [
            {"method": "GET",    "path": "/api/v1/projects/{project_id}/api-keys",           "description": "List API keys"},
            {"method": "POST",   "path": "/api/v1/projects/{project_id}/api-keys",           "description": "Create API key"},
            {"method": "DELETE", "path": "/api/v1/projects/{project_id}/api-keys/{key_id}",  "description": "Revoke API key"},
        ],
    },
    "internal": {
        "description": "Internal endpoints (service-to-service)",
        "endpoints": [
            {"method": "POST", "path": "/internal/validate-token",   "description": "Validate JWT token"},
            {"method": "POST", "path": "/internal/validate-api-key", "description": "Validate API key"},
            {"method": "GET",  "path": "/internal/projects/{project_id}/permissions/{user_id}", "description": "Get permissions"},
        ],
    },
}

# =============================================================================
# PROJECT STRUCTURE
# =============================================================================

PROJECT_STRUCTURE = """
backend/identityservice/
├── docker-compose.yml           # PostgreSQL, Redis
├── SERVICES_PLAN.py             # This file
├── main.py                      # FastAPI entry point
├── requirements.txt             # Python dependencies
│
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # Auth endpoints
│   │       ├── users.py         # User endpoints
│   │       ├── projects.py      # Project endpoints
│   │       ├── members.py       # Team member endpoints
│   │       ├── api_keys.py      # API key endpoints
│   │       └── internal.py      # Internal (service-to-service)
│   │
│   ├── core/
│   │   ├── config.py            # Settings
│   │   ├── security.py          # Password hashing, JWT
│   │   └── dependencies.py      # FastAPI dependencies
│   │
│   ├── db/
│   │   ├── session.py           # SQLAlchemy async session
│   │   └── base.py              # Base model
│   │
│   ├── models/                  # SQLAlchemy models
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── project_member.py
│   │   ├── api_key.py
│   │   ├── refresh_token.py
│   │   ├── invitation.py
│   │   └── audit_log.py
│   │
│   ├── schemas/                 # Pydantic schemas
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── member.py
│   │   └── api_key.py
│   │
│   └── services/                # Business logic
│       ├── auth_service.py
│       ├── user_service.py
│       ├── project_service.py
│       ├── member_service.py
│       └── api_key_service.py
│
├── alembic/                     # Database migrations
│   ├── versions/
│   └── env.py
│
└── tests/
    └── ...
"""

# =============================================================================
# IMPLEMENTATION PHASES
# =============================================================================

IMPLEMENTATION_PHASES = [
    {
        "phase": 1,
        "name": "Core Setup",
        "tasks": [
            "FastAPI app with PostgreSQL (async)",
            "SQLAlchemy 2.0 models",
            "Alembic migrations setup",
            "Docker compose (PostgreSQL + Redis)",
        ],
    },
    {
        "phase": 2,
        "name": "Authentication",
        "tasks": [
            "User registration",
            "Email/password login",
            "JWT access + refresh tokens",
            "Password hashing with bcrypt",
            "Logout (token revocation)",
        ],
    },
    {
        "phase": 3,
        "name": "User Management",
        "tasks": [
            "Get/update profile",
            "Change password",
            "Email verification flow",
            "Password reset flow",
        ],
    },
    {
        "phase": 4,
        "name": "Projects",
        "tasks": [
            "CRUD for projects",
            "Auto-create owner membership",
            "Project settings",
        ],
    },
    {
        "phase": 5,
        "name": "Team Management",
        "tasks": [
            "List members",
            "Invite via email",
            "Accept invitation",
            "Update roles",
            "Remove members",
        ],
    },
    {
        "phase": 6,
        "name": "API Keys",
        "tasks": [
            "Generate API keys",
            "Scoped permissions",
            "List/revoke keys",
            "Validation endpoint for other services",
        ],
    },
    {
        "phase": 7,
        "name": "Security & Audit",
        "tasks": [
            "Audit logging",
            "Rate limiting",
            "Session management",
            "OAuth2 integration (optional)",
        ],
    },
]

# =============================================================================
# PRINT SUMMARY
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("CartNudge.ai - Identity Service Plan")
    print("=" * 60)
    
    print("\n🛠️  Tech Stack:")
    for name, config in TECH_STACK.items():
        if isinstance(config, dict) and "technology" in config:
            print(f"  • {config['technology']}: {config['purpose']}")
        elif isinstance(config, dict):
            for k, v in config.items():
                print(f"  • {k}: {v}")
    
    print("\n📦 Database Tables:")
    for name, config in DATABASE_TABLES.items():
        print(f"  • {name}: {config['description']}")
    
    print("\n👥 Roles:")
    for name, config in ROLES.items():
        print(f"  • {name}: {config['description']}")
    
    print("\n🔌 API Endpoint Groups:")
    for name, config in API_ENDPOINTS.items():
        print(f"  • {name}: {len(config['endpoints'])} endpoints")
    
    print("\n📋 Implementation Phases:")
    for phase in IMPLEMENTATION_PHASES:
        print(f"  Phase {phase['phase']}: {phase['name']}")
        for task in phase['tasks']:
            print(f"    - {task}")
    
    print("\n" + "=" * 60)

