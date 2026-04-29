import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getCompiledKnowledge } from "@workspace-kit/knowledge";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

function confidenceLabel(confidenceBps: number) {
  return `${Math.round(confidenceBps / 100)}% source confidence`;
}

export default async function KnowledgePage({ params }: PageProps) {
  const session = await getSession();
  const route = await params;

  if (!session?.activeTenantId) {
    redirect("/signin");
  }

  const data = await getCompiledKnowledge({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  });

  return (
    <main className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>{data.workspace.name}</Link>
        <span>/</span>
        <span>Compiled knowledge</span>
      </div>

      <section className="hero compact-hero">
        <div>
          <div className="kicker">Compiled wiki layer</div>
          <h1>Team memory that stays tied to evidence.</h1>
          <p>
            Raw captures become source-backed pages, then approved facts become structured tasks, decisions, and operating memory.
          </p>
        </div>

        <div className="card">
          <h2>Knowledge path</h2>
          <ul className="list">
            <li>Raw sources enter as interactions and artifacts.</li>
            <li>Proposals update pages only after review.</li>
            <li>Compiled pages guide the app before fallback retrieval.</li>
          </ul>
        </div>
      </section>

      <section className="knowledge-list">
        {data.pages.length ? data.pages.map((page) => (
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
            <h2>No compiled pages yet</h2>
            <p className="empty-note">Capture a source, extract proposals, and approve memory updates to start building the anti-amnesia layer.</p>
          </section>
        )}
      </section>
    </main>
  );
}
