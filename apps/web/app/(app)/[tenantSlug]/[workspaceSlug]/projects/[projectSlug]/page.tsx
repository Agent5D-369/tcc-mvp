import Link from "next/link";
import { getSession } from "@workspace-kit/auth";
import { getProjectOverview } from "@workspace-kit/projects";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string; projectSlug: string }>;
};

function getBadgeClass(kind: string) {
  switch (kind) {
    case "green":
    case "active":
      return "badge badge-success";
    case "yellow":
    case "paused":
    case "medium":
      return "badge badge-warn";
    case "red":
    case "urgent":
      return "badge badge-danger";
    default:
      return "badge badge-neutral";
  }
}

export default async function ProjectWorkspacePage({ params }: PageProps) {
  const session = await getSession();
  const route = await params;

  if (!session?.activeTenantId) {
    throw new Error("Unauthorized");
  }

  const data = await getProjectOverview({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
    projectSlug: route.projectSlug,
  });

  return (
    <main className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>{data.project.workspaceName}</Link>
        <span>/</span>
        <span>{data.project.name}</span>
      </div>

      <section className="hero">
        <div>
          <div className="kicker">Project workspace</div>
          <h1>{data.project.name}</h1>
          <p>
            {data.project.summary || "Add a short project summary so ownership, timing, and success criteria are obvious to the whole team."}
          </p>
          <div className="meta-row">
            <span className={getBadgeClass(data.project.status)}>{data.project.status}</span>
            <span className={getBadgeClass(data.project.health)}>{data.project.health}</span>
          </div>
        </div>

        <div className="card">
          <h2>Execution health</h2>
          <div className="stat-strip">
            <div className="stat-tile">
              <span className="metric-label">Total tasks</span>
              <strong>{data.health.totalTasks}</strong>
            </div>
            <div className="stat-tile">
              <span className="metric-label">Completed</span>
              <strong>{data.health.completedTasks}</strong>
            </div>
            <div className="stat-tile">
              <span className="metric-label">Blocked</span>
              <strong>{data.health.blockedTasks}</strong>
            </div>
            <div className="stat-tile">
              <span className="metric-label">Completion</span>
              <strong>{data.health.completionRatio}%</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="project-grid" style={{ marginBottom: 20 }}>
        <section className="card">
          <h2>Next actions</h2>
          {data.nextActions.length ? (
            <ul className="list">
              {data.nextActions.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong>
                  <div className="meta-row">
                    <span className={getBadgeClass(task.priority)}>{task.priority}</span>
                    {task.dueAt ? <span className="badge badge-neutral">Due {new Date(task.dueAt).toLocaleDateString()}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">No open next actions found.</p>
          )}
        </section>

        <section className="card">
          <h2>Milestones</h2>
          {data.milestones.length ? (
            <ul className="list">
              {data.milestones.map((milestone) => (
                <li key={milestone.id}>
                  <strong>{milestone.name}</strong>
                  <div className="muted">{milestone.description || "No milestone description yet."}</div>
                  {milestone.dueAt ? <div className="muted">Due {new Date(milestone.dueAt).toLocaleDateString()}</div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">No milestones tracked yet.</p>
          )}
        </section>

        <section className="card">
          <h2>Decision log</h2>
          {data.decisions.length ? (
            <ul className="list">
              {data.decisions.map((decision) => (
                <li key={decision.id}>
                  <strong>{decision.title}</strong>
                  <div className="muted">{decision.decisionText}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">No decisions recorded yet.</p>
          )}
        </section>
      </section>

      <section className="project-grid">
        <section className="card">
          <h2>Recent meetings</h2>
          {data.recentMeetings.length ? (
            <ul className="list">
              {data.recentMeetings.map((meeting) => (
                <li key={meeting.id}>
                  <strong>{meeting.title}</strong>
                  <div className="muted">{meeting.summary || "No meeting summary yet."}</div>
                  {meeting.meetingAt ? <div className="muted">{new Date(meeting.meetingAt).toLocaleString()}</div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">No project meetings captured yet.</p>
          )}
        </section>

        <section className="card">
          <h2>Coordination threads</h2>
          {data.conversations.length ? (
            <ul className="list">
              {data.conversations.map((conversation) => (
                <li key={conversation.id}>
                  <strong>{conversation.title}</strong>
                  <div className="muted">
                    {conversation.updatedAt ? `Updated ${new Date(conversation.updatedAt).toLocaleString()}` : "No recent activity"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">No coordination threads linked yet.</p>
          )}
        </section>

        <section className="card">
          <h2>Project frame</h2>
          <ul className="list">
            <li>
              <strong>Workspace</strong>
              <div className="muted">{data.project.workspaceName}</div>
            </li>
            <li>
              <strong>Tracked milestones</strong>
              <div className="muted">{data.milestoneCount}</div>
            </li>
            <li>
              <strong>Execution status</strong>
              <div className="muted">{data.project.status}</div>
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}
