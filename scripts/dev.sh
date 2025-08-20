#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting WTFY development environment...${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up development environment...${NC}"
    docker-compose -f docker-compose.dev.yml down
    exit 0
}

# Set up cleanup trap
trap cleanup INT TERM

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating one from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file. Please fill in your environment variables.${NC}"
    else
        echo -e "${RED}❌ No .env.example file found. Please create a .env file with your environment variables.${NC}"
        exit 1
    fi
fi

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo -e "${BLUE}📝 Loading environment variables from .env...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# Start PostgreSQL container
echo -e "${BLUE}🐘 Starting PostgreSQL container...${NC}"
docker-compose -f docker-compose.dev.yml up -d postgres-dev

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5  # Give container time to start

for i in {1..20}; do
    # Simple check: try to connect to PostgreSQL from inside the container
    if docker-compose -f docker-compose.dev.yml exec -T postgres-dev pg_isready -h localhost -p 5432 -U wtfy > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready inside container!${NC}"
        
        # Give it a moment more for external port mapping
        sleep 2
        echo -e "${BLUE}🔍 Testing external connection...${NC}"
        
        # Test external port accessibility with a simple telnet-style check
        if command -v nc >/dev/null 2>&1 && nc -z localhost 5433 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL is accessible from host!${NC}"
            break
        else
            echo "   External connection test failed... ($i/20)"
        fi
    else
        echo "   PostgreSQL not ready... ($i/20)"
    fi
    sleep 3
    
    if [ $i -eq 20 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start within 60 seconds${NC}"
        echo -e "${RED}   Checking container status and logs:${NC}"
        docker-compose -f docker-compose.dev.yml ps postgres-dev
        docker-compose -f docker-compose.dev.yml logs postgres-dev
        cleanup
        exit 1
    fi
done

# Run database migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
pnpm run db:push

echo -e "${GREEN}🌟 Starting Vite dev server with HMR...${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop the development environment${NC}"

# Start Vite dev server (this will block until stopped)
pnpm exec vite dev
