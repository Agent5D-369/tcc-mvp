# Amora Command Center Lite

## MVP wedge

Amora is the first narrow pilot for Team Command Center. The product should behave like a communications-to-clarity machine:

1. paste messy communication into one capture surface
2. extract summary, tasks, decisions, open questions, owners, and memory proposals
3. route proposals into a small approval inbox
4. approve/edit/reject before anything writes to the operating system
5. keep a compact living project brain up to date from approved evidence

## First rollout features

- Manual capture for Read AI/Otter notes, forwarded email text, voice-to-text notes, and copied chat summaries
- Interactions as the normalized source record
- Approval queues limited to Leadership, Hiring / Team, and Ops
- Proposals for tasks, decisions, memory items, open questions, and compiled page revisions
- Dashboard cards for pending approvals, recent captures, queue load, recent decisions, meetings, and compiled memory
- Wiki-lite pages: Project Overview, Current Roles, Open Questions, Decisions, Hiring Needs, Ops SOPs

## Deliberate non-goals

- Full Notion workspace rollout
- Custom CRM
- Full multi-project operating system
- OAuth mailbox connections
- Slack/Telegram automation
- Advanced vector retrieval over every raw source
- Client-facing multi-agent lab
- Deep automation or auto-write behavior
- Complex permissions beyond the existing tenant/workspace membership model

## Current implementation state

The repo now includes the schema spine needed for the pilot:

- `queues`
- `interactions`
- `proposals`
- `compiled_pages`
- `compiled_page_revisions`

The seed script creates an Amora pilot workspace, three queues, one sample captured interaction, pending proposals, and six compiled page shells. The workspace home payload and UI surface this data so the next implementation pass can add the actual Capture Hub and Approval Inbox screens.

## Current implementation state update

Capture Hub v0 is live in the app at:

- `/quicklaunch-demo/amora-command/capture`

It saves pasted communication as an `interactions` row with project routing, queue routing, raw source text, source kind metadata, and a short summary placeholder. Extraction and approval are intentionally still separate next steps.

Extract Proposals v0 is also wired from the Capture Hub success state. It creates pending `proposals` from the captured `interaction`, using OpenRouter when `OPENROUTER_API_KEY` is configured and falling back to a deterministic proposal set when AI is unavailable.

Approval Inbox v0 is live in the app at:

- `/quicklaunch-demo/amora-command/approvals`

It groups pending proposals by queue and supports approve/reject. Approved task proposals write to `tasks`, decisions write to `decision_log`, compiled-page updates create `compiled_page_revisions`, and questions/memory-style proposals write to `memory_items`.
