import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const createProjectSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional(),
});

export async function GET() {
  try {
    const ctx = await resolveTenantContext();

    const projects = await db
      .select()
      .from(schema.projects)
      .where(and(
        eq(schema.projects.tenantId, ctx.tenantId),
        eq(schema.projects.workspaceId, ctx.workspaceId),
      ))
      .orderBy(desc(schema.projects.updatedAt));

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext();
    const body = createProjectSchema.parse(await req.json());

    const [project] = await db.insert(schema.projects).values({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      name: body.name,
      slug: body.slug,
      summary: body.summary || null,
      status: "draft",
      health: "unknown",
      ownerId: ctx.userId,
      metadataJson: {},
    }).returning();

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
