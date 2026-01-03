# RepoX

> Transform any GitHub repository into an interactive learning experience.

**Live Demo:** [https://main.repox.pages.dev](https://main.repox.pages.dev)

## Features

- **Repository Visualization** - Interactive D3.js graph showing file structure and relationships
- **AI-Powered Explanations** - Get explanations for any file using Gemini AI (with ELI5 mode)
- **Learning Path Generation** - AI generates personalized learning paths for any codebase
- **Progress Tracking** - Track your learning progress with interactive checklists
- **Trending Repos** - Discover trending repositories from the week
- **Repo History** - Quick access to recently explored repositories

## Tech Stack

- **Frontend:** TypeScript, Vite, D3.js
- **AI:** Google Gemini API (via Cloudflare Worker)
- **Hosting:** Cloudflare Pages + Workers
- **APIs:** GitHub REST API, OSS Insight API

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js)
- Cloudflare account (for deployment)
- Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/repox.git
cd repox

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Start frontend dev server
bun run dev

# Start worker locally (in another terminal)
cd worker
bun run dev
```

### Deployment

```bash
# Build frontend
bun run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=repox

# Deploy worker
cd worker
npx wrangler deploy
```

## Environment Variables

### Frontend (.env)

```
VITE_WORKER_URL=https://your-worker.workers.dev
```

### Worker (wrangler.toml secret)

```bash
npx wrangler secret put GEMINI_API_KEY
```

## Project Structure

```
repox/
├── src/
│   ├── main.ts           # Main application entry
│   ├── style.css         # Base/global styles
│   ├── app.css           # Component styles
│   ├── components/       # UI components (FileTree, Graph)
│   ├── services/         # API services (GitHub, Gemini)
│   ├── state/            # State management
│   └── types/            # TypeScript type definitions
├── worker/               # Cloudflare Worker (Gemini API proxy)
├── public/               # Static assets
├── dist/                 # Production build output
├── index.html            # HTML entry point
└── package.json
```

## License

MIT

---

Built for **Hacks for Hackers 2026** | Powered by Gemini, Cloudflare
