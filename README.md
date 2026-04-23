# QuickLaunch Team Command Center MVP

QuickLaunch is the Phase 1 foundation for Team Command Center: a multitenant execution workspace for teams that need a single place to run projects, tasks, meetings, and decisions.

## Phase 1 scope

- Shared-db multitenancy with tenant, workspace, and membership boundaries
- Command-center workspace home for priorities, risks, meetings, and decisions
- Project workspaces with milestones, next actions, decisions, and coordination context
- Auth.js sign-in with Google and controlled demo access
- Railway-ready deployment configuration for a single web service backed by PostgreSQL

The broader AI, knowledge, and conversation tables remain in the schema for later phases, but the runnable product is no longer positioned as an AI-first workspace.

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
NEXTAUTH_URL=http://localhost:3000
AUTH_AUTO_PROVISION_MEMBERSHIPS=false
AUTH_PLATFORM_ADMIN_EMAILS=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_DEMO_EMAIL=demo@example.com
AUTH_DEMO_NAME=QuickLaunch Demo User
DEMO_MODE=false
OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=openai/gpt-4.1-mini
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_X_TITLE=QuickLaunch Team Command Center
```

`OPENROUTER_*` is optional for Phase 1 unless you actively use the conversation endpoints.
Set `DEMO_MODE=true` if you want to bypass sign-in and open the first seeded workspace directly.

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

Recommended Railway web variables:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=replace-with-a-long-random-string
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://your-service.up.railway.app
AUTH_AUTO_PROVISION_MEMBERSHIPS=false
AUTH_PLATFORM_ADMIN_EMAILS=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_DEMO_EMAIL=demo@example.com
AUTH_DEMO_NAME=QuickLaunch Demo User
DEMO_MODE=false
```

Optional later services:

1. Redis
2. Worker / cron jobs

## Seeded demo shape

The seed script creates:

- one demo tenant
- one operations workspace
- one active project
- task statuses
- milestones
- decisions
- meeting notes
- execution tasks

## Notes

- The demo credentials flow is for controlled staging access. It is not a password system.
- `AUTH_PLATFORM_ADMIN_EMAILS` is a comma-separated allowlist for operator accounts that must always be able to sign in and bootstrap tenants/workspaces even before normal member access exists.
- Railway deploys now run migrations only. Seed data should be run intentionally, not on every deploy.
- Google sign-in no longer auto-creates owner memberships by default. Set `AUTH_AUTO_PROVISION_MEMBERSHIPS=true` only for controlled onboarding flows.
- Root routing redirects signed-in users to their active workspace when membership data is present.
- If you want to connect a Git remote, initialize the repo here and add your remote at this directory level so the research markdown in the parent folder stays out of the app repository.
