import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

function slugifyName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type TenantPlan = "free" | "pro" | "team" | "enterprise";

export const PLAN_WORKSPACE_LIMITS: Record<TenantPlan, number> = {
  free: 1,
  pro: 3,
  team: 10,
  enterprise: 50,
};

export function getWorkspaceLimitForPlan(plan: string) {
  return PLAN_WORKSPACE_LIMITS[plan as TenantPlan] ?? PLAN_WORKSPACE_LIMITS.free;
}

async function ensureUniqueTenantSlug(name: string) {
  const base = slugifyName(name) || "tenant";

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1);

    if (!existing) {
      return slug;
    }
  }

  throw new Error("Could not generate a unique tenant slug");
}

async function ensureUniqueWorkspaceSlug(tenantId: string, name: string) {
  const base = slugifyName(name) || "workspace";

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: schema.workspaces.id })
      .from(schema.workspaces)
      .where(and(
        eq(schema.workspaces.tenantId, tenantId),
        eq(schema.workspaces.slug, slug),
      ))
      .limit(1);

    if (!existing) {
      return slug;
    }
  }

  throw new Error("Could not generate a unique workspace slug");
}

async function ensureWorkspaceTaskStatuses(args: { tenantId: string; workspaceId: string }) {
  const defaults = [
    { name: "Backlog", kind: "todo", sortOrder: 0, isDefault: true },
    { name: "In Progress", kind: "in_progress", sortOrder: 1, isDefault: false },
    { name: "Blocked", kind: "blocked", sortOrder: 2, isDefault: false },
    { name: "Done", kind: "done", sortOrder: 3, isDefault: false },
    { name: "Canceled", kind: "canceled", sortOrder: 4, isDefault: false },
  ] as const;

  for (const status of defaults) {
    await db.insert(schema.taskStatuses).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      name: status.name,
      kind: status.kind,
      sortOrder: status.sortOrder,
      isDefault: status.isDefault,
      color: null,
    }).onConflictDoNothing();
  }
}

async function setDefaultWorkspaceForUser(args: { userId: string; membershipId: string }) {
  await db
    .update(schema.memberships)
    .set({ isDefaultWorkspace: false })
    .where(and(
      eq(schema.memberships.userId, args.userId),
      ne(schema.memberships.id, args.membershipId),
    ));

  await db
    .update(schema.memberships)
    .set({ isDefaultWorkspace: true })
    .where(and(
      eq(schema.memberships.id, args.membershipId),
      eq(schema.memberships.userId, args.userId),
    ));
}

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

export async function listUserMemberships(userId: string) {
  return db
    .select({
      membershipId: schema.memberships.id,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
      role: schema.memberships.role,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
      workspaceName: schema.workspaces.name,
      workspaceSlug: schema.workspaces.slug,
    })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
    .where(eq(schema.memberships.userId, userId))
    .orderBy(desc(schema.memberships.isDefaultWorkspace), asc(schema.memberships.joinedAt));
}

export async function resolveMembershipByEmail(email: string) {
  const [member] = await db
    .select({
      membershipId: schema.memberships.id,
      userId: schema.users.id,
      fullName: schema.users.fullName,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
      role: schema.memberships.role,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
    })
    .from(schema.users)
    .innerJoin(schema.memberships, eq(schema.memberships.userId, schema.users.id))
    .where(eq(schema.users.email, email))
    .orderBy(desc(schema.memberships.isDefaultWorkspace), asc(schema.memberships.joinedAt));

  return member ?? null;
}

export async function resolveUserByEmail(email: string) {
  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
    })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  return user ?? null;
}

export async function resolveMembershipByUserId(userId: string) {
  const [member] = await db
    .select({
      membershipId: schema.memberships.id,
      userId: schema.users.id,
      fullName: schema.users.fullName,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
      role: schema.memberships.role,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.userId, userId))
    .orderBy(desc(schema.memberships.isDefaultWorkspace), asc(schema.memberships.joinedAt));

  return member ?? null;
}

export async function resolveMembershipByWorkspace(args: {
  userId: string;
  tenantId: string;
  workspaceId: string;
}) {
  const [member] = await db
    .select({
      membershipId: schema.memberships.id,
      userId: schema.memberships.userId,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
      role: schema.memberships.role,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
    })
    .from(schema.memberships)
    .where(and(
      eq(schema.memberships.userId, args.userId),
      eq(schema.memberships.tenantId, args.tenantId),
      eq(schema.memberships.workspaceId, args.workspaceId),
    ))
    .limit(1);

  return member ?? null;
}

