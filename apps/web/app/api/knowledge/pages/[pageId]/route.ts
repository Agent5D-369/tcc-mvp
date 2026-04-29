import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const updatePageSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  pageType: z.string().trim().min(1).max(60).optional(),
  summary: z.string().trim().max(500).optional(),
  contentMarkdown: z.string().trim().min(1).max(20000).optional(),
  changeSummary: z.string().trim().max(240).optional(),
});

type RouteParams = {
  params: Promise<{ pageId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { pageId } = await params;
    const body = updatePageSchema.parse(await req.json());

    const [page] = await db
      .select({
        id: schema.compiledPages.id,
        title: schema.compiledPages.title,
        slug: schema.compiledPages.slug,
      })
      .from(schema.compiledPages)
      .where(and(
        eq(schema.compiledPages.id, pageId),
        eq(schema.compiledPages.tenantId, ctx.tenantId),
        eq(schema.compiledPages.workspaceId, ctx.workspaceId),
        eq(schema.compiledPages.status, "active"),
      ))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Knowledge page not found" }, { status: 404 });
    }

    const pagePatch: Partial<typeof schema.compiledPages.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      pagePatch.title = body.title;
    }
    if (body.pageType !== undefined) {
      pagePatch.pageType = body.pageType;
    }
    if (body.summary !== undefined) {
      pagePatch.summary = body.summary || null;
    }

    const [updatedPage] = await db
      .update(schema.compiledPages)
      .set(pagePatch)
      .where(eq(schema.compiledPages.id, page.id))
      .returning({
        id: schema.compiledPages.id,
        slug: schema.compiledPages.slug,
        title: schema.compiledPages.title,
      });

    let revisionId: string | null = null;
    if (body.contentMarkdown !== undefined) {
      const [revisionSummary] = await db
        .select({
          nextRevision: sql<number>`coalesce(max(${schema.compiledPageRevisions.revisionNumber}), 0) + 1`.mapWith(Number),
        })
        .from(schema.compiledPageRevisions)
        .where(eq(schema.compiledPageRevisions.pageId, page.id));

      const [revision] = await db.insert(schema.compiledPageRevisions).values({
        tenantId: ctx.tenantId,
        pageId: page.id,
        interactionId: null,
        revisionNumber: revisionSummary?.nextRevision ?? 1,
        contentMarkdown: body.contentMarkdown,
        changeSummary: body.changeSummary || "Manual page update.",
        reviewStatus: "approved",
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
      }).returning({
        id: schema.compiledPageRevisions.id,
      });

      revisionId = revision.id;
    }

    await recordAuditEvent({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "knowledge_page.updated",
      entityType: "compiled_page",
      entityId: page.id,
      metadataJson: {
        revisionId,
        changedContent: body.contentMarkdown !== undefined,
      },
    });

    return NextResponse.json({ page: updatedPage, revisionId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
