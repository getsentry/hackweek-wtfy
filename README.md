# WTFY - "Was This Fixed Yet?" 🔍

> _Because debugging is hard enough without wondering if you're chasing ghosts from SDK versions past._

**WTFY** is an internal Sentry tool that answers the eternal developer question: "Was this bug I'm seeing fixed yet in a newer SDK version?"

## Features ✨

- 🤖 **AI-Powered Analysis** - Uses GPT-4 to analyze issue descriptions against GitHub commits and PRs
- ⚡ **Real-Time Progress** - See exactly what's happening during analysis with live progress updates
- 🔍 **Smart Search** - Keyword-based commit searching for precise results
- 📊 **Confidence Scoring** - Know how reliable the "fixed" vs "not fixed" determination is
- 📋 **Request History** - Quickly reuse and reference past analyses
- 🎨 **Beautiful UI** - Modern, responsive interface built with SvelteKit and Tailwind

## Quick Start 🚀

### Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
pnpm run db:push

# Start development server
pnpm run dev
```

### Production Deployment

See [deploy.md](./deploy.md) for complete deployment instructions including Docker, Railway, and Vercel options.

## Tech Stack 🛠️

- **Framework**: SvelteKit with Svelte 5 (runes syntax)
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: TailwindCSS + Tailwind Forms
- **AI**: OpenAI GPT-4 API
- **GitHub**: REST API for repository data
- **Monitoring**: Sentry SDK
- **Icons**: Lucide Svelte

## API Endpoints 📡

- `POST /api/analyze` - Analyze an issue against SDK versions
- `GET /api/progress/[requestId]` - Get real-time analysis progress
- `GET /api/history` - Get recent analysis history
- `GET /_health` - Health check endpoint

## Supported SDKs 📦

- JavaScript SDK (`sentry-javascript`)
- Python SDK (`sentry-python`)
- Java SDK (`sentry-java`)
- .NET SDK (`sentry-dotnet`)
- Go SDK (`sentry-go`)
- Ruby SDK (`sentry-ruby`)
- PHP SDK (`sentry-php`)
- React Native SDK (`sentry-react-native`)
- iOS/macOS SDK (`sentry-cocoa`)
- Android SDK (`sentry-android`)

## Development Commands 🔧

```bash
# Development
pnpm run dev              # Start dev server
pnpm run check            # Type checking
pnpm run lint             # Linting
pnpm run format           # Code formatting

# Database
pnpm run db:generate      # Generate migrations
pnpm run db:push          # Apply migrations
pnpm run db:studio        # Open Drizzle Studio

# Testing
pnpm run test             # Run all tests
pnpm run test:unit        # Unit tests only
pnpm run test:e2e         # E2E tests only

# Production
pnpm run build            # Build for production
pnpm run preview          # Preview production build
pnpm run start            # Start production server
```

## Contributing 🤝

1. **Fill out the form** with real issue descriptions
2. **Test different SDKs** and versions
3. **Report bugs** via GitHub issues
4. **Suggest improvements** for better analysis accuracy

---

**Made with ❤️ for the Sentry team**
