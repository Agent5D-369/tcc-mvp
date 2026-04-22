import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getProjectOverview } from "@workspace-kit/projects";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { DecisionManagerCard } from "./decision-manager-card";
import { CreateDecisionCard } from "./create-decision-card";
import { CreateMeetingCard } from "./create-meeting-card";
import { CreateMilestoneCard } from "./create-milestone-card";
import { CreateTaskCard } from "./create-task-card";
import { MeetingManagerCard } from "./meeting-manager-card";
import { MilestoneManagerCard } from "./milestone-manager-card";
import { ProjectSettingsCard } from "./project-settings-card";
import { getBadgeClass } from "./project-room-utils";
import { TaskManagerCard } from "./task-manager-card";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string; projectSlug: string }>;
};

export default async function ProjectWorkspacePage({ params }: PageProps) {
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

      <section className="action-grid" style={{ marginBottom: 20 }}>
        <CreateTaskCard projectId={data.project.id} />
        <CreateMilestoneCard projectId={data.project.id} />
        <CreateDecisionCard projectId={data.project.id} />
        <CreateMeetingCard projectId={data.project.id} />
      </section>

      <section className="management-grid" style={{ marginBottom: 20 }}>
        <ProjectSettingsCard
          project={data.project}
          workspaceHref={`/${route.tenantSlug}/${route.workspaceSlug}`}
        />
        <TaskManagerCard tasks={data.allTasks} statuses={data.availableStatuses} />
      </section>

      <section className="project-grid" style={{ marginBottom: 20 }}>
        <MilestoneManagerCard milestones={data.milestones} />
        <DecisionManagerCard decisions={data.decisions} />
        <MeetingManagerCard meetings={data.recentMeetings} />
      </section>

      <section className="project-grid">
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
