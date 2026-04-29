import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const createPageSchema = z.object({
  title: z.string().trim().min(1).max(140),
  pageType: z.string().trim().min(1).max(60).default("note"),
  summary: z.string().trim().max(500).optional(),
  contentMarkdown: z.string().trim().max(20000).optional(),
  projectId: z.union([z.string().uuid(), z.null()]).optional(),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniquePageSlug(args: { tenantId: string; workspaceId: string; title: string }) {
  const base = slugify(args.title) || "knowledge-page";

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: schema.compiledPages.id })
      .from(schema.compiledPages)
      .where(and(
        eq(schema.compiledPages.tenantId, args.tenantId),
        eq(schema.compiledPages.workspaceId, args.workspaceId),
        eq(schema.compiledPages.slug, slug),
      ))
      .limit(1);

    if (!existing) {
      return slug;
    }
  }

  throw new Error("Could not generate a unique knowledge page slug");
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const body = createPageSchema.parse(await req.json());

    if (body.projectId) {
      const [project] = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(and(
          eq(schema.projects.id, body.projectId),
          eq(schema.projects.tenantId, ctx.tenantId),
          eq(schema.projects.workspaceId, ctx.workspaceId),
        ))
        .limit(1);

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const slug = await uniquePageSlug({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      title: body.title,
    });

    const [page] = await db.insert(schema.compiledPages).values({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      projectId: body.projectId ?? null,
      slug,
      title: body.title,
      pageType: body.pageType,
      status: "active",
      summary: body.summary || null,
      sourceConfidenceBps: 5000,
      humanOwnerId: ctx.userId,
      metadataJson: {
        origin: "manual",
      },
    }).returning({
      id: schema.compiledPages.id,
      slug: schema.compiledPages.slug,
      title: schema.compiledPages.title,
    });

    await db.insert(schema.compiledPageRevisions).values({
      tenantId: ctx.tenantId,
      pageId: page.id,
      interactionId: null,
      revisionNumber: 1,
      contentMarkdown: body.contentMarkdown || `# ${body.title}\n\n`,
      changeSummary: "Created manually.",
      reviewStatus: "approved",
      reviewedBy: ctx.userId,
      reviewedAt: new Date(),
    });

    await recordAuditEvent({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "knowledge_page.created",
      entityType: "compiled_page",
      entityId: page.id,
      metadataJson: {
        pageType: body.pageType,
        projectId: body.projectId ?? null,
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
