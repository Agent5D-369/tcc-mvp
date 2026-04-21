import { auth } from "./auth";
import type { AppSession } from "./types";

export async function getSession(): Promise<AppSession | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.name ?? null,
      image: session.user.image ?? null,
    },
    activeTenantId: session.activeTenantId ?? null,
    activeWorkspaceId: session.activeWorkspaceId ?? null,
  };
}
