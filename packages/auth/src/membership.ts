import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export async function ensureUserWorkspaceMembership(args: {
  userId: string;
}) {
  const [existingMembership] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(eq(schema.memberships.userId, args.userId))
    .limit(1);

  if (existingMembership) {
    return;
  }

  let [workspace] = await db
    .select({
      tenantId: schema.workspaces.tenantId,
      workspaceId: schema.workspaces.id,
    })
    .from(schema.workspaces)
    .orderBy(asc(schema.workspaces.createdAt))
    .limit(1);

  if (!workspace) {
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: "QuickLaunch Demo",
        slug: "quicklaunch-demo",
        plan: "team",
        status: "active",
        settingsJson: {},
      })
      .returning({
        id: schema.tenants.id,
      });

    const [createdWorkspace] = await db
      .insert(schema.workspaces)
      .values({
        tenantId: tenant.id,
        name: "Ops Command",
        slug: "ops-command",
        description: "Central workspace for project visibility, meeting follow-through, and decision tracking.",
        visibility: "private",
        createdBy: args.userId,
      })
      .returning({
        tenantId: schema.workspaces.tenantId,
        workspaceId: schema.workspaces.id,
      });

    workspace = createdWorkspace;
  }

  await db
    .insert(schema.memberships)
    .values({
      tenantId: workspace.tenantId,
      workspaceId: workspace.workspaceId,
      userId: args.userId,
      role: "owner",
      isDefaultWorkspace: true,
    })
    .onConflictDoNothing();
}

export async function resolveMembershipByEmail(email: string) {
  const [member] = await db
    .select({
      userId: schema.users.id,
      fullName: schema.users.fullName,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
    })
    .from(schema.users)
    .innerJoin(schema.memberships, eq(schema.memberships.userId, schema.users.id))
    .where(eq(schema.users.email, email))
    .orderBy(desc(schema.memberships.isDefaultWorkspace), asc(schema.memberships.joinedAt));

  return member ?? null;
}

export async function resolveMembershipByUserId(userId: string) {
  const [member] = await db
    .select({
      userId: schema.users.id,
      fullName: schema.users.fullName,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.userId, userId))
    .orderBy(desc(schema.memberships.isDefaultWorkspace), asc(schema.memberships.joinedAt));

  return member ?? null;
}
