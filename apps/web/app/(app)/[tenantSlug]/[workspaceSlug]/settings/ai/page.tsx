import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantAiSettings } from "@workspace-kit/ai-core";
import { getSession, resolveMembershipByWorkspace } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { AiSettingsCard } from "./ai-settings-card";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export default async function AiSettingsPage({ params }: PageProps) {
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
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/settings/ai`);
  }

  const actorMembership = await resolveMembershipByWorkspace({
    userId: session.user.id,
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });
  const canManage = Boolean(
    session.user.email?.toLowerCase() !== "demo@example.com"
    && actorMembership
    && ["owner", "admin"].includes(actorMembership.role),
  );
  const aiSettings = await getTenantAiSettings(session.activeTenantId);

  return (
    <main className="page-shell app-page-shell">
      <section className="app-section">
        <div className="section-heading">
          <div>
            <div className="kicker">AI settings</div>
            <h2 className="section-title">Control models, keys, and tenant AI budget</h2>
          </div>
          <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/settings`}>
            Back to settings
          </Link>
        </div>
      </section>

      <section className="dashboard-grid">
        <AiSettingsCard initialData={aiSettings} canManage={canManage} />

        <aside className="stack">
          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Cost posture</div>
                <h2 className="section-title">Default to low-cost</h2>
              </div>
            </div>
            <p className="empty-note">
              QuickLaunch-managed AI uses the server provider key and the tenant budget here. Bring-your-own-key mode lets the
              tenant connect its own OpenRouter key while keeping the key hidden after save.
            </p>
          </section>

          <section className="card">
            <div className="section-heading">
              <div>
                <div className="kicker">Approval first</div>
                <h2 className="section-title">Agents do not write unchecked</h2>
              </div>
            </div>
            <p className="empty-note">
              Agent outputs should land as proposals for tasks, decisions, memory, or compiled pages before becoming system record.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
