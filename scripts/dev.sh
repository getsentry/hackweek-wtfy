#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting WTFY development environment...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating one from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file. Please fill in your environment variables.${NC}"
        echo -e "${YELLOW}📝 Make sure to set DATABASE_URL to your external PostgreSQL database.${NC}"
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

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL is not set in your .env file${NC}"
    echo -e "${YELLOW}📝 Please set DATABASE_URL to your PostgreSQL database connection string.${NC}"
    echo -e "${YELLOW}   Example: DATABASE_URL=\"postgresql://username:password@host:port/database\"${NC}"
    exit 1
fi

# Test database connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
if ! node -e "
    import pg from 'pg';
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT 1')
        .then(() => { console.log('✅ Database connection successful'); process.exit(0); })
        .catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });
" 2>/dev/null; then
    echo -e "${RED}❌ Could not connect to database. Please check your DATABASE_URL.${NC}"
    exit 1
fi

# Run database migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
if ! pnpm run db:push; then
    echo -e "${RED}❌ Database migration failed! Please check your database connection and schema.${NC}"
    exit 1
fi

echo -e "${GREEN}🌟 Starting Vite dev server with HMR...${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop the development server${NC}"

# Start Vite dev server (this will block until stopped)
pnpm exec vite dev
