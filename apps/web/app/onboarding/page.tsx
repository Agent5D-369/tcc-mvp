import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { OnboardingSetupCard } from "./onboarding-setup-card";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.activeTenantId && session.activeWorkspaceId) {
    const route = await getActiveWorkspaceRoute({
      tenantId: session.activeTenantId,
      workspaceId: session.activeWorkspaceId,
    });

    if (route) {
      redirect(`/${route.tenantSlug}/${route.workspaceSlug}`);
    }
  }

  return (
    <main className="marketing-shell onboarding-shell">
      <div className="topbar">
        <div className="brand-block">
          <span className="eyebrow">QuickLaunch onboarding</span>
          <strong>Finish the first organization setup</strong>
        </div>
      </div>

      <section className="hero onboarding-hero">
        <div>
          <div className="kicker">Get to the first win</div>
          <h1>Create the space your team will run from.</h1>
          <p>
            You are signed in, but this account is not attached to an active workspace yet. Create one organization and
            one workspace now. You can add more workspaces and members later from Settings.
          </p>
        </div>

        <OnboardingSetupCard />
      </section>
    </main>
  );
}
