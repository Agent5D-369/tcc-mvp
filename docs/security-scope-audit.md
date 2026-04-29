# Team Command Center Security Scope Audit

Last updated: 2026-04-28

## Current Boundary Model

- A signed-in user reaches app data through an active tenant and active workspace membership.
- Workspace routes resolve the current tenant/workspace by `tenantSlug`, `workspaceSlug`, and `userId`.
- Core work records are queried with tenant and workspace IDs: projects, tasks, meetings, task statuses, approvals, interactions, and compiled knowledge.
- Team access mutations are limited to the active workspace and require owner/admin permissions.
- Owner role changes have extra protection: non-owners cannot assign owners, owners cannot be removed casually, and the last owner is protected.

## What Shows Where

- Home, Projects, Tasks, Meetings, Threads, Capture, Approvals, and Knowledge show records for the active workspace.
- Settings shows the active workspace membership and the tenant workspace index. That index exposes sibling workspace names and counts inside the same tenant, but it does not mix sibling workspace tasks, meetings, decisions, projects, approvals, or memory into the current workspace views.
- The header workspace selector shows only workspaces where the current user has membership.
- Member management shows only members of the active workspace.

## Current Safeguards

- Unauthenticated users redirect to sign-in.
- Users without an active tenant/workspace redirect to onboarding.
- Workspace settings redirects to the active workspace route instead of rendering arbitrary typed routes.
- Workspace rename/edit is restricted to owner/admin and only for the active workspace.
- Team member add/update/remove is restricted to owner/admin with owner-specific protections.
- Tenant and workspace deletion is not exposed in the UI.

## Known Gaps Before Production Signup

- Subscription workspace limits are not enforced yet. The next subscription layer should store a plan/workspace limit and enforce it inside workspace creation.
- Signup should create exactly one tenant and one initial workspace for a new user. The current demo/bootstrap helper can auto-place a no-membership user into an existing first workspace and should be retired or restricted to demo-only code before open signup.
- Tenant/workspace deletion needs a soft-delete/archive model, export path, typed confirmation, last-owner checks, billing/subscription checks, and audit log entries before it is exposed.
- Audit logs are not yet surfaced for membership, workspace, tenant, or AI actions.
- Tenant workspace index visibility should become a tenant policy: either visible to all tenant members or restricted to owner/admin.

## Subscription Direction

- Free/pilot: one tenant, one workspace.
- Team: one tenant, limited workspace count based on subscription.
- Growth/enterprise: higher workspace limit, tenant policy controls, and advanced audit/export controls.
- Workspace creation should check the current tenant plan before inserting a workspace.

## AI, Multimodel, and Agent MD Direction

- Mobile and desktop should call the same server-owned AI routes. The browser should never hold provider keys or choose unsafe direct provider access.
- OpenRouter remains the first multimodel adapter. Add provider/model policy controls per tenant/workspace before exposing model choice broadly.
- Agent MD should be a versioned server-side library of markdown agent definitions with metadata for scope, allowed roles, model policy, input schema, and approval behavior.
- Desktop can show a split view: source material, selected agent, output, and approval inbox.
- Mobile should use the existing bottom navigation and sheet pattern: choose an agent, run against selected source, then review proposals in compact approval cards.
- AI outputs should create proposals first. Tasks, decisions, compiled pages, and memory writes stay approval-first.
- Model usage events should keep tenant, workspace, thread, agent, provider, model, token, and cost context for billing and governance.
