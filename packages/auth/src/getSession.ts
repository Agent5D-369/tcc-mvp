import { auth } from "./auth";
import type { AppSession } from "./types";
import { readDemoSessionToken } from "./demoSession";
import { readActiveWorkspacePreference } from "./activeWorkspace";
import { listUserMemberships, resolveMembershipByEmail } from "./membership";

async function getDemoSession(): Promise<AppSession | null> {
  const demoSession = await readDemoSessionToken();
  if (!demoSession) {
    return null;
  }

  const membership = await resolveMembershipByEmail(demoSession.email);
  if (!membership?.workspaceId) {
    return null;
  }

  return {
    user: {
      id: demoSession.userId,
      email: demoSession.email,
      fullName: demoSession.fullName ?? null,
      image: null,
    },
    activeTenantId: demoSession.tenantId,
    activeWorkspaceId: demoSession.workspaceId,
  };
}

export async function getSession(): Promise<AppSession | null> {
  const demoSession = await getDemoSession();
  const baseSession = demoSession ?? await (async () => {
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
    } satisfies AppSession;
  })();

  if (!baseSession) {
    return null;
  }

  const memberships = await listUserMemberships(baseSession.user.id);
  if (!memberships.length) {
    return {
      ...baseSession,
      activeTenantId: null,
      activeWorkspaceId: null,
    };
  }

  const preferredWorkspace = await readActiveWorkspacePreference();
  const activeMembership = memberships.find((membership) =>
    preferredWorkspace
    && membership.tenantId === preferredWorkspace.tenantId
    && membership.workspaceId === preferredWorkspace.workspaceId,
  ) ?? memberships.find((membership) => membership.isDefaultWorkspace) ?? memberships[0];

  return {
    ...baseSession,
    activeTenantId: activeMembership?.tenantId ?? null,
    activeWorkspaceId: activeMembership?.workspaceId ?? null,
  };
}
