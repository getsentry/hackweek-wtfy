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

# GitHub OAuth (for authentication)
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
JWT_SECRET=your_random_jwt_secret_string

# Optional Configuration
MAX_REQUESTS_PER_HOUR=100
CACHE_TTL_HOURS=24
```

### GitHub OAuth App Setup

Before deploying, you need to create a GitHub OAuth App:

1. **Go to GitHub Settings** → **Developer settings** → **OAuth Apps**
2. **Click "New OAuth App"**
3. **Configure the app**:
   - **Application name**: `WTFY - Sentry Internal Tool`
   - **Homepage URL**: `https://your-wtfy-domain.com`
   - **Authorization callback URL**: `https://your-wtfy-domain.com/auth/callback`
4. **Copy Client ID and Client Secret** to your environment variables

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
# Recommended: Use docker-compose (reads .env automatically)
docker-compose up --build

# Or build manually with build args (needed for Northflank/CI)
docker build -t wtfy \
  --build-arg DATABASE_URL="your-database-url" \
  --build-arg GITHUB_TOKEN="your-token" \
  --build-arg OPENAI_API_KEY="your-key" \
  .

# Then run with runtime env vars
docker run -p 3000:3000 --env-file .env wtfy

# Or build from .env file
docker build -t wtfy \
  --build-arg DATABASE_URL="$(grep DATABASE_URL .env | cut -d '=' -f2)" \
  --build-arg GITHUB_TOKEN="$(grep GITHUB_TOKEN .env | cut -d '=' -f2)" \
  --build-arg OPENAI_API_KEY="$(grep OPENAI_API_KEY .env | cut -d '=' -f2)" \
  .
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
# Build the image
docker build -t wtfy .

# Run with environment file
docker run -d \
  --name wtfy \
  -p 3000:3000 \
  --env-file .env \
  wtfy

# Or run with explicit environment variables
docker run -d \
  --name wtfy \
  -p 3000:3000 \
  -e DATABASE_URL="your-postgres-url" \
  -e GITHUB_TOKEN="your-token" \
  -e OPENAI_API_KEY="your-key" \
  wtfy
```

## Troubleshooting

### "DATABASE_URL environment variable is required" during build

The build process needs environment variables. Use build arguments:

```bash
# ✅ Correct: Pass build args during build
docker build -t wtfy \
  --build-arg DATABASE_URL="your-database-url" \
  --build-arg GITHUB_TOKEN="your-token" \
  --build-arg OPENAI_API_KEY="your-key" \
  .

# ❌ Wrong: Missing build args
docker build -t wtfy .
```

### "DATABASE_URL environment variable is required" during runtime

Make sure you're passing runtime environment variables correctly:

```bash
# ✅ Correct: Use docker-compose (reads .env automatically)
docker-compose up

# ✅ Correct: Use --env-file flag
docker run -p 3000:3000 --env-file .env wtfy

# ❌ Wrong: Missing runtime environment variables
docker run -p 3000:3000 wtfy
```

### For Northflank Deployment:

1. **Build Settings**: Add these as **build arguments** in Northflank:
   - `DATABASE_URL` = your hosted database connection string
   - `GITHUB_TOKEN` = your GitHub token
   - `OPENAI_API_KEY` = your OpenAI key
   - `GITHUB_CLIENT_ID` = your GitHub OAuth app client ID
   - `GITHUB_CLIENT_SECRET` = your GitHub OAuth app client secret
   - `JWT_SECRET` = random secret for JWT sessions
2. **Runtime Variables**: Set the same variables as **runtime environment variables**
3. **Both required**: Build args for `pnpm run build`, env vars for `pnpm start`

### Check your .env file format:

```bash
# Ensure no quotes around values in .env file
DATABASE_URL=postgresql://user:pass@host:5432/wtfy
GITHUB_TOKEN=ghp_your_token_here
OPENAI_API_KEY=sk_your_key_here
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
