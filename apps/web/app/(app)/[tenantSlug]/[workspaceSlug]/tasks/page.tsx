import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { TasksReviewList } from "./tasks-review-list";
import { getWorkspaceTaskStatuses, getWorkspaceTasksIndex } from "../workspace-screen-data";

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
  const statuses = await getWorkspaceTaskStatuses({
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

      <TasksReviewList
        tenantSlug={route.tenantSlug}
        workspaceSlug={route.workspaceSlug}
        tasks={tasks}
        statuses={statuses}
      />
    </main>
  );
}
