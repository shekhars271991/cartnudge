# CartNudge Data Platform Service

Real-time event ingestion, feature engineering, and ML training data platform.

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CARTNUDGE PLATFORM                                         │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐       │
│  │   Frontend (React) │         │  Identity Service  │         │ Data Platform Svc  │       │
│  │    Port: 5173      │◄───────►│    Port: 8000      │◄───────►│    Port: 8010      │       │
│  │                    │         │                    │         │                    │       │
│  │  • Dashboard       │         │  • Authentication  │         │  • Event Pipelines │       │
│  │  • Pipeline Config │         │  • User Management │         │  • Feature Store   │       │
│  │  • Feature Store   │         │  • Projects        │         │  • Deployments     │       │
│  │  • Integrations    │         │  • API Keys        │         │  • Event Ingestion │       │
│  └────────────────────┘         │  • Member Roles    │         │  • ML Training     │       │
│                                 └─────────┬──────────┘         └─────────┬──────────┘       │
│                                           │                              │                   │
│                                           │                              │                   │
│  ┌────────────────────────────────────────┴──────────────────────────────┴─────────────────┐│
│  │                                    MONGODB                                               ││
│  │                          (Configuration & Metadata Store)                                ││
│  │                                                                                          ││
│  │   Identity DB:                          │   DataPlatform DB:                             ││
│  │   • users                               │   • event_pipelines                            ││
│  │   • projects                            │   • features                                   ││
│  │   • api_keys                            │   • datablocks                                 ││
│  │   • invitations                         │   • deployments                                ││
│  └──────────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    EVENT INGESTION FLOW                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│   External Client                                                                            │
│        │                                                                                     │
│        │  POST /api/v1/events/ingest                                                         │
│        │  Header: X-API-Key: proj_{project_id}_{secret}                                      │
│        │                                                                                     │
│        ▼                                                                                     │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐                      │
│  │  Data Platform  │      │                 │      │                 │                      │
│  │     API         │─────►│     KAFKA       │─────►│   ClickHouse    │                      │
│  │                 │      │                 │      │                 │                      │
│  │  • Validate Key │      │  Topics:        │      │  • Raw Events   │                      │
│  │  • Validate     │      │  • cart_events  │      │  • Time-series  │                      │
│  │    Schema       │      │  • page_events  │      │  • Analytics    │                      │
│  │  • Route to     │      │  • order_events │      │                 │                      │
│  │    Topic        │      │  • user_events  │      │                 │                      │
│  └─────────────────┘      │  • custom_events│      └────────┬────────┘                      │
│                           └─────────────────┘               │                               │
│                                                             │                               │
│                           Feature Materializer              │                               │
│                           (Kafka Consumer)                  │                               │
│                                                             │                               │
│                                                             ▼                               │
│                                                   ┌─────────────────┐                       │
│                                                   │                 │                       │
│                                                   │   AEROSPIKE     │                       │
│                                                   │                 │                       │
│                                                   │  • User Features│                       │
│                                                   │  • Real-time    │                       │
│                                                   │  • Low Latency  │                       │
│                                                   │                 │                       │
│                                                   └────────┬────────┘                       │
│                           Feature Aggregator               │                               │
│                           (ClickHouse → Aerospike)         │                               │
│                                                             │                               │
│                                                             ▼                               │
│                                                   ┌─────────────────┐                       │
│   ML Models ◄────────────────────────────────────│  Feature API    │                       │
│   Inference                                       │  GET /features  │                       │
│                                                   │  /users/{id}    │                       │
│                                                   └─────────────────┘                       │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    RUNTIME SERVICES                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐│
│  │                              Feature Materializer                                        ││
│  │                              (runtime/ingestion/feature_materializer.py)                 ││
│  │                                                                                          ││
│  │   • Consumes events from Kafka (all topics)                                              ││
│  │   • Writes raw events to ClickHouse                                                      ││
│  │   • Batch processing for efficiency                                                      ││
│  │   • Health check endpoint: :8011                                                         ││
│  └─────────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐│
│  │                              Feature Aggregator                                          ││
│  │                              (runtime/jobs/feature_aggregation_job.py)                   ││
│  │                                                                                          ││
│  │   • Runs every 5 seconds (configurable)                                                  ││
│  │   • Queries ClickHouse for active users                                                  ││
│  │   • Computes aggregated features (counts, sums, avgs)                                    ││
│  │   • Writes to Aerospike with TTL                                                         ││
│  │   • Health check endpoint: :8012                                                         ││
│  └─────────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐│
│  │                              Training Data Generator                                     ││
│  │                              (runtime/jobs/training_data_generator.py)                   ││
│  │                                                                                          ││
│  │   • Generates ML training data daily                                                     ││
│  │   • Purchase propensity labels                                                           ││
│  │   • Computes feature snapshots at observation time                                       ││
│  │   • Stores in ClickHouse for model training                                              ││
│  │   • API trigger available: POST /training/generate                                       ││
│  └─────────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend (React) | 5173 | Web dashboard |
| Identity Service | 8000 | Auth, Users, Projects, API Keys |
| Data Platform API | 8010 | Pipelines, Features, Events, Deployments |
| Feature Materializer | 8011 | Kafka → ClickHouse consumer |
| Feature Aggregator | 8012 | ClickHouse → Aerospike job |
| Training Generator | 8013 | ML training data job |
| MongoDB | 27018 | Config metadata store |
| Kafka | 9092 | Event streaming |
| Kafka UI | 8084 | Dev tool for Kafka |
| ClickHouse | 8123 | Raw event storage |
| Aerospike | 3010 | Feature store (K/V) |

