# opensource.manager

A local-first open source project management suite with three tools:

- **Project Dashboard** — stats, repos, issues at a glance
- **Releasify** — AI-powered changelog generator from commits
- **Agent Sandbox** — local AI agent with shell, web, file, and email access

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local if needed and ensure Ollama is installed locally or available to the app

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Agent Sandbox

The Agent Sandbox lets you give the AI natural language tasks. It can:

- Run shell commands in a sandboxed directory
- Read and write files to `/storage` (configurable via `AGENT_STORAGE_DIR`)
- Search the web
- Fetch URLs
- (coming) Send and read email via SMTP/IMAP
- (coming) Full Docker + Xvfb live screen via noVNC

The live screen view currently shows simulated terminal output. To enable real Docker + Xvfb screen streaming, see `docs/docker-sandbox.md` (coming soon).

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Ollama (local or cloud models)
- Lucide React icons

## Roadmap

- [ ] Real GitHub OAuth + live repo data
- [ ] Docker sandbox with Xvfb + noVNC screen streaming
- [ ] Email tool (SMTP + IMAP)
- [ ] Releasify: publish changelog to public URL
- [ ] Releasify: auto-post to Slack / Discord
- [ ] Contributor leaderboard
- [ ] Roadmap board tied to GitHub milestones
# opensouce-manager
