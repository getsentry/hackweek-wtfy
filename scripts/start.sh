#!/bin/sh
set -e

echo "🚀 Starting WTFY application..."

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is required"
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
cd /app

# Push schema changes to database
echo "📋 Applying schema changes..."
if ! pnpm run db:push --force; then
    echo "❌ Database migration failed! Check schema file and database connection."
    echo "📂 Checking if schema file exists..."
    ls -la src/lib/server/db/schema.ts 2>/dev/null || echo "❌ Schema file not found!"
    echo "🔗 Testing database connection..."
    node -e "
        import pg from 'pg';
        const { Pool } = pg;
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT 1')
            .then(() => { console.log('✅ Database connection successful'); process.exit(0); })
            .catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });
    " 2>/dev/null || echo "❌ Database connection test failed!"
    exit 1
fi

echo "✅ Database migrations completed successfully!"

# Start the Node.js application
echo "🌟 Starting WTFY application..."
exec node ./build/index.js