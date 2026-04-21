import { and, eq } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export async function getActiveWorkspaceRoute(args: { tenantId: string; workspaceId: string }) {
  const [route] = await db
    .select({
      tenantId: schema.tenants.id,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
      workspaceId: schema.workspaces.id,
      workspaceName: schema.workspaces.name,
      workspaceSlug: schema.workspaces.slug,
    })
    .from(schema.workspaces)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.workspaces.tenantId))
    .where(and(
      eq(schema.workspaces.id, args.workspaceId),
      eq(schema.workspaces.tenantId, args.tenantId),
    ))
    .limit(1);

  return route ?? null;
}

