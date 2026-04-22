import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const updateTaskSchema = z.object({
  statusId: z.string().uuid(),
});

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { taskId } = await params;
    const body = updateTaskSchema.parse(await req.json());

    const [task] = await db
      .select({
        id: schema.tasks.id,
        tenantId: schema.tasks.tenantId,
        workspaceId: schema.tasks.workspaceId,
      })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.tenantId, ctx.tenantId),
        eq(schema.tasks.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [status] = await db
      .select({
        id: schema.taskStatuses.id,
      })
      .from(schema.taskStatuses)
      .where(and(
        eq(schema.taskStatuses.id, body.statusId),
        eq(schema.taskStatuses.tenantId, ctx.tenantId),
        eq(schema.taskStatuses.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }

    const [updatedTask] = await db
      .update(schema.tasks)
      .set({
        statusId: status.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, task.id))
      .returning({
        id: schema.tasks.id,
        statusId: schema.tasks.statusId,
      });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
