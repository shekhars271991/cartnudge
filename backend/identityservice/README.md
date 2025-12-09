# CartNudge Identity Service

Authentication, user management, projects, teams, and API keys service.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+

### 1. Start Infrastructure

```bash
# Start MongoDB and Redis
docker compose up -d

# (Optional) Start with dev tools (Mongo Express UI)
docker compose --profile tools up -d
```

### 2. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Service

```bash
# Development mode with hot reload
python main.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8010 --reload
```

### 4. Access the API

- **API Docs (Swagger)**: http://localhost:8010/docs
- **API Docs (ReDoc)**: http://localhost:8010/redoc
- **Health Check**: http://localhost:8010/health

## Environment Variables

Create a `.env` file in the root directory:

```env
# Application
APP_NAME=CartNudge Identity Service
APP_ENV=development
DEBUG=true

# MongoDB
MONGODB_URL=mongodb://cartnudge:cartnudge_dev@localhost:27017
MONGODB_DB_NAME=identity

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT (CHANGE IN PRODUCTION!)
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/logout` | Logout (revoke token) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get current user |
| PUT | `/api/v1/users/me` | Update profile |
| PUT | `/api/v1/users/me/password` | Change password |
| DELETE | `/api/v1/users/me` | Delete account |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List user's projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/{id}` | Get project |
| PUT | `/api/v1/projects/{id}` | Update project |
| DELETE | `/api/v1/projects/{id}` | Delete project |

### Team Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{id}/members` | List members |
| POST | `/api/v1/projects/{id}/members/invite` | Invite member |
| PUT | `/api/v1/projects/{id}/members/{user_id}` | Update role |
| DELETE | `/api/v1/projects/{id}/members/{user_id}` | Remove member |
| GET | `/api/v1/invitations/{token}` | Get invitation |
| POST | `/api/v1/invitations/{token}/accept` | Accept invitation |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{id}/api-keys` | List API keys |
| POST | `/api/v1/projects/{id}/api-keys` | Create API key |
| DELETE | `/api/v1/projects/{id}/api-keys/{key_id}` | Revoke API key |

### Internal (Service-to-Service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/internal/validate-token` | Validate JWT |
| POST | `/api/v1/internal/validate-api-key` | Validate API key |
| GET | `/api/v1/internal/projects/{id}/permissions/{user_id}` | Get permissions |

## Roles & Permissions

| Role | Description | Billing |
|------|-------------|---------|
| **owner** | Full access, can delete project | Full access |
| **admin** | Manage settings, members, API keys | Read-only |
| **developer** | Edit pipelines, features, deploy | None |
| **viewer** | Read-only access | None |

## Development

### Project Structure

```
identityservice/
├── main.py              # FastAPI entry point
├── requirements.txt     # Python dependencies
├── docker-compose.yml   # MongoDB, Redis
│
├── app/
│   ├── api/v1/          # API endpoints
│   ├── core/            # Config, security, dependencies
│   ├── db/              # MongoDB client
│   ├── schemas/         # Pydantic models
│   └── services/        # Business logic
│
└── tests/               # Tests
```

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black .
ruff check .
```

## Docker

### Build Image

```bash
docker build -t cartnudge-identity-service .
```

### Run Container

```bash
docker run -p 8010:8010 \
  -e MONGODB_URL=mongodb://host.docker.internal:27017 \
  cartnudge-identity-service
```

