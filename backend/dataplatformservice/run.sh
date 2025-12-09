#!/bin/bash
cd "$(dirname "$0")"

# Start dependencies
docker-compose up -d

# Run the service with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