## Quick Start

```bash
# Start infrastructure services
docker compose up -d

# Wait for services to be ready
sleep 10

# Activate Python environment
source venv/bin/activate

# Start the API server
./run.sh
```

## API Key Format

API keys are generated by the Identity Service and follow this format:

```
proj_{project_id}_{secret}
```

Example:
```
proj_693aaf4df7c091f934f75483_C2waaUkmgJ-hShsoTF4JucNd7tEsTpw3JkE-F1ZA5LQ
```

The project ID is embedded in the key, allowing the Data Platform to route events without additional lookups.

## Event Ingestion

### Single Event

```bash
curl -X POST "http://localhost:8010/api/v1/events/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: proj_{project_id}_{secret}" \
  -d '{
    "event_type": "cart.add",
    "topic": "cart_events",
    "data": {
      "user_id": "user_123",
      "product_id": "prod_456",
      "quantity": 2,
      "price": 29.99
    }
  }'
```

### Batch Events

```bash
curl -X POST "http://localhost:8010/api/v1/events/ingest/batch" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: proj_{project_id}_{secret}" \
  -d '{
    "events": [
      {"event_type": "cart.add", "topic": "cart_events", "data": {...}},
      {"event_type": "page.view", "topic": "page_events", "data": {...}}
    ]
  }'
```

## Available Kafka Topics

| Topic | Description |
|-------|-------------|
| cart_events | Shopping cart actions (add, remove, update) |
| page_events | Page views, scroll depth, time on page |
| order_events | Order lifecycle (created, paid, shipped) |
| user_events | User profile updates, preferences |
| custom_events | Custom application events |

## Feature Store

### Get User Features

```bash
curl -X GET "http://localhost:8010/api/v1/features/users/{user_id}" \
  -H "X-API-Key: proj_{project_id}_{secret}"
```

### Response Example

```json
{
  "user_id": "user_123",
  "features": {
    "cart_adds_24h": 5,
    "cart_removes_24h": 1,
    "page_views_24h": 42,
    "total_cart_value": 149.95,
    "avg_session_duration": 320
  },
  "computed_at": "2025-01-01T12:00:00Z"
}
```

## Data Flow

```
┌──────────┐    ┌───────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
│  Client  │───►│  API  │───►│   Kafka    │───►│ClickHouse │───►│Aerospike │
│          │    │       │    │            │    │           │    │          │
│ Events   │    │Validate│   │ Partition  │    │ Raw Store │    │ Features │
└──────────┘    │ Route  │    │ by User   │    │ Analytics │    │ K/V      │
                └───────┘    └────────────┘    └───────────┘    └──────────┘
                                    │                │
                                    │                │
                              ┌─────┴─────┐    ┌─────┴─────┐
                              │Materializer│   │Aggregator │
                              │  Consumer  │    │   Job    │
                              └───────────┘    └───────────┘
```

## Project Structure

```
backend/dataplatformservice/
├── app/
│   ├── api/v1/           # API endpoints
│   │   ├── pipelines.py  # Pipeline CRUD & activation
│   │   ├── features.py   # Feature definitions & serving
│   │   ├── events.py     # Event ingestion
│   │   ├── deployments.py # Deployment management
│   │   └── training.py   # ML training data API
│   ├── core/             # Config, auth, dependencies
│   ├── db/               # Database connections
│   ├── schemas/          # Pydantic models
│   └── services/         # Business logic
├── runtime/
│   ├── ingestion/        # Kafka consumers
│   │   └── feature_materializer.py
│   └── jobs/             # Background jobs
│       ├── feature_aggregation_job.py
│       └── training_data_generator.py
├── data/
│   ├── event_topics.json      # Kafka topic config
│   ├── feature_definitions.json
│   └── clickhouse/init/       # ClickHouse schema
├── docker-compose.yml    # Infrastructure services
├── main.py               # FastAPI app
└── run.sh               # Dev startup script
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| MONGODB_URL | mongodb://... | MongoDB connection |
| KAFKA_BOOTSTRAP_SERVERS | localhost:9092 | Kafka brokers |
| CLICKHOUSE_HOST | localhost | ClickHouse host |
| CLICKHOUSE_PORT | 8123 | ClickHouse HTTP port |
| AEROSPIKE_HOSTS | localhost:3000 | Aerospike hosts |
| IDENTITY_SERVICE_URL | http://localhost:8000 | Identity service |

## Development

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Format code
ruff format .

# Lint
ruff check .
```

## API Documentation

- **Swagger UI**: http://localhost:8010/docs
- **ReDoc**: http://localhost:8010/redoc
- **Kafka UI**: http://localhost:8084 (dev tools profile)

