import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { getWorkspaceMeetingsIndex, getWorkspaceProjectsIndex } from "../workspace-screen-data";
import { CreateWorkspaceMeetingCard } from "./create-workspace-meeting-card";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export default async function MeetingsPage({ params }: PageProps) {
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
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/meetings`);
  }

  const [meetings, projects] = await Promise.all([
    getWorkspaceMeetingsIndex({
      tenantId: session.activeTenantId,
      workspaceId: session.activeWorkspaceId,
    }),
    getWorkspaceProjectsIndex({
      tenantId: session.activeTenantId,
      workspaceId: session.activeWorkspaceId,
    }),
  ]);

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Meetings</div>
            <h2 className="section-title">Review captured meeting output</h2>
          </div>
          <p className="empty-note">Use this view to scan recent meeting outcomes before opening a project room for details or edits.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <section className="record-list">
            {meetings.length ? (
              meetings.map((meeting) => (
                <article key={meeting.id} className="record-card">
                  <div className="record-card-copy">
                    <div className="meta-row">
                      <strong>{meeting.title}</strong>
                    </div>
                    <p className="entity-preview">{meeting.summary || "No meeting summary yet."}</p>
                    <div className="entity-summary-meta">
                      <span>{meeting.meetingAt ? new Date(meeting.meetingAt).toLocaleString() : "No meeting time"}</span>
                      <span>{meeting.projectName || "No linked project"}</span>
                    </div>
                  </div>
                  {meeting.projectSlug ? (
                    <Link
                      className="button-secondary"
                      href={`/${route.tenantSlug}/${route.workspaceSlug}/projects/${meeting.projectSlug}`}
                    >
                      Edit in project
                    </Link>
                  ) : null}
                </article>
              ))
            ) : (
              <section className="card">
                <h2>No meetings captured</h2>
                <p className="empty-note">Capture the first meeting here or paste a transcript into Capture Hub for AI extraction.</p>
              </section>
            )}
          </section>
        </div>
        <aside className="stack">
          <CreateWorkspaceMeetingCard projects={projects.map((project) => ({
            id: project.id,
            name: project.name,
            slug: project.slug,
          }))} />
          <section className="card">
            <h2>Meeting workflow</h2>
            <p className="empty-note">Use this page for quick capture. Open the linked project when you need full edit/delete controls or detailed notes.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
