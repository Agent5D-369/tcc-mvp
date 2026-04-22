import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { getBadgeClass } from "../projects/[projectSlug]/project-room-utils";
import { getWorkspaceTasksIndex } from "../workspace-screen-data";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export default async function TasksPage({ params }: PageProps) {
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
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/tasks`);
  }

  const tasks = await getWorkspaceTasksIndex({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Tasks</div>
            <h2 className="section-title">Focus on work that is still open</h2>
          </div>
          <p className="empty-note">Review due work, blocked work, and priorities before opening a project room to edit details.</p>
        </div>
      </section>

      <section className="record-list">
        {tasks.length ? (
          tasks.map((task) => (
            <article key={task.id} className="record-card">
              <div className="record-card-copy">
                <div className="meta-row">
                  <strong>{task.title}</strong>
                  <span className={getBadgeClass(task.priority)}>{task.priority}</span>
                  <span className={getBadgeClass(task.statusKind || "neutral")}>{task.statusName}</span>
                </div>
                <p className="entity-preview">{task.description || "No task detail yet."}</p>
                <div className="entity-summary-meta">
                  <span>{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date"}</span>
                  <span>{task.projectName || "No project"}</span>
                </div>
              </div>
              {task.projectSlug ? (
                <Link
                  className="button-secondary"
                  href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${task.projectSlug}`}
                >
                  View project
                </Link>
              ) : null}
            </article>
          ))
        ) : (
          <section className="card">
            <h2>No open tasks</h2>
            <p className="empty-note">Capture the next action from a project room when new work appears.</p>
          </section>
        )}
      </section>
    </main>
  );
}