export async function listWorkspaceMembers(args: {
  tenantId: string;
  workspaceId: string;
}) {
  return db
    .select({
      membershipId: schema.memberships.id,
      userId: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
      role: schema.memberships.role,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
      joinedAt: schema.memberships.joinedAt,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(
      eq(schema.memberships.tenantId, args.tenantId),
      eq(schema.memberships.workspaceId, args.workspaceId),
    ))
    .orderBy(
      asc(sql`case ${schema.memberships.role}
        when 'owner' then 0
        when 'admin' then 1
        when 'manager' then 2
        when 'member' then 3
        else 4
      end`),
      asc(schema.users.fullName),
      asc(schema.users.email),
    );
}

export async function countWorkspaceOwners(args: {
  tenantId: string;
  workspaceId: string;
}) {
  const [summary] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(schema.memberships)
    .where(and(
      eq(schema.memberships.tenantId, args.tenantId),
      eq(schema.memberships.workspaceId, args.workspaceId),
      eq(schema.memberships.role, "owner"),
    ));

  return summary?.total ?? 0;
}

export async function createTenantWorkspaceForUser(args: {
  userId: string;
  tenantName: string;
  workspaceName: string;
  workspaceDescription?: string | null;
  allowAdditionalTenant?: boolean;
}) {
  if (!args.allowAdditionalTenant) {
    const [existingTenantMembership] = await db
      .select({ tenantId: schema.memberships.tenantId })
      .from(schema.memberships)
      .where(eq(schema.memberships.userId, args.userId))
      .limit(1);

    if (existingTenantMembership) {
      throw new Error("This account already belongs to an organization. Use workspace creation inside the current tenant.");
    }
  }

  const tenantSlug = await ensureUniqueTenantSlug(args.tenantName);

  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: args.tenantName.trim(),
      slug: tenantSlug,
      plan: "free",
      status: "active",
      settingsJson: {},
    })
    .returning({
      id: schema.tenants.id,
      slug: schema.tenants.slug,
      name: schema.tenants.name,
    });

  const workspaceSlug = await ensureUniqueWorkspaceSlug(tenant.id, args.workspaceName);

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      tenantId: tenant.id,
      name: args.workspaceName.trim(),
      slug: workspaceSlug,
      description: args.workspaceDescription?.trim() || null,
      visibility: "private",
      createdBy: args.userId,
    })
    .returning({
      id: schema.workspaces.id,
      slug: schema.workspaces.slug,
      name: schema.workspaces.name,
    });

  const [membership] = await db
    .insert(schema.memberships)
    .values({
      tenantId: tenant.id,
      workspaceId: workspace.id,
      userId: args.userId,
      role: "owner",
      isDefaultWorkspace: true,
    })
    .returning({
      id: schema.memberships.id,
    });

  await setDefaultWorkspaceForUser({
    userId: args.userId,
    membershipId: membership.id,
  });
  await ensureWorkspaceTaskStatuses({
    tenantId: tenant.id,
    workspaceId: workspace.id,
  });

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    workspaceName: workspace.name,
  };
}

export async function createWorkspaceForTenant(args: {
  tenantId: string;
  userId: string;
  workspaceName: string;
  workspaceDescription?: string | null;
  creatorRole: string;
}) {
  const [tenant] = await db
    .select({
      slug: schema.tenants.slug,
      name: schema.tenants.name,
      plan: schema.tenants.plan,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, args.tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const [workspaceSummary] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.tenantId, args.tenantId));

  const workspaceLimit = getWorkspaceLimitForPlan(tenant.plan);
  if ((workspaceSummary?.total ?? 0) >= workspaceLimit) {
    throw new Error(`This tenant is on the ${tenant.plan} plan and is limited to ${workspaceLimit} workspace${workspaceLimit === 1 ? "" : "s"}.`);
  }

  const workspaceSlug = await ensureUniqueWorkspaceSlug(args.tenantId, args.workspaceName);

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      tenantId: args.tenantId,
      name: args.workspaceName.trim(),
      slug: workspaceSlug,
      description: args.workspaceDescription?.trim() || null,
      visibility: "private",
      createdBy: args.userId,
    })
    .returning({
      id: schema.workspaces.id,
      slug: schema.workspaces.slug,
      name: schema.workspaces.name,
    });

  const [membership] = await db
    .insert(schema.memberships)
    .values({
      tenantId: args.tenantId,
      workspaceId: workspace.id,
      userId: args.userId,
      role: args.creatorRole === "owner" ? "owner" : "admin",
      isDefaultWorkspace: true,
    })
    .onConflictDoUpdate({
      target: [schema.memberships.tenantId, schema.memberships.workspaceId, schema.memberships.userId],
      set: {
        role: args.creatorRole === "owner" ? "owner" : "admin",
        isDefaultWorkspace: true,
      },
    })
    .returning({
      id: schema.memberships.id,
    });

  await setDefaultWorkspaceForUser({
    userId: args.userId,
    membershipId: membership.id,
  });
  await ensureWorkspaceTaskStatuses({
    tenantId: args.tenantId,
    workspaceId: workspace.id,
  });

  return {
    tenantId: args.tenantId,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    workspaceName: workspace.name,
  };
}

