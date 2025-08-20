#!/bin/bash
set -e

# Colors for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 Stopping WTFY development environment...${NC}"

# Stop and remove development containers
docker-compose -f docker-compose.dev.yml down

echo -e "${GREEN}✅ Development environment stopped!${NC}"
