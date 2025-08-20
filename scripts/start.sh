#!/bin/sh
set -e

echo "🚀 Starting WTFY with embedded PostgreSQL..."

# Set environment variables for local PostgreSQL
export DATABASE_URL="postgresql://wtfy:wtfy_password@localhost:5432/wtfy"

# Initialize PostgreSQL if not already done
if [ ! -d "/var/lib/postgresql/data/base" ]; then
    echo "📊 Initializing PostgreSQL database..."
    su-exec postgres initdb -D /var/lib/postgresql/data
    
    # Configure PostgreSQL
    echo "host all all 127.0.0.1/32 md5" >> /var/lib/postgresql/data/pg_hba.conf
    echo "listen_addresses = 'localhost'" >> /var/lib/postgresql/data/postgresql.conf
    echo "port = 5432" >> /var/lib/postgresql/data/postgresql.conf
    echo "max_connections = 20" >> /var/lib/postgresql/data/postgresql.conf
    echo "shared_buffers = 128MB" >> /var/lib/postgresql/data/postgresql.conf
fi

# Start PostgreSQL in background
echo "🔌 Starting PostgreSQL..."
su-exec postgres postgres -D /var/lib/postgresql/data &
POSTGRES_PID=$!

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
    if su-exec postgres pg_isready -q; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 1
done

# Create database and user if they don't exist
echo "🗄️ Setting up WTFY database..."
su-exec postgres psql -c "CREATE USER wtfy WITH PASSWORD 'wtfy_password';" 2>/dev/null || true
su-exec postgres psql -c "CREATE DATABASE wtfy OWNER wtfy;" 2>/dev/null || true
su-exec postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wtfy TO wtfy;" 2>/dev/null || true

# Run database migrations
echo "🔄 Running database migrations..."
cd /app

# Push schema changes to database (this reads schema.ts directly)
echo "📋 Applying schema changes..."
if ! pnpm run db:push; then
    echo "❌ Database migration failed! Check schema file and database connection."
    echo "📂 Checking if schema file exists..."
    ls -la src/lib/server/db/schema.ts 2>/dev/null || echo "❌ Schema file not found!"
    echo "🔗 Testing database connection..."
    su-exec postgres psql "$DATABASE_URL" -c "SELECT 1;" 2>/dev/null || echo "❌ Database connection failed!"
    exit 1
fi

echo "✅ Database migrations completed successfully!"

# Start the Node.js application
echo "🌟 Starting WTFY application..."
exec pnpm start
