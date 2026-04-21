import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { getProjectOverview } from "@workspace-kit/projects";

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { projectId } = await params;

    const [project] = await db
      .select({
        id: schema.projects.id,
        slug: schema.projects.slug,
        workspaceSlug: schema.workspaces.slug,
      })
      .from(schema.projects)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.projects.workspaceId))
      .where(and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.tenantId, ctx.tenantId),
      ))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const payload = await getProjectOverview({
      tenantId: ctx.tenantId,
      workspaceSlug: project.workspaceSlug,
      projectSlug: project.slug,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
