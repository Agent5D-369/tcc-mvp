import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getWorkspaceHome } from "@workspace-kit/home";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  if (route.workspaceSlug === "amora-command") {
    redirect(`/${route.tenantSlug}/demo-command`);
  }

  if (!session?.activeTenantId) {
    redirect("/signin");
  }

  const data = await getWorkspaceHome({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  }).catch((error) => {
    console.error("Workspace home failed to load", {
      tenantSlug: route.tenantSlug,
      workspaceSlug: route.workspaceSlug,
      activeTenantId: session.activeTenantId,
      error,
    });

    return null;
  });

  if (!data) {
    return (
      <main className="page-shell">
        <div className="topbar">
          <div className="brand-block">
            <span className="eyebrow">{route.tenantSlug} / {route.workspaceSlug}</span>
            <strong>QuickLaunch Team Command Center</strong>
          </div>
          <Link className="button-secondary" href="/">
            Switch context
          </Link>
        </div>

        <section className="hero compact-hero">
          <div>
            <div className="kicker">Command Center demo</div>
            <h1>Turn messy communication into approved operating state.</h1>
            <p>
              Use the core demo loop: capture a meeting, email, voice note, or copied chat summary; extract proposed
              tasks, decisions, and memory; then approve what should become shared team context.
            </p>
            <div className="hero-actions">
              <Link className="button-primary" href={`/${route.tenantSlug}/${route.workspaceSlug}/capture`}>
                Capture source
              </Link>
              <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/approvals`}>
                Review approvals
              </Link>
              <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/knowledge`}>
                Open memory
              </Link>
            </div>
          </div>

          <div className="card">
            <h2>Demo path</h2>
            <ul className="list">
              <li>Capture raw communication.</li>
              <li>Extract source-backed proposals.</li>
              <li>Approve tasks, decisions, and compiled memory.</li>
            </ul>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="brand-block">
          <span className="eyebrow">{data.tenant.name} / {data.workspace.name}</span>
          <strong>QuickLaunch Team Command Center</strong>
        </div>
        <Link className="button-secondary" href="/">
          Switch context
        </Link>
      </div>

      <section className="hero">
        <div>
          <div className="kicker">Workspace home</div>
          <h1>{data.workspace.name}</h1>
          <p>
            {data.workspace.description || "A multitenant command center for active work, ownership, meeting output, and decisions."}
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
          <div className="hero-actions">
            <Link className="button-primary" href={`/${route.tenantSlug}/${route.workspaceSlug}/capture`}>
              Capture source
            </Link>
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/approvals`}>
              Review approvals
            </Link>
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/knowledge`}>
              Open memory
            </Link>
          </div>
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
        <article className="metric-card">
          <div className="metric-label">Pending approvals</div>
          <div className="metric-value">{data.metrics.pendingApprovals}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Captured interactions</div>
          <div className="metric-value">{data.metrics.capturedInteractions}</div>
        </article>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <section className="card">
            <h2>Capture loop</h2>
            {data.recentInteractions.length ? (
              <ul className="list">
                {data.recentInteractions.map((interaction) => (
                  <li key={interaction.id}>
                    <div className="split">
                      <div>
                        <strong>{interaction.title}</strong>
                        <div className="muted">
                          {interaction.summary || "Captured source waiting for extraction or review."}
                        </div>
                      </div>
                      <div className="meta-row">
                        {interaction.queueName ? <span className="badge badge-neutral">{interaction.queueName}</span> : null}
                        {interaction.sourceLabel ? <span className="badge badge-neutral">{interaction.sourceLabel}</span> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No communication dumps captured yet.</p>
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
        </div>

        <aside className="stack">
          <section className="card">
            <h2>Approval queues</h2>
            {data.approvalQueues.length ? (
              <ul className="list">
                {data.approvalQueues.map((queue) => (
                  <li key={queue.id}>
                    <div className="split">
                      <strong>{queue.name}</strong>
                      <span className={queue.pendingCount ? "badge badge-warn" : "badge badge-neutral"}>
                        {queue.pendingCount} pending
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No approval queues configured yet.</p>
            )}
          </section>

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

          <section className="card">
            <h2>Compiled memory</h2>
            {data.compiledPages.length ? (
              <ul className="list">
                {data.compiledPages.map((page) => (
                  <li key={page.id}>
                    <Link href={`/${route.tenantSlug}/${route.workspaceSlug}/knowledge/${page.slug}`}>
                      <strong>{page.title}</strong>
                    </Link>
                    <div className="muted">{page.summary || "Ready for approved source-backed updates."}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No compiled pages seeded yet.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

