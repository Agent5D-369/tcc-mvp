import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { getWorkspaceProjectsIndex } from "../workspace-screen-data";

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

export default async function ProjectsPage({ params }: PageProps) {
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
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/projects`);
  }

  const projects = await getWorkspaceProjectsIndex({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Projects</div>
            <h2 className="section-title">Track current work</h2>
          </div>
          <p className="empty-note">Review active and upcoming projects. Open a room to capture detailed work.</p>
        </div>
      </section>

      <section className="record-list">
        {projects.length ? (
          projects.map((project) => (
            <article key={project.id} className="record-card">
              <div className="record-card-copy">
                <div className="meta-row">
                  <strong>{project.name}</strong>
                  <span className={getHealthBadgeClass(project.health)}>{project.health}</span>
                  <span className="badge badge-neutral">{project.status}</span>
                </div>
                <p className="entity-preview">
                  {project.summary || "No project summary yet."}
                </p>
                <div className="entity-summary-meta">
                  <span>{project.openTaskCount} open task{project.openTaskCount === 1 ? "" : "s"}</span>
                  <span>{project.targetDate ? `Target ${new Date(project.targetDate).toLocaleDateString()}` : "No target date"}</span>
                </div>
              </div>
              <Link
                className="button-primary"
                href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${project.slug}`}
              >
                Open room
              </Link>
            </article>
          ))
        ) : (
          <section className="card">
            <h2>No projects yet</h2>
            <p className="empty-note">Create the first project from the Home tab to start organizing work.</p>
          </section>
        )}
      </section>
    </main>
  );
}
