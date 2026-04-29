import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { workspaceTemplates } from "@workspace-kit/templates";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { TemplateApplyButton } from "./template-apply-button";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export default async function TemplatesPage({ params }: PageProps) {
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
    redirect("/onboarding");
  }

  if (activeRoute.tenantSlug !== route.tenantSlug || activeRoute.workspaceSlug !== route.workspaceSlug) {
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/templates`);
  }

  return (
    <main className="page-shell app-page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>Home</Link>
        <span>/</span>
        <span>Templates</span>
      </div>

      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Operating templates</div>
            <h2 className="section-title">Start with structures that prevent common failure modes</h2>
          </div>
          <p className="empty-note">Each template creates a project with practical starter tasks. Use only what fits the team right now.</p>
        </div>
      </section>

      <section className="template-grid">
        {workspaceTemplates.map((template) => (
          <article className="card template-card" key={template.id}>
            <div className="section-heading">
              <div>
                <div className="kicker">{template.category}</div>
                <h2 className="section-title">{template.name}</h2>
              </div>
              <span className="badge badge-neutral">{template.tasks.length} tasks</span>
            </div>
            <p className="muted">{template.summary}</p>
            <div className="meta-row">
              {template.helpsPrevent.map((pattern) => (
                <span className="badge badge-neutral" key={pattern}>{pattern}</span>
              ))}
            </div>
            <ul className="list">
              {template.tasks.slice(0, 3).map((task) => (
                <li key={task.title}>
                  <strong>{task.title}</strong>
                  <div className="muted">{task.description}</div>
                </li>
              ))}
            </ul>
            <TemplateApplyButton templateId={template.id} tenantSlug={route.tenantSlug} workspaceSlug={route.workspaceSlug} />
          </article>
        ))}
      </section>
    </main>
  );
}
