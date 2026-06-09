# opensource.manager

A local-first open source project management suite with three tools:

- **Project Dashboard** — stats, repos, issues at a glance
- **Releasify** — AI-powered changelog generator from commits
- **Agent Sandbox** — local AI agent with shell, web, file, and email access

## Local Setup (Depreciated)

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

## Visit Live website (Powered by Vercel)
Vist the live website here:

```website
https://opensource-manager.vercel.app/
```

## Agent Sandbox

The Agent Sandbox lets you give the AI natural language tasks. It can:

- Run shell commands in a sandboxed directory
- Read and write files to `/storage` (configurable via `AGENT_STORAGE_DIR`)
- Search the web
- Fetch URLs
- (coming) Send and read email via SMTP/IMAP
- Full Docker + Xvfb live screen via noVNC

The live screen view currently shows simulated terminal output. To enable real Docker + Xvfb screen streaming, see `docs/docker-sandbox.md` (coming soon).

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Puter.js for ai


## Roadmap

- [x] Real GitHub OAuth + live repo data
- [x] Docker sandbox with Xvfb + noVNC screen streaming
- [ ] Email tool (SMTP + IMAP)
- [x] Releasify: publish changelog to public URL
- [x] Releasify: auto-post to Slack / Discord
- [ ] Contributor leaderboard
- [ ] Roadmap board tied to GitHub milestones
# opensouce-manager
