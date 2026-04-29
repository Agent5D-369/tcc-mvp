import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getWorkspaceShellData } from "./workspace-screen-data";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { WorkspaceFeedbackProvider } from "./workspace-feedback";
import { WorkspaceSwitcher } from "./workspace-switcher";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
  const session = await getSession();
  const route = await params;

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const shell = await getWorkspaceShellData({
    userId: session.user.id,
    tenantSlug: route.tenantSlug,
    workspaceSlug: route.workspaceSlug,
  });

  return (
    <WorkspaceFeedbackProvider>
      <div className="workspace-shell">
        <header className="workspace-header">
          <div className="workspace-header-copy">
            <span className="eyebrow">QuickLaunch Team Command Center</span>
            <h1>{shell.currentWorkspace.workspaceName}</h1>
            <p>{shell.currentWorkspace.workspaceDescription || "Run projects, tasks, meetings, and decisions from one command surface."}</p>
            <div className="account-link-row">
              <span>{session.user.email}</span>
              <a href="/api/auth/signout?callbackUrl=/signin">Sign out</a>
            </div>
          </div>
          <div className="workspace-header-actions">
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/meetings`}>
              Meetings
            </Link>
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/help`}>
              Help
            </Link>
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/templates`}>
              Templates
            </Link>
            <a className="button-secondary sign-out-link" href="/api/auth/signout?callbackUrl=/signin">
              Sign out
            </a>
            <WorkspaceSwitcher
              value={`/${route.tenantSlug}/${route.workspaceSlug}`}
              options={shell.contexts.map((context) => ({
                tenantId: context.tenantId,
                tenantSlug: context.tenantSlug,
                tenantName: context.tenantName,
                workspaceId: context.workspaceId,
                workspaceSlug: context.workspaceSlug,
                workspaceName: context.workspaceName,
                role: context.role,
              }))}
            />
          </div>
        </header>
        <div className="workspace-content">{children}</div>
        <MobileBottomNav tenantSlug={route.tenantSlug} workspaceSlug={route.workspaceSlug} />
      </div>
    </WorkspaceFeedbackProvider>
  );
}
