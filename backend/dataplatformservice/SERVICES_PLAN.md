# CartNudge.ai - Data Platform Service Plan

This document outlines the Data Platform Service architecture. The service manages configurations for data models, pipelines, and feature stores. Runtime containers are SHARED (multi-tenant) with per-project isolation via routing.

> **NOTE:** Project/User management is handled by a separate Identity Service (PostgreSQL). This service only handles data platform concerns.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATA PLATFORM SERVICE                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 CONFIG METADATA (MongoDB)                        │   │
│  │                                                                  │   │
│  │  Collections:                                                    │   │
│  │  • pipelines     - Pipeline configs with nested events/fields   │   │
│  │  • features      - Feature definitions with aggregations        │   │
│  │  • deployments   - Deployment history                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 EVENT FLOW                                       │   │
│  │                                                                  │   │
│  │   POST /ingest/{project_id}/{pipeline_id}                       │   │
│  │                    │                                             │   │
│  │                    ▼                                             │   │
│  │              ┌─────────┐                                         │   │
│  │              │  Kafka  │  Topic: events (partitioned by project) │   │
│  │              └────┬────┘                                         │   │
│  │                   │                                              │   │
│  │                   ▼                                              │   │
│  │           ┌───────────────┐                                      │   │
│  │           │   Consumer    │  Compute aggregations                │   │
│  │           └───────┬───────┘                                      │   │
│  │                   │                                              │   │
│  │        ┌──────────┴──────────┐                                   │   │
│  │        ▼                     ▼                                   │   │
│  │  ┌───────────┐        ┌────────────┐                             │   │
│  │  │ Aerospike │        │ ClickHouse │                             │   │
│  │  │  (K/V)    │        │ (optional) │                             │   │
│  │  └───────────┘        └────────────┘                             │   │
│  │  Real-time features   Historical analytics                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 FEATURE SERVING                                  │   │
│  │                                                                  │   │
│  │   GET /features/{project_id}/users/{user_id}                    │   │
│  │                    │                                             │   │
│  │                    ▼                                             │   │
│  │              ┌───────────┐                                       │   │
│  │              │ Aerospike │  Key: {project}:{user}               │   │
│  │              └───────────┘  Bins: feature values                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Service Info

| Property | Value |
|----------|-------|
| Name | `data-platform-service` |
| Description | Manages pipeline configs, event ingestion, and feature computation |
| Path | `backend/dataplatformservice` |
| Port | `8000` |

---

## Tech Stack

| Component | Technology | Purpose | Port |
|-----------|------------|---------|------|
| Config Store | MongoDB | Pipeline definitions, event schemas, feature configs | 27017 |
| Event Streaming | Kafka | Event ingestion and processing pipeline | 9092 |
| Feature Store | Aerospike | Real-time feature storage (K/V) | 3000 |
| Cache | Redis | Config caching, rate limiting | 6379 |
| Analytics | ClickHouse | Historical event storage and analytics (optional) | 8123 |

### Aerospike Data Model
- **Namespace:** `features`
- **Set:** `{project_id}`
- **Key:** `{user_id}`
- **Bins:** `feature_name → value` (with TTL)

---

## MongoDB Collections

### `pipelines`
Pipeline configurations with nested events and fields.

```json
{
  "_id": "ObjectId",
  "project_id": "string",
  "name": "string",
  "description": "string",
  "category": "behavioral|transaction|context|marketing|trust|realtime",
  "status": "active|inactive|configuring",
  "webhook_secret": "string",
  "events": [
    {
      "name": "string (e.g., 'add_to_cart')",
      "description": "string",
      "enabled": "boolean",
      "fields": [
        {
          "name": "string",
          "type": "string|number|boolean|timestamp|object",
          "required": "boolean",
          "description": "string"
        }
      ]
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Indexes:** `project_id`, `(project_id, status)`

### `features`
Feature definitions for aggregation.

```json
{
  "_id": "ObjectId",
  "project_id": "string",
  "pipeline_id": "ObjectId",
  "name": "string (e.g., 'cart_adds_24h')",
  "description": "string",
  "source_event": "string (e.g., 'add_to_cart')",
  "aggregation": "COUNT|SUM|AVG|MIN|MAX|COUNT_DISTINCT|LAST|FIRST",
  "field": "string (for SUM/AVG)",
  "time_windows": ["5m", "1h", "24h", "7d", "30d"],
  "enabled": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Indexes:** `project_id`, `(project_id, enabled)`

### `deployments`
Deployment history.

```json
{
  "_id": "ObjectId",
  "project_id": "string",
  "version": "integer",
  "status": "pending|deploying|success|failed|rolled_back",
  "changes": [
    {
      "type": "create|update|delete",
      "resource_type": "pipeline|event|feature",
      "resource_id": "string",
      "description": "string"
    }
  ],
  "deployed_by": "string (user_id)",
  "deployed_at": "datetime",
  "created_at": "datetime"
}
```

**Indexes:** `(project_id, created_at DESC)`

---

## API Endpoints

### Pipelines
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{project_id}/pipelines` | List all pipelines |
| POST | `/api/v1/projects/{project_id}/pipelines` | Create pipeline |
| GET | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}` | Get pipeline |
| PUT | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}` | Update pipeline |
| DELETE | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}` | Delete pipeline |
| POST | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}/activate` | Activate pipeline |
| POST | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}/deactivate` | Deactivate pipeline |
| GET | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}/webhook` | Get webhook info |
| POST | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}/webhook/rotate` | Rotate secret |

