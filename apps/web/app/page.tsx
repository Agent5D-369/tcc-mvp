import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";

export default async function RootPage() {
  const session = await getSession();

  if (session?.activeTenantId && session.activeWorkspaceId) {
    const route = await getActiveWorkspaceRoute({
      tenantId: session.activeTenantId,
      workspaceId: session.activeWorkspaceId,
    });

    if (route) {
      redirect(`/${route.tenantSlug}/${route.workspaceSlug}`);
    }
  }

  return (
    <main className="marketing-shell">
      <div className="topbar">
        <div className="brand-block">
          <span className="eyebrow">QuickLaunch • Team Command Center</span>
          <strong>Phase 1 execution workspace</strong>
        </div>
        <Link className="button-secondary" href="/signin">
          {session ? "Complete workspace access" : "Sign in"}
        </Link>
      </div>

      <section className="hero">
        <div>
          <div className="kicker">Multitenant operations cockpit</div>
          <h1>Run projects, meetings, and decisions from one calm control surface.</h1>
          <p>
            QuickLaunch is the first production cut of Team Command Center. It gives each tenant a clear workspace
            for active projects, ownership signals, milestone tracking, meeting capture, and decision follow-through.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" href="/signin">
              Enter the MVP
            </Link>
            <a className="button-secondary" href="#phase-one">
              See Phase 1 scope
            </a>
          </div>
        </div>

        <div className="card">
          <h2>Built for Phase 1</h2>
          <ul className="list">
            <li>
              <strong>Tenant-aware routing</strong>
              <div className="muted">Shared app, shared database, clear tenant and workspace boundaries.</div>
            </li>
            <li>
              <strong>Execution visibility</strong>
              <div className="muted">Projects, milestones, next actions, meetings, and decision logs.</div>
            </li>
            <li>
              <strong>Railway-friendly delivery</strong>
              <div className="muted">Single web service now, room for workers and automations later.</div>
            </li>
          </ul>
        </div>
      </section>

      <section id="phase-one" className="metric-grid">
        <article className="metric-card">
          <div className="metric-label">Workspace Home</div>
          <div className="metric-value">01</div>
          <div className="muted">Daily command brief, active projects, risk list, recent meetings, and logged decisions.</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Project Rooms</div>
          <div className="metric-value">02</div>
          <div className="muted">Milestones, next actions, health signals, and coordination context for each initiative.</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Tenancy Core</div>
          <div className="metric-value">03</div>
          <div className="muted">Tenants, workspaces, memberships, and scoped database access patterns.</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Deployment</div>
          <div className="metric-value">04</div>
          <div className="muted">Ready to run on Railway with PostgreSQL and a thin operational footprint.</div>
        </article>
      </section>
    </main>
  );
}

