import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.union([z.string().trim().max(2000), z.null()]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueAt: z.union([z.string(), z.null()]).optional(),
  statusId: z.union([z.string().uuid(), z.null()]).optional(),
});

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

function parseDueAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid due date");
  }

  return parsed;
}

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

    if (body.statusId) {
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
    }

    const updateValues: Partial<typeof schema.tasks.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      updateValues.title = body.title;
    }
    if (body.description !== undefined) {
      updateValues.description = body.description || null;
    }
    if (body.priority !== undefined) {
      updateValues.priority = body.priority;
    }
    if (body.dueAt !== undefined) {
      updateValues.dueAt = parseDueAt(body.dueAt);
    }
    if (body.statusId !== undefined) {
      updateValues.statusId = body.statusId;
    }

    const [updatedTask] = await db
      .update(schema.tasks)
      .set(updateValues)
      .where(eq(schema.tasks.id, task.id))
      .returning({
        id: schema.tasks.id,
        title: schema.tasks.title,
        description: schema.tasks.description,
        priority: schema.tasks.priority,
        dueAt: schema.tasks.dueAt,
        statusId: schema.tasks.statusId,
      });

    return NextResponse.json({
      task: {
        ...updatedTask,
        dueAt: updatedTask.dueAt ? updatedTask.dueAt.toISOString() : null,
      },
    });
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
    const { taskId } = await params;

    const [task] = await db
      .select({
        id: schema.tasks.id,
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

    await db.delete(schema.tasks).where(eq(schema.tasks.id, task.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