### Events (nested in pipeline)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}/events` | Add event |
| PUT | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}/events/{event_name}` | Update event |
| DELETE | `/api/v1/projects/{project_id}/pipelines/{pipeline_id}/events/{event_name}` | Delete event |

### Features
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{project_id}/features` | List features |
| POST | `/api/v1/projects/{project_id}/features` | Create feature |
| GET | `/api/v1/projects/{project_id}/features/{feature_id}` | Get feature |
| PUT | `/api/v1/projects/{project_id}/features/{feature_id}` | Update feature |
| DELETE | `/api/v1/projects/{project_id}/features/{feature_id}` | Delete feature |

### Deployments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{project_id}/deployments` | List deployments |
| GET | `/api/v1/projects/{project_id}/deployments/pending` | Get pending changes |
| POST | `/api/v1/projects/{project_id}/deployments` | Deploy changes |
| POST | `/api/v1/projects/{project_id}/deployments/{id}/rollback` | Rollback |

### Ingestion (Runtime)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ingest/{project_id}/{pipeline_id}` | Ingest single event |
| POST | `/ingest/{project_id}/{pipeline_id}/batch` | Ingest batch events |

### Serving (Runtime)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/features/{project_id}/users/{user_id}` | Get user features |
| POST | `/features/{project_id}/users/batch` | Batch get features |

---

## Project Structure

```
backend/dataplatformservice/
├── docker-compose.yml           # MongoDB, Kafka, Aerospike, Redis, ClickHouse
├── SERVICES_PLAN.md             # This file
├── main.py                      # FastAPI entry point
├── requirements.txt             # Python dependencies
│
├── app/
│   ├── api/v1/
│   │   ├── pipelines.py         # Pipeline CRUD
│   │   ├── features.py          # Feature CRUD
│   │   └── deployments.py       # Deployment management
│   │
│   ├── core/
│   │   ├── config.py            # Settings
│   │   └── dependencies.py      # FastAPI dependencies
│   │
│   ├── db/
│   │   ├── mongodb.py           # MongoDB client
│   │   ├── aerospike.py         # Aerospike client
│   │   └── kafka.py             # Kafka producer
│   │
│   ├── schemas/                 # Pydantic schemas
│   │   ├── pipeline.py
│   │   ├── feature.py
│   │   └── deployment.py
│   │
│   └── services/                # Business logic
│       ├── pipeline_service.py
│       ├── feature_service.py
│       └── deployment_service.py
│
├── runtime/                     # Runtime services
│   ├── ingestion/
│   │   ├── main.py              # Event ingestion API
│   │   ├── validator.py         # Schema validation
│   │   └── producer.py          # Kafka producer
│   │
│   ├── compute/
│   │   ├── main.py              # Kafka consumer
│   │   ├── aggregators.py       # COUNT, SUM, AVG, etc.
│   │   └── aerospike_writer.py  # Write to Aerospike
│   │
│   └── serving/
│       ├── main.py              # Feature serving API
│       └── aerospike_reader.py  # Read from Aerospike
│
└── tests/
```

---

## Implementation Phases

### Phase 1: Core Setup
- [ ] FastAPI app with MongoDB connection (Motor)
- [ ] Basic config management
- [ ] Health check endpoints
- [ ] Docker compose with all services

### Phase 2: Pipeline API
- [ ] Pipeline CRUD with MongoDB
- [ ] Nested events/fields in documents
- [ ] Webhook secret generation
- [ ] Pipeline templates

### Phase 3: Feature API
- [ ] Feature definition CRUD
- [ ] Aggregation types
- [ ] Time window configuration

### Phase 4: Event Ingestion Runtime
- [ ] Webhook endpoint for events
- [ ] Schema validation against pipeline config
- [ ] Kafka producer
- [ ] Rate limiting with Redis

### Phase 5: Feature Compute Runtime
- [ ] Kafka consumer
- [ ] Aggregation computations
- [ ] Aerospike writer with TTL

### Phase 6: Feature Serving Runtime
- [ ] Feature API endpoint
- [ ] Aerospike reader
- [ ] Batch retrieval

### Phase 7: Deployment System
- [ ] Change tracking
- [ ] Deploy to activate config
- [ ] Rollback mechanism

