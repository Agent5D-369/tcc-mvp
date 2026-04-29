import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  summary: z.union([z.string().trim().max(2000), z.null()]).optional(),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
  health: z.enum(["green", "yellow", "red", "unknown"]).optional(),
  startDate: z.union([z.string(), z.null()]).optional(),
  targetDate: z.union([z.string(), z.null()]).optional(),
});

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

function parseDateValue(value: string | null | undefined, label: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label}`);
  }

  return parsed;
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { projectId } = await params;

    const [project] = await db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        slug: schema.projects.slug,
        summary: schema.projects.summary,
        status: schema.projects.status,
        health: schema.projects.health,
        startDate: schema.projects.startDate,
        targetDate: schema.projects.targetDate,
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

    return NextResponse.json({
      project: {
        ...project,
        startDate: project.startDate ? project.startDate.toISOString() : null,
        targetDate: project.targetDate ? project.targetDate.toISOString() : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { projectId } = await params;
    const body = updateProjectSchema.parse(await req.json());

    const [project] = await db
      .select({ id: schema.projects.id })
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

    const updateValues: Partial<typeof schema.projects.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateValues.name = body.name;
    }
    if (body.summary !== undefined) {
      updateValues.summary = body.summary || null;
    }
    if (body.status !== undefined) {
      updateValues.status = body.status;
    }
    if (body.health !== undefined) {
      updateValues.health = body.health;
    }
    if (body.startDate !== undefined) {
      updateValues.startDate = parseDateValue(body.startDate, "start date");
    }
    if (body.targetDate !== undefined) {
      updateValues.targetDate = parseDateValue(body.targetDate, "target date");
    }

    const [updatedProject] = await db
      .update(schema.projects)
      .set(updateValues)
      .where(eq(schema.projects.id, project.id))
      .returning({
        id: schema.projects.id,
        name: schema.projects.name,
        summary: schema.projects.summary,
        status: schema.projects.status,
        health: schema.projects.health,
        startDate: schema.projects.startDate,
        targetDate: schema.projects.targetDate,
      });

    return NextResponse.json({
      project: {
        ...updatedProject,
        startDate: updatedProject.startDate ? updatedProject.startDate.toISOString() : null,
        targetDate: updatedProject.targetDate ? updatedProject.targetDate.toISOString() : null,
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
    assertCanEditWorkspace(ctx);
    const { projectId } = await params;

    const [project] = await db
      .select({ id: schema.projects.id })
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

    const [updatedProject] = await db
      .update(schema.projects)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, project.id))
      .returning({
        id: schema.projects.id,
        status: schema.projects.status,
      });

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
