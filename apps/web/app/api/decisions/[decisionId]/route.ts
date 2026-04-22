import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const updateDecisionSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  context: z.union([z.string().trim().max(2000), z.null()]).optional(),
  decisionText: z.string().trim().min(1).max(4000).optional(),
  status: z.enum(["proposed", "accepted", "rejected", "superseded"]).optional(),
});

type RouteParams = {
  params: Promise<{ decisionId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { decisionId } = await params;
    const body = updateDecisionSchema.parse(await req.json());

    const [decision] = await db
      .select({ id: schema.decisionLog.id })
      .from(schema.decisionLog)
      .where(and(
        eq(schema.decisionLog.id, decisionId),
        eq(schema.decisionLog.tenantId, ctx.tenantId),
        eq(schema.decisionLog.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!decision) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    const updateValues: Partial<typeof schema.decisionLog.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      updateValues.title = body.title;
    }
    if (body.context !== undefined) {
      updateValues.context = body.context || null;
    }
    if (body.decisionText !== undefined) {
      updateValues.decisionText = body.decisionText;
    }
    if (body.status !== undefined) {
      updateValues.status = body.status;
      updateValues.decidedAt = body.status === "accepted" ? new Date() : null;
    }

    const [updatedDecision] = await db
      .update(schema.decisionLog)
      .set(updateValues)
      .where(eq(schema.decisionLog.id, decision.id))
      .returning({
        id: schema.decisionLog.id,
        title: schema.decisionLog.title,
        context: schema.decisionLog.context,
        decisionText: schema.decisionLog.decisionText,
        status: schema.decisionLog.status,
        decidedAt: schema.decisionLog.decidedAt,
      });

    return NextResponse.json({
      decision: {
        ...updatedDecision,
        decidedAt: updatedDecision.decidedAt ? updatedDecision.decidedAt.toISOString() : null,
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
    const { decisionId } = await params;

    const [decision] = await db
      .select({ id: schema.decisionLog.id })
      .from(schema.decisionLog)
      .where(and(
        eq(schema.decisionLog.id, decisionId),
        eq(schema.decisionLog.tenantId, ctx.tenantId),
        eq(schema.decisionLog.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!decision) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    await db.delete(schema.decisionLog).where(eq(schema.decisionLog.id, decision.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
