#!/bin/bash
cd "$(dirname "$0")"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}CartNudge Data Platform Service${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt

# Start Docker Compose services in detached mode
echo -e "${YELLOW}Starting Docker services (MongoDB, Kafka, Aerospike)...${NC}"
docker-compose up -d

# Start dev tools (Kafka UI, Mongo Express)
echo -e "${YELLOW}Starting dev tools (Kafka UI, Mongo Express)...${NC}"
docker-compose --profile tools up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check if we should run consumers
RUN_CONSUMERS=${RUN_CONSUMERS:-true}

if [ "$RUN_CONSUMERS" = "true" ]; then
    echo -e "${GREEN}Starting PersistData Consumer in background...${NC}"
    
    # Kill any existing consumer process
    pkill -f "persist_data_consumer" 2>/dev/null
    
    # Start the consumer in background with output redirected to log file
    nohup python -m runtime.ingestion.persist_data_consumer > logs/persist_data_consumer.log 2>&1 &
    CONSUMER_PID=$!
    echo -e "${GREEN}PersistData Consumer started (PID: $CONSUMER_PID)${NC}"
    echo -e "${YELLOW}Logs: logs/persist_data_consumer.log${NC}"
fi

echo ""
echo -e "${GREEN}Starting API Server...${NC}"
echo -e "${YELLOW}API Docs:      http://localhost:8010/docs${NC}"
echo -e "${YELLOW}Kafka UI:      http://localhost:8084${NC}"
echo -e "${YELLOW}Mongo Express: http://localhost:8083${NC}"
echo ""

# Run the FastAPI application with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8010
