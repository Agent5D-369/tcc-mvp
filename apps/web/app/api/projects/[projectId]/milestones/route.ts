import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const createMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().optional(),
});

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { projectId } = await params;
    const body = createMilestoneSchema.parse(await req.json());

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

    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    const [lastMilestone] = await db
      .select({
        sortOrder: schema.milestones.sortOrder,
      })
      .from(schema.milestones)
      .where(eq(schema.milestones.projectId, project.id))
      .orderBy(desc(schema.milestones.sortOrder))
      .limit(1);

    const [milestone] = await db
      .insert(schema.milestones)
      .values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        projectId: project.id,
        name: body.name,
        description: body.description || null,
        dueAt,
        sortOrder: (lastMilestone?.sortOrder ?? -1) + 1,
        metadataJson: {},
        createdBy: ctx.userId,
      })
      .returning();

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
