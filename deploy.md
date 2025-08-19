# WTFY Deployment Guide 🚀

## Quick Start with Docker

### 1. **Environment Setup**

Create a `.env` file:

```bash
# Database (use your hosted PostgreSQL provider - Railway, Supabase, etc.)
DATABASE_URL=postgresql://username:password@your-hosted-db:5432/wtfy

# Required API Keys
GITHUB_TOKEN=ghp_your_github_token_here
OPENAI_API_KEY=sk_your_openai_key_here

# Optional Configuration
MAX_REQUESTS_PER_HOUR=100
CACHE_TTL_HOURS=24
```

### 2. **Local Development**

```bash
# Set up your hosted database URL in .env
DATABASE_URL=postgresql://user:pass@your-hosted-db:5432/wtfy

# Run migrations against your hosted database
pnpm run db:push

# Start WTFY application (connects to hosted database)
docker-compose up

# Access WTFY at: http://localhost:3000
```

### 3. **Production Deployment**

```bash
# Build and run production
docker-compose -f docker-compose.yml up --build

# Or build manually
docker build -t wtfy .
docker run -p 3000:3000 --env-file .env wtfy
```

## Production Deployment Options

### **Option 1: Railway (Recommended)**

```bash
# Deploy to Railway
railway login
railway new

# Add PostgreSQL database
railway add postgresql

# Deploy the application
railway deploy
```

Environment variables to set:

- `GITHUB_TOKEN`
- `OPENAI_API_KEY`
- `DATABASE_URL` (auto-provided by Railway PostgreSQL)

**Note**: Railway automatically provides the `DATABASE_URL` when you add PostgreSQL.

### **Option 2: Vercel + Supabase**

```bash
# Deploy to Vercel
vercel --prod

# Database: Supabase PostgreSQL
# Set environment variables in Vercel dashboard
```

### **Option 3: Self-Hosted**

```bash
# Any Docker-compatible hosting
docker run -d \
  --name wtfy \
  -p 3000:3000 \
  -e DATABASE_URL="your-postgres-url" \
  -e GITHUB_TOKEN="your-token" \
  -e OPENAI_API_KEY="your-key" \
  wtfy:latest
```

## Health Checks

- **Health endpoint**: `GET /_health`
- **Returns**: `200 OK` with database connection status
- **Docker health check**: Built-in container health monitoring

## Database Migrations

```bash
# Generate migrations (after schema changes)
pnpm run db:generate

# Apply migrations to production
pnpm run db:push

# View database (development)
pnpm run db:studio
```

## Environment Variables

| Variable                | Required | Description                            |
| ----------------------- | -------- | -------------------------------------- |
| `DATABASE_URL`          | ✅       | PostgreSQL connection string           |
| `GITHUB_TOKEN`          | ✅       | GitHub API token with repo access      |
| `OPENAI_API_KEY`        | ✅       | OpenAI API key for GPT-4               |
| `MAX_REQUESTS_PER_HOUR` | ❌       | Rate limit (default: 100)              |
| `CACHE_TTL_HOURS`       | ❌       | Cache duration (default: 24)           |
| `PORT`                  | ❌       | Server port (default: 3000)            |
| `ORIGIN`                | ❌       | Server origin (default: auto-detected) |

## Monitoring

The app includes Sentry integration for error tracking:

- Automatic error reporting
- Performance monitoring
- Real-time alerts

---

**WTFY is ready for production deployment! 🎯**
