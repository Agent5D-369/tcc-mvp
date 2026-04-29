import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueAt: z.string().optional(),
});

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { projectId } = await params;
    const body = createTaskSchema.parse(await req.json());

    const [project] = await db
      .select({
        id: schema.projects.id,
        tenantId: schema.projects.tenantId,
        workspaceId: schema.projects.workspaceId,
      })
      .from(schema.projects)
      .where(and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.tenantId, ctx.tenantId),
        eq(schema.projects.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [defaultStatus] = await db
      .select({
        id: schema.taskStatuses.id,
      })
      .from(schema.taskStatuses)
      .where(and(
        eq(schema.taskStatuses.workspaceId, ctx.workspaceId),
        eq(schema.taskStatuses.tenantId, ctx.tenantId),
      ))
      .orderBy(desc(schema.taskStatuses.isDefault), asc(schema.taskStatuses.sortOrder))
      .limit(1);

    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    const [task] = await db
      .insert(schema.tasks)
      .values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        projectId: project.id,
        statusId: defaultStatus?.id ?? null,
        title: body.title,
        description: body.description || null,
        priority: body.priority,
        assigneeId: null,
        reporterId: ctx.userId,
        dueAt,
        sourceType: "manual",
        sourceId: null,
        rank: null,
        metadataJson: {},
      })
      .returning();

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
