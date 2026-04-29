import { requireAuth } from "@workspace-kit/auth/requireAuth";
import { resolveMembershipByWorkspace } from "@workspace-kit/auth/membership";

export async function resolveTenantContext() {
  const session = await requireAuth();
  if (!session.activeTenantId || !session.activeWorkspaceId) {
    throw new Error("No active tenant or workspace found for this user");
  }

  const membership = await resolveMembershipByWorkspace({
    userId: session.user.id,
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  if (!membership) {
    throw new Error("No active workspace membership found for this user");
  }

  return {
    userId: session.user.id,
    userEmail: session.user.email?.toLowerCase() ?? "",
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
    role: session.isPlatformAdmin ? "owner" : membership.role,
    isDemoUser: session.user.email?.toLowerCase() === "demo@example.com",
    isPlatformAdmin: session.isPlatformAdmin === true,
  };
}