export async function updateWorkspaceDetails(args: {
  tenantId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceDescription?: string | null;
}) {
  const [existingWorkspace] = await db
    .select({
      id: schema.workspaces.id,
      tenantId: schema.workspaces.tenantId,
      slug: schema.workspaces.slug,
    })
    .from(schema.workspaces)
    .where(and(
      eq(schema.workspaces.id, args.workspaceId),
      eq(schema.workspaces.tenantId, args.tenantId),
    ))
    .limit(1);

  if (!existingWorkspace) {
    throw new Error("Workspace not found");
  }

  const nextName = args.workspaceName.trim();
  const nextSlug = nextName === ""
    ? existingWorkspace.slug
    : slugifyName(nextName) === existingWorkspace.slug
      ? existingWorkspace.slug
      : await ensureUniqueWorkspaceSlug(args.tenantId, nextName);

  const [tenant] = await db
    .select({
      slug: schema.tenants.slug,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, args.tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const [workspace] = await db
    .update(schema.workspaces)
    .set({
      name: nextName,
      slug: nextSlug,
      description: args.workspaceDescription?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(schema.workspaces.id, args.workspaceId),
      eq(schema.workspaces.tenantId, args.tenantId),
    ))
    .returning({
      id: schema.workspaces.id,
      slug: schema.workspaces.slug,
      name: schema.workspaces.name,
      description: schema.workspaces.description,
    });

  return {
    tenantSlug: tenant.slug,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    workspaceName: workspace.name,
    workspaceDescription: workspace.description,
  };
}

export async function addWorkspaceMemberByEmail(args: {
  tenantId: string;
  workspaceId: string;
  email: string;
  role: "owner" | "admin" | "manager" | "member" | "guest";
}) {
  const email = args.email.trim().toLowerCase();

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
    });

  const [membership] = await db
    .insert(schema.memberships)
    .values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      userId: user.id,
      role: args.role,
      isDefaultWorkspace: false,
    })
    .onConflictDoUpdate({
      target: [schema.memberships.tenantId, schema.memberships.workspaceId, schema.memberships.userId],
      set: {
        role: args.role,
      },
    })
    .returning({
      id: schema.memberships.id,
      role: schema.memberships.role,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
      joinedAt: schema.memberships.joinedAt,
    });

  return {
    membershipId: membership.id,
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: membership.role,
    isDefaultWorkspace: membership.isDefaultWorkspace,
    joinedAt: membership.joinedAt,
  };
}

export async function updateMembershipRole(args: {
  membershipId: string;
  tenantId: string;
  workspaceId: string;
  role: "owner" | "admin" | "manager" | "member" | "guest";
}) {
  const [membership] = await db
    .update(schema.memberships)
    .set({
      role: args.role,
    })
    .where(and(
      eq(schema.memberships.id, args.membershipId),
      eq(schema.memberships.tenantId, args.tenantId),
      eq(schema.memberships.workspaceId, args.workspaceId),
    ))
    .returning({
      id: schema.memberships.id,
      role: schema.memberships.role,
      userId: schema.memberships.userId,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
    });

  return membership ?? null;
}

export async function removeMembership(args: {
  membershipId: string;
  tenantId: string;
  workspaceId: string;
}) {
  const [membership] = await db
    .delete(schema.memberships)
    .where(and(
      eq(schema.memberships.id, args.membershipId),
      eq(schema.memberships.tenantId, args.tenantId),
      eq(schema.memberships.workspaceId, args.workspaceId),
    ))
    .returning({
      id: schema.memberships.id,
      userId: schema.memberships.userId,
      role: schema.memberships.role,
      isDefaultWorkspace: schema.memberships.isDefaultWorkspace,
    });

  return membership ?? null;
}
