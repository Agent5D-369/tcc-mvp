import { db, schema } from "@workspace-kit/db";

export async function recordAuditEvent(args: {
  tenantId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadataJson?: Record<string, unknown>;
}) {
  try {
    await db.insert(schema.auditEvents).values({
      tenantId: args.tenantId ?? null,
      workspaceId: args.workspaceId ?? null,
      userId: args.userId ?? null,
      action: args.action,
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
      metadataJson: args.metadataJson ?? {},
    });
  } catch (error) {
    console.error("[audit] failed to record event", error);
  }
}
