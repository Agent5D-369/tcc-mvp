import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

const createDecisionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  context: z.string().trim().max(2000).optional(),
  decisionText: z.string().trim().min(1).max(4000),
  status: z.enum(["proposed", "accepted", "rejected", "superseded"]).default("accepted"),
});

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { projectId } = await params;
    const body = createDecisionSchema.parse(await req.json());

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

    const decidedAt = body.status === "accepted" ? new Date() : null;

    const [decision] = await db
      .insert(schema.decisionLog)
      .values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        projectId: project.id,
        title: body.title,
        context: body.context || null,
        decisionText: body.decisionText,
        status: body.status,
        decidedBy: ctx.userId,
        decidedAt,
        sourceType: "manual",
        sourceId: null,
      })
      .returning();

    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
