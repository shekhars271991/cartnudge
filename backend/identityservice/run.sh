#!/bin/bash
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Docker Compose services in detached mode
docker-compose up -d

# Run the FastAPI application with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8001
