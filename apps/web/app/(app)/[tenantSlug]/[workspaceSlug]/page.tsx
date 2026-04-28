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
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}`);
  }

  const data = await getWorkspaceHome({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  });
  const taskBaseHref = `/${route.tenantSlug}/${route.workspaceSlug}/tasks`;

  return (
    <main className="page-shell app-page-shell">
      <section className="hero hero-compact">
        <div>
          <div className="kicker">Workspace home</div>
          <h1>Know what needs action next</h1>
          <p>
            {data.workspace.description || "Move from review to action quickly, without sorting through every project and record first."}
          </p>
          <div className="meta-row">
            <span className="badge badge-neutral">Tenant: {data.tenant.slug}</span>
            <span className="badge badge-neutral">Workspace: {route.workspaceSlug}</span>
          </div>
          <div className="hero-actions">
            <Link className="button-primary" href={data.metrics.blockedTasks > 0 ? `${taskBaseHref}?filter=blocked` : taskBaseHref}>
              {data.metrics.blockedTasks > 0 ? "Review blocked work" : "Review open tasks"}
            </Link>
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/projects`}>
              Open project rooms
            </Link>
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
            <h2 className="section-title">Start with the right queue</h2>
          </div>
          <p className="empty-note">Choose one lane, clear it, then move into a project room only when deeper context is required.</p>
        </div>
      </section>

      <section className="triage-grid">
        <Link className="triage-card" href={`${taskBaseHref}?filter=blocked`}>
          <span className="metric-label">Blocked</span>
          <strong>{data.metrics.blockedTasks}</strong>
          <span className="muted">Resolve stalled work first.</span>
        </Link>
        <Link className="triage-card" href={`${taskBaseHref}?filter=urgent`}>
          <span className="metric-label">High priority</span>
          <strong>{data.metrics.urgentTasks}</strong>
          <span className="muted">Protect the most time-sensitive tasks.</span>
        </Link>
        <Link className="triage-card" href={`${taskBaseHref}?filter=due-soon`}>
          <span className="metric-label">Due soon</span>
          <strong>{data.metrics.dueSoonTasks}</strong>
          <span className="muted">Catch work before it becomes overdue.</span>
        </Link>
        <Link className="triage-card" href={`${taskBaseHref}?filter=unassigned`}>
          <span className="metric-label">Unassigned</span>
          <strong>{data.metrics.unassignedTasks}</strong>
          <span className="muted">Decide where ownership is missing.</span>
        </Link>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <section className="card">
            <h2>Needs attention now</h2>
            {data.focusTasks.length ? (
              <ul className="list">
                {data.focusTasks.map((task) => (
                  <li key={task.id}>
                    <div className="split">
                      <div>
                        <strong>{task.title}</strong>
                        <div className="meta-row">
                          <span className="badge badge-neutral">{task.priority}</span>
                          {task.statusKind ? <span className="badge badge-neutral">{task.statusKind}</span> : null}
                        </div>
                        <div className="muted">
                          {task.projectName ? `${task.projectName} • ` : ""}
                          {task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date"}
                        </div>
                      </div>
                      {task.projectSlug ? (
                        <Link
                          className="button-secondary"
                          href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${task.projectSlug}`}
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : data.attentionItems.length ? (
              <ul className="list">
                {data.attentionItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="empty-note">No urgent attention items right now.</p>
            )}
          </section>

          <section className="card">
            <div className="card-header-row">
              <h2>Open tasks</h2>
              <Link className="button-secondary" href={taskBaseHref}>
                View all
              </Link>
            </div>
            {data.openTasks.length ? (
              <ul className="list">
                {data.openTasks.map((task) => (
                  <li key={task.id}>
                    <div className="split">
                      <div>
                        <strong>{task.title}</strong>
                        <div className="meta-row">
                          <span className="badge badge-neutral">{task.priority}</span>
                          {task.statusKind ? <span className="badge badge-neutral">{task.statusKind}</span> : null}
                        </div>
                        <div className="muted">
                          {task.projectName ? `${task.projectName} • ` : ""}
                          {task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date"}
                        </div>
                      </div>
                      {task.projectSlug ? (
                        <Link
                          className="button-secondary"
                          href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${task.projectSlug}`}
                        >
                          Open
                        </Link>
                      ) : null}
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
