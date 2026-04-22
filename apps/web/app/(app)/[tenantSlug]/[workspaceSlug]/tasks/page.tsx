import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { TasksReviewList } from "./tasks-review-list";
import { getWorkspaceTaskStatuses, getWorkspaceTasksIndex } from "../workspace-screen-data";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
  searchParams: Promise<{ filter?: string }>;
};

const taskFilters = [
  { id: "all", label: "All open" },
  { id: "blocked", label: "Blocked" },
  { id: "urgent", label: "High priority" },
  { id: "due-soon", label: "Due soon" },
  { id: "unassigned", label: "Unassigned" },
] as const;

function getTaskFilterMatcher(filter: string | undefined) {
  switch (filter) {
    case "blocked":
      return (task: Awaited<ReturnType<typeof getWorkspaceTasksIndex>>[number]) => task.statusKind === "blocked";
    case "urgent":
      return (task: Awaited<ReturnType<typeof getWorkspaceTasksIndex>>[number]) => task.priority === "urgent" || task.priority === "high";
    case "due-soon": {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return (task: Awaited<ReturnType<typeof getWorkspaceTasksIndex>>[number]) => {
        if (!task.dueAt) {
          return false;
        }
        const dueAt = new Date(task.dueAt);
        return dueAt >= now && dueAt <= threeDaysFromNow;
      };
    }
    case "unassigned":
      return (task: Awaited<ReturnType<typeof getWorkspaceTasksIndex>>[number]) => task.statusId === null;
    default:
      return () => true;
  }
}

export default async function TasksPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  const route = await params;
  const query = await searchParams;

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
  const activeFilter = taskFilters.some((item) => item.id === query.filter) ? query.filter! : "all";
  const filteredTasks = tasks.filter(getTaskFilterMatcher(activeFilter));

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Tasks</div>
            <h2 className="section-title">Focus on work that is still open</h2>
          </div>
          <p className="empty-note">Start with the filtered queue that matches your intent, then review one task at a time.</p>
        </div>
      </section>

      <section className="card filter-card">
        <div className="card-header-row">
          <div>
            <h2>Choose a queue</h2>
            <p className="empty-note">Use one filter at a time to reduce scan load on mobile.</p>
          </div>
        </div>
        <div className="filter-chip-row">
          {taskFilters.map((filter) => {
            const href =
              filter.id === "all"
                ? `/${route.tenantSlug}/${route.workspaceSlug}/tasks`
                : `/${route.tenantSlug}/${route.workspaceSlug}/tasks?filter=${filter.id}`;

            return (
              <a
                key={filter.id}
                href={href}
                className={activeFilter === filter.id ? "filter-chip is-active" : "filter-chip"}
              >
                {filter.label}
              </a>
            );
          })}
        </div>
      </section>

      <TasksReviewList
        tenantSlug={route.tenantSlug}
        workspaceSlug={route.workspaceSlug}
        tasks={filteredTasks}
        statuses={statuses}
      />
    </main>
  );
}
