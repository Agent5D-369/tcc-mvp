import Link from "next/link";
import { redirect } from "next/navigation";
import { listAgentDefinitions } from "@workspace-kit/ai-core";
import { getSession, resolveMembershipByWorkspace } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { AgentLibraryCard } from "./agent-library-card";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export default async function AgentsSettingsPage({ params }: PageProps) {
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
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/settings/agents`);
  }

  const actorMembership = await resolveMembershipByWorkspace({
    userId: session.user.id,
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });
  const canManage = Boolean(actorMembership && ["owner", "admin"].includes(actorMembership.role));
  const agents = await listAgentDefinitions({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Agent library</div>
            <h2 className="section-title">Define Markdown agents for tenant workflows</h2>
          </div>
          <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/settings`}>
            Back to settings
          </Link>
        </div>
      </section>

      <section className="dashboard-grid">
        <AgentLibraryCard initialAgents={agents} canManage={canManage} />

        <aside className="stack">
          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Agent MD</div>
                <h2 className="section-title">Markdown as operating policy</h2>
              </div>
            </div>
            <p className="empty-note">
              Use plain Markdown to define role, behavior, constraints, and proposal format. TCC stores the prompt on the server and applies it when an agent is selected.
            </p>
          </section>

          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Surfaces</div>
                <h2 className="section-title">Choose where agents appear</h2>
              </div>
            </div>
            <p className="empty-note">
              Agents can be made available for capture extraction, threads, meetings, projects, tasks, and memory workflows.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
