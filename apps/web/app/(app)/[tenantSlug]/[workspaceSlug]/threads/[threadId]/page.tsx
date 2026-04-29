import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { ThreadMessagePanel } from "../thread-message-panel";
import { getThreadOverview } from "../thread-screen-data";
import { ThreadManagementCard } from "../thread-management-card";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string; threadId: string }>;
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

export default async function ThreadDetailPage({ params }: PageProps) {
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
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/threads/${route.threadId}`);
  }

  const data = await getThreadOverview({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
    threadId: route.threadId,
  });

  return (
    <main className="page-shell app-page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}/threads`}>Threads</Link>
        <span>/</span>
        <span>{data.thread.title}</span>
      </div>

      <section className="hero hero-compact">
        <div>
          <div className="kicker">Coordination thread</div>
          <h1>{data.thread.title}</h1>
          <div className="meta-row">
            <span className="badge badge-neutral">{getThreadTypeLabel(data.thread.threadType)}</span>
            {data.thread.pinned ? <span className="badge badge-success">Pinned</span> : null}
          </div>
          <p>
            Keep this thread focused on one decision, blocker, or coordination stream so updates stay easy to scan later.
          </p>
          <div className="hero-actions">
            {data.thread.projectSlug ? (
              <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${data.thread.projectSlug}`}>
                Open linked project
              </Link>
            ) : null}
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/threads`}>
              Back to threads
            </Link>
          </div>
        </div>

        <div className="card">
          <h2>Thread frame</h2>
          <ul className="list">
            <li>
              <strong>Type</strong>
              <div className="muted">{getThreadTypeLabel(data.thread.threadType)}</div>
            </li>
            <li>
              <strong>Linked project</strong>
              <div className="muted">{data.thread.projectName || "No linked project"}</div>
            </li>
            <li>
              <strong>Agent</strong>
              <div className="muted">{data.thread.agentName || "No agent selected"}</div>
            </li>
            <li>
              <strong>Latest activity</strong>
              <div className="muted">{data.thread.updatedAt ? new Date(data.thread.updatedAt).toLocaleString() : "No activity yet"}</div>
            </li>
          </ul>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <ThreadMessagePanel threadId={data.thread.id} messages={data.messages} />
        </div>
        <aside className="stack">
          <ThreadManagementCard
            threadId={data.thread.id}
            tenantSlug={route.tenantSlug}
            workspaceSlug={route.workspaceSlug}
            initialTitle={data.thread.title}
            initialPinned={data.thread.pinned}
          />
        </aside>
      </section>
    </main>
  );
}
