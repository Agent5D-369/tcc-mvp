import { requireAuth } from "@workspace-kit/auth/requireAuth";

export async function resolveTenantContext() {
  const session = await requireAuth();
  if (!session.activeTenantId || !session.activeWorkspaceId) {
    throw new Error("No active tenant or workspace found for this user");
  }

  return {
    userId: session.user.id,
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  };
}
