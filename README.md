# QuickLaunch Team Command Center MVP

QuickLaunch is the Phase 1 foundation for Team Command Center: a multitenant execution workspace for teams that need a single place to capture communication, approve extracted work, and keep projects, tasks, meetings, decisions, and memory aligned.

## Phase 1 scope

- Shared-db multitenancy with tenant, workspace, and membership boundaries
- Command-center workspace home for priorities, risks, meetings, decisions, captures, approval queues, and compiled memory
- Project workspaces with milestones, next actions, decisions, and coordination context
- Demo workspace shape: manual communication dump-in, AI-ready extraction proposals, approval-first queues, and wiki-lite memory pages
- Capture Hub v0 for saving meeting transcripts, email threads, voice notes, copied chat summaries, and founder dumps as source-backed Interactions
- Extract Proposals v0 for turning a captured Interaction into pending approval items, with OpenRouter support and a deterministic fallback
- Approval Inbox v0 for approving or rejecting proposed tasks, decisions, memory items, and compiled-page revisions
- Auth.js sign-in with Google and controlled demo access
- Railway-ready deployment configuration for a single web service backed by PostgreSQL

The broader AI, knowledge, and conversation tables remain in the schema for later phases. The current MVP keeps the AI value narrow: capture messy meeting/email/voice/chat inputs, propose tasks/decisions/memory, and require human approval before anything becomes operating state.

## Stack

- Next.js 15
- React 19
- Auth.js v5
- Drizzle ORM
- PostgreSQL

## Required environment variables

Copy `.env.example` to `.env` and set the values you need.

```bash
DATABASE_URL=
AUTH_SECRET=
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_DEMO_EMAIL=demo@example.com
AUTH_DEMO_NAME=QuickLaunch Demo User
OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=openai/gpt-4.1-mini
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_X_TITLE=QuickLaunch Team Command Center
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`OPENROUTER_*` is optional for Phase 1 unless you actively use the conversation endpoints.

## Local setup

```bash
corepack enable
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Railway

This repo includes `railway.json` and `nixpacks.toml` so Railway can build and run the web app directly from the repo root.

Recommended Railway services for Phase 1:

1. Web service from this repo
2. PostgreSQL service

Optional later services:

1. Redis
2. Worker / cron jobs

## Seeded demo shape

The seed script creates:

- one demo tenant
- one operations workspace
- one demo workspace
- one active project for the original Phase 1 rollout
- one active project for the capture/approval/memory demo
- task statuses
- approval queues: Leadership, Hiring / Team, Ops
- a sample captured interaction
- pending task, decision, and compiled-page proposals
- six compiled memory page shells: Project Overview, Current Roles, Open Questions, Decisions, Hiring Needs, Ops SOPs
- milestones
- decisions
- meeting notes
- execution tasks

After seeding, the default demo route points to `/quicklaunch-demo/demo-command`.

## Notes

- The demo credentials flow is for controlled staging access. It is not a password system.
- Root routing redirects signed-in users to their active workspace when membership data is present.
- If you want to connect a Git remote, initialize the repo here and add your remote at this directory level so the research markdown in the parent folder stays out of the app repository.

