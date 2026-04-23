import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { getWorkspaceProjectsIndex } from "../workspace-screen-data";
import { CreateThreadCard } from "./create-thread-card";
import { getWorkspaceThreadsIndex } from "./thread-screen-data";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

function getThreadTypeLabel(threadType: string) {
  switch (threadType) {
    case "project":
      return "Project";
    case "meeting":
      return "Meeting";
    case "prompt_lab":
      return "Prompt lab";
    case "agent_run":
      return "Agent";
    default:
      return "General";
  }
}

export default async function ThreadsPage({ params }: PageProps) {
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
    throw new Error("Active workspace route not found");
  }

  if (activeRoute.tenantSlug !== route.tenantSlug || activeRoute.workspaceSlug !== route.workspaceSlug) {
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/threads`);
  }

  const [threads, projects] = await Promise.all([
    getWorkspaceThreadsIndex({
      tenantId: session.activeTenantId,
      workspaceId: session.activeWorkspaceId,
    }),
    getWorkspaceProjectsIndex({
      tenantId: session.activeTenantId,
      workspaceId: session.activeWorkspaceId,
    }),
  ]);

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Threads</div>
            <h2 className="section-title">Keep coordination focused and searchable</h2>
          </div>
          <p className="empty-note">Use threads for blockers, decisions-in-progress, and project coordination that needs more than a single record.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <section className="record-list">
            {threads.length ? (
              threads.map((thread) => (
                <article key={thread.id} className="record-card">
                  <div className="record-card-copy">
                    <div className="meta-row">
                      <strong>{thread.title}</strong>
                      <span className="badge badge-neutral">{getThreadTypeLabel(thread.threadType)}</span>
                      {thread.pinned ? <span className="badge badge-success">pinned</span> : null}
                    </div>
                    <div className="entity-summary-meta">
                      <span>{thread.projectName || "No linked project"}</span>
                      <span>{thread.messageCount} message{thread.messageCount === 1 ? "" : "s"}</span>
                      <span>{thread.updatedAt ? `Updated ${new Date(thread.updatedAt).toLocaleString()}` : "No activity yet"}</span>
                    </div>
                  </div>
                  <div className="record-card-actions">
                    <Link className="button-primary" href={`/${route.tenantSlug}/${route.workspaceSlug}/threads/${thread.id}`}>
                      Open thread
                    </Link>
                    {thread.projectSlug ? (
                      <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${thread.projectSlug}`}>
                        View project
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <section className="card">
                <h2>No coordination threads yet</h2>
                <p className="empty-note">Start the first thread when a blocker, decision, or discussion needs persistent context.</p>
              </section>
            )}
          </section>
        </div>

        <aside className="stack">
          <CreateThreadCard
            tenantSlug={route.tenantSlug}
            workspaceSlug={route.workspaceSlug}
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
              slug: project.slug,
            }))}
          />
        </aside>
      </section>
    </main>
  );
}
