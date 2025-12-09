# CartNudge.ai - Identity Service Plan

This document outlines the Identity Service architecture. Handles authentication, user management, projects, teams, and API keys.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       IDENTITY SERVICE                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 AUTHENTICATION                                   │   │
│  │                                                                  │   │
│  │   • Email/Password login                                        │   │
│  │   • JWT tokens (access + refresh)                               │   │
│  │   • API key authentication (for service-to-service)             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 USER MANAGEMENT                                  │   │
│  │                                                                  │   │
│  │   • User registration & profile                                 │   │
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
│  │                 DATA STORE (MongoDB)                             │   │
│  │                                                                  │   │
│  │   Collections:                                                   │   │
│  │   • users              - User accounts                          │   │
│  │   • projects           - Projects with embedded members         │   │
│  │   • api_keys           - Project API keys                       │   │
│  │   • refresh_tokens     - JWT refresh token tracking             │   │
│  │   • invitations        - Pending team invitations               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Service Info

| Property | Value |
|----------|-------|
| Name | `identity-service` |
| Description | Authentication, users, projects, teams, and API keys |
| Path | `backend/identityservice` |
| Port | `8010` |

---

## Tech Stack

| Component | Technology | Purpose | Port |
|-----------|------------|---------|------|
| Database | MongoDB | Users, projects, teams | 27017 |
| Cache | Redis | Session cache, rate limiting, token blacklist | 6379 |

### Authentication Stack
- **Password Hashing:** bcrypt via passlib
- **JWT:** python-jose

---

## MongoDB Collections

### `users`
User accounts.

```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "password_hash": "string",
  "name": "string",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime",
  "last_login_at": "datetime"
}
```

**Indexes:** `email (unique)`

### `projects`
Projects/workspaces with embedded members.

```json
{
  "_id": "ObjectId",
  "name": "string",
  "slug": "string (unique)",
  "description": "string",
  "timezone": "UTC",
  "settings": {},
  "is_active": true,
  "created_by": "ObjectId (user)",
  "members": [
    {
      "user_id": "ObjectId",
      "role": "owner|admin|developer|viewer",
      "invited_by": "ObjectId",
      "joined_at": "datetime"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Indexes:** `slug (unique)`, `created_by`, `members.user_id`

### `api_keys`
Project API keys for webhook authentication.

```json
{
  "_id": "ObjectId",
  "project_id": "ObjectId",
  "name": "string",
  "key_prefix": "string (first 8 chars)",
  "key_hash": "string",
  "scopes": ["ingest", "read_features"],
  "last_used_at": "datetime",
  "expires_at": "datetime",
  "is_active": true,
  "created_by": "ObjectId (user)",
  "created_at": "datetime"
}
```

**Indexes:** `project_id`, `key_prefix`

### `refresh_tokens`
JWT refresh token tracking.

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "token_hash": "string",
  "device_info": {
    "browser": "string",
    "os": "string"
  },
  "ip_address": "string",
  "expires_at": "datetime",
  "revoked_at": "datetime",
  "created_at": "datetime"
}
```

**Indexes:** `user_id`, `token_hash`, `expires_at (TTL)`

### `invitations`
Pending team invitations.

```json
{
  "_id": "ObjectId",
  "project_id": "ObjectId",
  "email": "string",
  "role": "admin|developer|viewer",
  "token": "string (unique)",
  "invited_by": "ObjectId (user)",
  "expires_at": "datetime",
  "accepted_at": "datetime",
  "created_at": "datetime"
}
```

**Indexes:** `project_id`, `email`, `token (unique)`, `expires_at (TTL)`

---

## Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| **owner** | Full access, can delete project | `*` (includes `billing:*`) |
| **admin** | Manage settings, invite members, manage API keys | `project:read`, `project:update`, `members:*`, `api_keys:*`, `billing:read`, `pipelines:*`, `features:*`, `deployments:*` |
| **developer** | Edit pipelines, features, deploy | `project:read`, `members:read`, `api_keys:read`, `pipelines:*`, `features:*`, `deployments:create`, `deployments:read` |
| **viewer** | Read-only access | `project:read`, `members:read`, `pipelines:read`, `features:read`, `deployments:read` |

### Billing Permissions
| Permission | Description |
|------------|-------------|
| `billing:read` | View billing info, invoices, usage |
| `billing:update` | Update payment method, billing details |
| `billing:manage` | Change plan, cancel subscription |

---

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/logout` | Logout (revoke refresh token) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get current user |
| PUT | `/api/v1/users/me` | Update current user |
| PUT | `/api/v1/users/me/password` | Change password |
| DELETE | `/api/v1/users/me` | Delete account |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects` | List user's projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/{project_id}` | Get project |
| PUT | `/api/v1/projects/{project_id}` | Update project |
| DELETE | `/api/v1/projects/{project_id}` | Delete project |

### Team Members
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{project_id}/members` | List members |
| POST | `/api/v1/projects/{project_id}/members/invite` | Invite member |
| PUT | `/api/v1/projects/{project_id}/members/{user_id}` | Update role |
| DELETE | `/api/v1/projects/{project_id}/members/{user_id}` | Remove member |
| POST | `/api/v1/invitations/{token}/accept` | Accept invite |

### API Keys
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{project_id}/api-keys` | List API keys |
| POST | `/api/v1/projects/{project_id}/api-keys` | Create API key |
| DELETE | `/api/v1/projects/{project_id}/api-keys/{key_id}` | Revoke API key |

### Internal (Service-to-Service)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/validate-token` | Validate JWT token |
| POST | `/internal/validate-api-key` | Validate API key |
| GET | `/internal/projects/{project_id}/permissions/{user_id}` | Get permissions |

---

## Project Structure

```
backend/identityservice/
├── docker-compose.yml           # MongoDB, Redis
├── SERVICES_PLAN.md             # This file
├── main.py                      # FastAPI entry point
├── requirements.txt             # Python dependencies
│
├── app/
│   ├── api/v1/
│   │   ├── auth.py              # Auth endpoints
│   │   ├── users.py             # User endpoints
│   │   ├── projects.py          # Project endpoints
│   │   ├── members.py           # Team member endpoints
│   │   ├── api_keys.py          # API key endpoints
│   │   └── internal.py          # Internal (service-to-service)
│   │
│   ├── core/
│   │   ├── config.py            # Settings
│   │   ├── security.py          # Password hashing, JWT
│   │   └── dependencies.py      # FastAPI dependencies
│   │
│   ├── db/
│   │   └── mongodb.py           # MongoDB client (Motor)
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
└── tests/
```

---

## Implementation Phases

### Phase 1: Core Setup
- [ ] FastAPI app with MongoDB connection (Motor)
- [ ] Basic config management
- [ ] Docker compose (MongoDB + Redis)

### Phase 2: Authentication
- [ ] User registration
- [ ] Email/password login
- [ ] JWT access + refresh tokens
- [ ] Password hashing with bcrypt
- [ ] Logout (token revocation)

### Phase 3: User Management
- [ ] Get/update profile
- [ ] Change password
- [ ] Password reset flow

### Phase 4: Projects
- [ ] CRUD for projects
- [ ] Auto-create owner membership
- [ ] Project settings

### Phase 5: Team Management
- [ ] List members (embedded in project)
- [ ] Invite via email
- [ ] Accept invitation
- [ ] Update roles
- [ ] Remove members

### Phase 6: API Keys
- [ ] Generate API keys
- [ ] Scoped permissions
- [ ] List/revoke keys
- [ ] Validation endpoint for other services

### Phase 7: Security
- [ ] Rate limiting
- [ ] Token blacklist in Redis
- [ ] Session management
