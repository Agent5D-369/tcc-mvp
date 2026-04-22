import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
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
    const slug = normalizeSlug(body.slug || body.name);

    if (!slug) {
      return NextResponse.json({ error: "A valid project slug is required" }, { status: 400 });
    }

    const [existingProject] = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(and(
        eq(schema.projects.tenantId, ctx.tenantId),
        eq(schema.projects.workspaceId, ctx.workspaceId),
        eq(schema.projects.slug, slug),
      ))
      .limit(1);

    if (existingProject) {
      return NextResponse.json({ error: "A project with that slug already exists" }, { status: 409 });
    }

    const [project] = await db.insert(schema.projects).values({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      name: body.name,
      slug,
      summary: body.summary?.trim() || null,
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
