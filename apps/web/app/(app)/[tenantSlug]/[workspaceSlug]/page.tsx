import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getWorkspaceHome } from "@workspace-kit/home";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { CreateProjectLauncher } from "./create-project-launcher";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

function getHealthBadgeClass(health: string) {
  switch (health) {
    case "green":
      return "badge badge-success";
    case "yellow":
      return "badge badge-warn";
    case "red":
      return "badge badge-danger";
    default:
      return "badge badge-neutral";
  }
}

export default async function WorkspaceHomePage({ params }: PageProps) {
  const session = await getSession();
  const route = await params;

  if (!session?.activeTenantId || !session.activeWorkspaceId) {
    throw new Error("Unauthorized");
  }

  const activeRoute = await getActiveWorkspaceRoute({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  if (!activeRoute) {
    throw new Error("Active workspace route not found");
  }

  if (activeRoute.tenantSlug !== route.tenantSlug || activeRoute.workspaceSlug !== route.workspaceSlug) {
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}`);
  }

  const data = await getWorkspaceHome({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  });

  return (
    <main className="page-shell app-page-shell">
      <section className="hero hero-compact">
        <div>
          <div className="kicker">Workspace home</div>
          <h1>Today&apos;s operating picture</h1>
          <p>
            {data.workspace.description || "Run active work, review risk, and move into the right project room with minimal friction."}
          </p>
          <div className="meta-row">
            <span className="badge badge-neutral">Tenant: {data.tenant.slug}</span>
            <span className="badge badge-neutral">Workspace: {route.workspaceSlug}</span>
          </div>
        </div>

        <div className="card">
          <h2>Command brief</h2>
          <p className="muted" style={{ marginTop: 0 }}>{data.commandBrief?.summary}</p>
          <ul className="list">
            {(data.commandBrief?.priorities ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <div className="metric-label">Active projects</div>
          <div className="metric-value">{data.metrics.activeProjects}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Open tasks</div>
          <div className="metric-value">{data.metrics.openTasks}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Overdue tasks</div>
          <div className="metric-value">{data.metrics.overdueTasks}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Logged decisions</div>
          <div className="metric-value">{data.metrics.decisionsLogged}</div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="kicker">Focus now</div>
            <h2 className="section-title">See what needs action first</h2>
          </div>
          <p className="empty-note">Start with work that needs a decision, a due date, or a project-room update right now.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <section className="card">
            <h2>Attention items</h2>
            {data.attentionItems.length ? (
              <ul className="list">
                {data.attentionItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="empty-note">No urgent attention items right now.</p>
            )}
          </section>

          <section className="card">
            <h2>Open tasks</h2>
            {data.openTasks.length ? (
              <ul className="list">
                {data.openTasks.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <div className="meta-row">
                      <span className="badge badge-neutral">{task.priority}</span>
                      {task.statusKind ? <span className="badge badge-neutral">{task.statusKind}</span> : null}
                    </div>
                    <div className="muted">
                      {task.projectName ? `${task.projectName} • ` : ""}
                      {task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No open tasks in this workspace.</p>
            )}
          </section>

          <section className="card">
            <h2>Active projects</h2>
            {data.activeProjects.length ? (
              <ul className="list">
                {data.activeProjects.map((project) => (
                  <li key={project.id}>
                    <div className="split">
                      <div>
                        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${project.slug}`}>
                          <strong>{project.name}</strong>
                        </Link>
                        <div className="muted">{project.openTaskCount} open actions</div>
                      </div>
                      <div className="meta-row">
                        <span className="badge badge-neutral">{project.status}</span>
                        <span className={getHealthBadgeClass(project.health)}>{project.health}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No active projects yet.</p>
            )}
          </section>
        </div>

        <aside className="stack">
          <CreateProjectLauncher tenantSlug={route.tenantSlug} workspaceSlug={route.workspaceSlug} />

          <section className="card">
            <h2>Recent decisions</h2>
            {data.recentDecisions.length ? (
              <ul className="list">
                {data.recentDecisions.map((decision) => (
                  <li key={decision.id}>
                    <strong>{decision.title}</strong>
                    <div className="muted">
                      {decision.projectName ? `${decision.projectName} • ` : ""}
                      {decision.decidedAt ? new Date(decision.decidedAt).toLocaleString() : "Awaiting decision date"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No decisions logged yet.</p>
            )}
          </section>

          <section className="card">
            <h2>Recent meetings</h2>
            {data.recentMeetings.length ? (
              <ul className="list">
                {data.recentMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <strong>{meeting.title}</strong>
                    <div className="muted">
                      {meeting.projectName ? `${meeting.projectName} • ` : ""}
                      {meeting.meetingAt ? new Date(meeting.meetingAt).toLocaleString() : "No date logged"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No meetings captured yet.</p>
            )}
          </section>
        </aside>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="kicker">Next step</div>
            <h2 className="section-title">Move into the right room</h2>
          </div>
          <p className="empty-note">Use Projects for structured tracking, Tasks for due work, and Meetings for recorded context.</p>
        </div>
      </section>
    </main>
  );
}
