import { auth } from "./auth";
import type { AppSession } from "./types";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

async function getDemoSession(): Promise<AppSession | null> {
  const [membership] = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
      image: schema.users.avatarUrl,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .orderBy(desc(schema.memberships.isDefaultWorkspace), asc(schema.memberships.joinedAt))
    .limit(1);

  if (!membership?.workspaceId) {
    return null;
  }

  return {
    user: {
      id: membership.userId,
      email: membership.email,
      fullName: membership.fullName ?? null,
      image: membership.image ?? null,
    },
    activeTenantId: membership.tenantId,
    activeWorkspaceId: membership.workspaceId,
  };
}

export async function getSession(): Promise<AppSession | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    if (process.env.DEMO_MODE === "true") {
      return getDemoSession();
    }

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
