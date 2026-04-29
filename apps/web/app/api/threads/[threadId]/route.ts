import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const updateThreadSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  pinned: z.boolean().optional(),
});

type RouteParams = {
  params: Promise<{ threadId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { threadId } = await params;
    const body = updateThreadSchema.parse(await req.json());

    const [thread] = await db
      .update(schema.threads)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.threads.id, threadId),
        eq(schema.threads.tenantId, ctx.tenantId),
        eq(schema.threads.workspaceId, ctx.workspaceId),
      ))
      .returning({
        id: schema.threads.id,
        title: schema.threads.title,
        pinned: schema.threads.pinned,
      });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    await recordAuditEvent({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "thread.updated",
      entityType: "thread",
      entityId: thread.id,
      metadataJson: {
        titleChanged: body.title !== undefined,
        pinnedChanged: body.pinned !== undefined,
      },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { threadId } = await params;

    const [thread] = await db
      .update(schema.threads)
      .set({
        archivedAt: new Date(),
        pinned: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.threads.id, threadId),
        eq(schema.threads.tenantId, ctx.tenantId),
        eq(schema.threads.workspaceId, ctx.workspaceId),
      ))
      .returning({ id: schema.threads.id });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    await recordAuditEvent({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "thread.archived",
      entityType: "thread",
      entityId: thread.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
