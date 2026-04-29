import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getCompiledKnowledge } from "@workspace-kit/knowledge";
import { KnowledgePageCreate } from "./knowledge-page-create";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
  searchParams: Promise<{ q?: string; type?: string }>;
};

function confidenceLabel(confidenceBps: number) {
  return `${Math.round(confidenceBps / 100)}% source confidence`;
}

export default async function KnowledgePage({ params, searchParams }: PageProps) {
  const session = await getSession();
  const route = await params;
  const filters = await searchParams;

  if (!session?.activeTenantId) {
    redirect("/signin");
  }

  const data = await getCompiledKnowledge({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  });

  const query = (filters.q || "").trim().toLowerCase();
  const pageType = (filters.type || "").trim();
  const pageTypes = Array.from(new Set(data.pages.map((page) => page.pageType))).sort();
  const filteredPages = data.pages.filter((page) => {
    const matchesQuery = !query || [
      page.title,
      page.summary || "",
      page.pageType,
    ].join(" ").toLowerCase().includes(query);
    const matchesType = !pageType || page.pageType === pageType;
    return matchesQuery && matchesType;
  });
  const pendingCount = data.pages.reduce((total, page) => total + page.pendingProposalCount, 0);
  const averageConfidence = data.pages.length
    ? Math.round(data.pages.reduce((total, page) => total + page.sourceConfidenceBps, 0) / data.pages.length / 100)
    : 0;

  return (
    <main className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>{data.workspace.name}</Link>
        <span>/</span>
        <span>Compiled knowledge</span>
      </div>

      <section className="knowledge-hero">
        <div>
          <div className="kicker">Knowledge hub</div>
          <h1>Workspace memory, linked to the work.</h1>
          <p>
            Create living pages, approve source-backed updates, and keep project knowledge close to tasks, decisions, and meetings.
          </p>
          <div className="hero-actions">
            <KnowledgePageCreate
              tenantSlug={route.tenantSlug}
              workspaceSlug={route.workspaceSlug}
              projects={data.projects}
            />
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/templates`}>
              Apply template
            </Link>
          </div>
        </div>

        <div className="knowledge-stats">
          <div>
            <span className="metric-label">Pages</span>
            <strong>{data.pages.length}</strong>
          </div>
          <div>
            <span className="metric-label">Pending</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span className="metric-label">Confidence</span>
            <strong>{averageConfidence ? `${averageConfidence}%` : "new"}</strong>
          </div>
        </div>
      </section>

      <section className="knowledge-toolbar">
        <form className="knowledge-search" action={`/${route.tenantSlug}/${route.workspaceSlug}/knowledge`}>
          <input name="q" defaultValue={filters.q || ""} placeholder="Search pages, summaries, and types" />
          <select name="type" defaultValue={pageType}>
            <option value="">All types</option>
            {pageTypes.map((type) => (
              <option value={type} key={type}>{type}</option>
            ))}
          </select>
          <button className="button-secondary" type="submit">Search</button>
        </form>
        <p className="muted">Use this as the team's operating notebook. Templates seed pages; captures and approvals keep them fresh.</p>
      </section>

      <section className="knowledge-list">
        {filteredPages.length ? filteredPages.map((page) => (
          <Link
            className="knowledge-row"
            href={`/${route.tenantSlug}/${route.workspaceSlug}/knowledge/${page.slug}`}
            key={page.id}
          >
            <div>
              <div className="meta-row">
                <span className="badge badge-neutral">{page.pageType}</span>
                <span className={page.pendingProposalCount ? "badge badge-warn" : "badge badge-success"}>
                  {page.pendingProposalCount} pending
                </span>
              </div>
              <h2>{page.title}</h2>
              <p className="muted">{page.summary || "No summary has been approved yet."}</p>
            </div>
            <div className="knowledge-row-meta">
              <span>{confidenceLabel(page.sourceConfidenceBps)}</span>
              <span>{page.revisionCount} revision{page.revisionCount === 1 ? "" : "s"}</span>
              <span>{page.latestRevision ? `v${page.latestRevision}` : "no revision"}</span>
            </div>
          </Link>
        )) : (
          <section className="card">
            <h2>No matching pages</h2>
            <p className="empty-note">Create a page, apply a template, or clear the search filters to see the full workspace memory.</p>
          </section>
        )}
      </section>
    </main>
  );
}
