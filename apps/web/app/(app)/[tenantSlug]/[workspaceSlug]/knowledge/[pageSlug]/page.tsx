import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getCompiledPage } from "@workspace-kit/knowledge";
import { KnowledgePageEditor } from "./knowledge-page-editor";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string; pageSlug: string }>;
};

function confidenceLabel(confidenceBps: number) {
  return `${Math.round(confidenceBps / 100)}% source confidence`;
}

export default async function CompiledPageDetail({ params }: PageProps) {
  const session = await getSession();
  const route = await params;

  if (!session?.activeTenantId) {
    redirect("/signin");
  }

  const data = await getCompiledPage({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
    pageSlug: route.pageSlug,
  });

  const currentRevision = data.revisions[0] ?? null;

  return (
    <main className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>{data.page.workspaceName}</Link>
        <span>/</span>
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}/knowledge`}>Compiled knowledge</Link>
        <span>/</span>
        <span>{data.page.title}</span>
      </div>

      <section className="hero compact-hero">
        <div>
          <div className="kicker">Compiled page</div>
          <h1>{data.page.title}</h1>
          <p>{data.page.summary || "This page is ready for approved source-backed updates."}</p>
          <div className="meta-row">
            <span className="badge badge-neutral">{data.page.pageType}</span>
            <span className="badge badge-neutral">{confidenceLabel(data.page.sourceConfidenceBps)}</span>
            {data.page.projectName ? <span className="badge badge-neutral">{data.page.projectName}</span> : null}
          </div>
        </div>

        <div className="card">
          <h2>Current revision</h2>
          <div className="stat-strip">
            <div className="stat-tile">
              <span className="metric-label">Version</span>
              <strong>{currentRevision ? `v${currentRevision.revisionNumber}` : "None"}</strong>
            </div>
            <div className="stat-tile">
              <span className="metric-label">Status</span>
              <strong>{currentRevision?.reviewStatus ?? "draft"}</strong>
            </div>
            <div className="stat-tile">
              <span className="metric-label">Pending</span>
              <strong>{data.pendingProposals.length}</strong>
            </div>
            <div className="stat-tile">
              <span className="metric-label">Revisions</span>
              <strong>{data.revisions.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="knowledge-detail-grid">
        <KnowledgePageEditor
          pageId={data.page.id}
          title={data.page.title}
          pageType={data.page.pageType}
          summary={data.page.summary}
          contentMarkdown={currentRevision?.contentMarkdown ?? ""}
        />

        <aside className="stack">
          <section className="card">
            <h2>Linked work</h2>
            {data.relatedTasks.length || data.relatedDecisions.length ? (
              <div className="linked-work-list">
                {data.relatedTasks.map((task) => (
                  <div className="linked-work-item" key={task.id}>
                    <strong>{task.title}</strong>
                    <div className="meta-row">
                      <span className="badge badge-neutral">{task.statusName || "task"}</span>
                      <span className="badge badge-neutral">{task.priority}</span>
                    </div>
                  </div>
                ))}
                {data.relatedDecisions.map((decision) => (
                  <div className="linked-work-item" key={decision.id}>
                    <strong>{decision.title}</strong>
                    <div className="meta-row">
                      <span className="badge badge-neutral">decision</span>
                      <span className="badge badge-neutral">{decision.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">Link this page to a project to show recent related tasks and decisions.</p>
            )}
          </section>

          <section className="card">
            <h2>Source chain</h2>
            {data.revisions.length ? (
              <ul className="list">
                {data.revisions.map((revision) => (
                  <li key={revision.id}>
                    <div className="split">
                      <strong>v{revision.revisionNumber}</strong>
                      <span className="badge badge-neutral">{revision.reviewStatus}</span>
                    </div>
                    <div className="muted">{revision.changeSummary || "No change summary recorded."}</div>
                    {revision.interactionTitle ? (
                      <div className="source-box">
                        <strong>{revision.interactionTitle}</strong>
                        <div className="muted">{revision.sourceLabel || "Captured interaction"}</div>
                        {revision.sourceExcerpt ? <p>{revision.sourceExcerpt}</p> : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No revisions linked yet.</p>
            )}
          </section>

          <section className="card">
            <h2>Pending proposals</h2>
            {data.pendingProposals.length ? (
              <ul className="list">
                {data.pendingProposals.map((proposal) => (
                  <li key={proposal.id}>
                    <div className="split">
                      <strong>{proposal.title}</strong>
                      {proposal.queueName ? <span className="badge badge-warn">{proposal.queueName}</span> : null}
                    </div>
                    <div className="muted">{proposal.bodyMarkdown || "No proposal body."}</div>
                    {proposal.sourceExcerpt ? <p className="source-excerpt">{proposal.sourceExcerpt}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No pending page updates.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
