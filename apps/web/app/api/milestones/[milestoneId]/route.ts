import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

const updateMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.union([z.string().trim().max(2000), z.null()]).optional(),
  dueAt: z.union([z.string(), z.null()]).optional(),
});

type RouteParams = {
  params: Promise<{ milestoneId: string }>;
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
    assertCanEditWorkspace(ctx);
    const { milestoneId } = await params;
    const body = updateMilestoneSchema.parse(await req.json());

    const [milestone] = await db
      .select({ id: schema.milestones.id })
      .from(schema.milestones)
      .where(and(
        eq(schema.milestones.id, milestoneId),
        eq(schema.milestones.tenantId, ctx.tenantId),
        eq(schema.milestones.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const updateValues: Partial<typeof schema.milestones.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateValues.name = body.name;
    }
    if (body.description !== undefined) {
      updateValues.description = body.description || null;
    }
    if (body.dueAt !== undefined) {
      updateValues.dueAt = parseDueAt(body.dueAt);
    }

    const [updatedMilestone] = await db
      .update(schema.milestones)
      .set(updateValues)
      .where(eq(schema.milestones.id, milestone.id))
      .returning({
        id: schema.milestones.id,
        name: schema.milestones.name,
        description: schema.milestones.description,
        dueAt: schema.milestones.dueAt,
      });

    return NextResponse.json({
      milestone: {
        ...updatedMilestone,
        dueAt: updatedMilestone.dueAt ? updatedMilestone.dueAt.toISOString() : null,
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
    const { milestoneId } = await params;

    const [milestone] = await db
      .select({ id: schema.milestones.id })
      .from(schema.milestones)
      .where(and(
        eq(schema.milestones.id, milestoneId),
        eq(schema.milestones.tenantId, ctx.tenantId),
        eq(schema.milestones.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    await db.delete(schema.milestones).where(eq(schema.milestones.id, milestone.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
