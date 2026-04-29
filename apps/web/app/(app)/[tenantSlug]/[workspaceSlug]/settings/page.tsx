import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getWorkspaceLimitForPlan, listWorkspaceMembers } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { ThemeControl } from "../../../../theme-control";
import { CreateTenantCard } from "./create-tenant-card";
import { CreateWorkspaceCard } from "./create-workspace-card";
import { WorkspaceSettingsCard } from "./workspace-settings-card";
import { WorkspaceMembersCard } from "./workspace-members-card";
import { getTenantWorkspaceIndex, getWorkspaceShellData } from "../workspace-screen-data";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export default async function SettingsPage({ params }: PageProps) {
  const session = await getSession();
  const route = await params;

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (!session.activeTenantId || !session.activeWorkspaceId) {
    redirect("/onboarding");
  }

  const activeRoute = await getActiveWorkspaceRoute({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  if (!activeRoute) {
    redirect("/onboarding");
  }

  if (activeRoute.tenantSlug !== route.tenantSlug || activeRoute.workspaceSlug !== route.workspaceSlug) {
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/settings`);
  }

  const shell = await getWorkspaceShellData({
    userId: session.user.id,
    tenantSlug: route.tenantSlug,
    workspaceSlug: route.workspaceSlug,
  });
  const tenantWorkspaces = await getTenantWorkspaceIndex({
    tenantId: shell.currentWorkspace.tenantId,
  });
  const members = await listWorkspaceMembers({
    tenantId: shell.currentWorkspace.tenantId,
    workspaceId: shell.currentWorkspace.workspaceId,
  });
  const canManage = ["owner", "admin"].includes(shell.currentWorkspace.role);
  const roleLabel = shell.currentWorkspace.role.slice(0, 1).toUpperCase() + shell.currentWorkspace.role.slice(1);
  const workspaceLimit = getWorkspaceLimitForPlan(shell.currentWorkspace.tenantPlan);
  const workspaceCount = tenantWorkspaces.length;

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Settings</div>
            <h2 className="section-title">Control access and workspace structure</h2>
          </div>
          <p className="empty-note">This screen is for tenant and workspace setup. Keep the structure simple and permissions explicit.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Current access</div>
                <h2 className="section-title">{shell.currentWorkspace.tenantName} / {shell.currentWorkspace.workspaceName}</h2>
              </div>
              <span className={shell.currentWorkspace.role === "owner" ? "badge badge-success" : "badge badge-neutral"}>
                Role: {roleLabel}
              </span>
            </div>

            <div className="list">
              <div className="list-row">
                <strong>Workspace description</strong>
                <div className="muted">{shell.currentWorkspace.workspaceDescription || "No workspace description yet."}</div>
              </div>
            <div className="list-row">
                <strong>Accessible contexts</strong>
                <div className="muted">{shell.contexts.length} workspace access path{shell.contexts.length === 1 ? "" : "s"}</div>
              </div>
              <div className="list-row">
                <strong>Account type</strong>
                <div className="muted">{session.isPlatformAdmin ? "Platform admin" : "Standard member account"}</div>
              </div>
              <div className="list-row">
                <strong>Plan limit</strong>
                <div className="muted">
                  {shell.currentWorkspace.tenantPlan} plan: {workspaceCount} of {workspaceLimit} workspace{workspaceLimit === 1 ? "" : "s"} used
                </div>
              </div>
              <div className="list-row">
                <strong>Scope guardrail</strong>
                <div className="muted">Records on this route are loaded through your membership in this tenant and this workspace.</div>
              </div>
            </div>
          </section>

          <WorkspaceSettingsCard
            workspaceId={shell.currentWorkspace.workspaceId}
            workspaceName={shell.currentWorkspace.workspaceName}
            workspaceDescription={shell.currentWorkspace.workspaceDescription}
            canManage={canManage}
          />

          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Tenant workspaces</div>
                <h2 className="section-title">Review how the tenant is divided</h2>
              </div>
              <p className="empty-note">Switch workspaces from the header selector. Use new workspaces only when the work needs a separate operating surface.</p>
            </div>

            <div className="admin-record-list">
              {tenantWorkspaces.map((workspace) => (
                <article key={workspace.id} className="record-card compact-record-card">
                  <div className="record-card-copy">
                    <div className="meta-row">
                      <strong>{workspace.name}</strong>
                      {workspace.slug === route.workspaceSlug ? <span className="badge badge-success">current</span> : null}
                      <span className="badge badge-neutral">{workspace.visibility}</span>
                    </div>
                    <p className="entity-preview">{workspace.description || "No workspace description yet."}</p>
                    <div className="entity-summary-meta">
                      <span>{workspace.memberCount} member{workspace.memberCount === 1 ? "" : "s"}</span>
                      <span>{workspace.projectCount} project{workspace.projectCount === 1 ? "" : "s"}</span>
                    </div>
                    {workspace.slug === route.workspaceSlug ? (
                      <p className="entity-preview">You are viewing this workspace. Tasks, meetings, decisions, projects, approvals, and memory stay scoped here unless explicitly copied elsewhere.</p>
                    ) : (
                      <p className="entity-preview">Listed as tenant structure only. Open work from this workspace is not mixed into the current workspace views.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <WorkspaceMembersCard
            members={members.map((member) => ({
              ...member,
              joinedAt: member.joinedAt.toISOString(),
            }))}
            currentUserId={session.user.id}
            canManage={canManage}
            currentUserRole={shell.currentWorkspace.role}
          />
        </div>

        <aside className="stack">
          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Appearance</div>
                <h2 className="section-title">Choose a workspace theme</h2>
              </div>
            </div>
            <p className="empty-note">
              Pick a full interface theme. Your choice is saved for this browser and applied before the app renders.
            </p>
            <ThemeControl />
          </section>
          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">AI control</div>
                <h2 className="section-title">Models, keys, and budget</h2>
              </div>
            </div>
            <p className="empty-note">
              Choose QuickLaunch-managed AI or bring a tenant-owned OpenRouter key. Keep agent costs capped before broad rollout.
            </p>
            <Link className="button-primary" href={`/${route.tenantSlug}/${route.workspaceSlug}/settings/ai`}>
              Open AI settings
            </Link>
          </section>
          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Agent MD</div>
                <h2 className="section-title">Agent library</h2>
              </div>
            </div>
            <p className="empty-note">
              Create Markdown agents and choose where they can help: capture, threads, projects, tasks, meetings, and memory.
            </p>
            <Link className="button-primary" href={`/${route.tenantSlug}/${route.workspaceSlug}/settings/agents`}>
              Open agent library
            </Link>
          </section>
          <CreateWorkspaceCard
            canManage={canManage}
            workspaceCount={workspaceCount}
            workspaceLimit={workspaceLimit}
            tenantPlan={shell.currentWorkspace.tenantPlan}
          />
          <CreateTenantCard canCreateTenant={session.isPlatformAdmin} />
          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Guardrails</div>
                <h2 className="section-title">Deletion is locked for now</h2>
              </div>
            </div>
            <p className="empty-note">
              Tenant and workspace deletion is intentionally not exposed in the MVP. Add archive, export, last-owner checks,
              audit logging, and typed confirmation before destructive controls go live.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
