export type WorkspaceRole = "owner" | "admin" | "manager" | "member" | "guest";

type TenantContextLike = {
  role: string;
  isDemoUser?: boolean;
  isPlatformAdmin?: boolean;
};

const workEditorRoles = new Set(["owner", "admin", "manager", "member"]);
const adminRoles = new Set(["owner", "admin"]);

export function assertCanEditWorkspace(ctx: TenantContextLike) {
  if (ctx.isPlatformAdmin) {
    return;
  }

  if (!workEditorRoles.has(ctx.role)) {
    throw new Error("You do not have permission to edit this workspace");
  }
}

export function assertCanAdminWorkspace(ctx: TenantContextLike) {
  if (ctx.isPlatformAdmin) {
    return;
  }

  if (!adminRoles.has(ctx.role)) {
    throw new Error("You do not have permission to manage this workspace");
  }
}

export function assertNotDemoUser(ctx: TenantContextLike) {
  if (ctx.isDemoUser) {
    throw new Error("Demo access cannot change workspace structure, members, agents, or AI settings");
  }
}
