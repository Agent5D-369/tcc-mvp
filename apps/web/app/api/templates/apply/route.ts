import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { getWorkspaceTemplate } from "@workspace-kit/templates";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const applyTemplateSchema = z.object({
  templateId: z.string().trim().min(2),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueProjectSlug(args: { tenantId: string; workspaceId: string; name: string }) {
  const base = slugify(args.name) || "template-project";

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(and(
        eq(schema.projects.tenantId, args.tenantId),
        eq(schema.projects.workspaceId, args.workspaceId),
        eq(schema.projects.slug, slug),
      ))
      .limit(1);

    if (!existing) {
      return slug;
    }
  }

  throw new Error("Could not generate a unique project slug");
}

async function uniquePageSlug(args: { tenantId: string; workspaceId: string; slug: string }) {
  const base = slugify(args.slug) || "template-page";

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

  throw new Error("Could not generate a unique page slug");
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const body = applyTemplateSchema.parse(await req.json());
    const template = getWorkspaceTemplate(body.templateId);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const slug = await uniqueProjectSlug({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      name: template.projectName,
    });

    const [project] = await db
      .insert(schema.projects)
      .values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        name: template.projectName,
        slug,
        summary: template.projectSummary,
        status: "active",
        health: "unknown",
        ownerId: ctx.userId,
        metadataJson: {
          templateId: template.id,
          helpsPrevent: template.helpsPrevent,
        },
      })
      .returning({
        id: schema.projects.id,
        slug: schema.projects.slug,
        name: schema.projects.name,
      });

    const [defaultStatus] = await db
      .select({ id: schema.taskStatuses.id })
      .from(schema.taskStatuses)
      .where(and(
        eq(schema.taskStatuses.tenantId, ctx.tenantId),
        eq(schema.taskStatuses.workspaceId, ctx.workspaceId),
      ))
      .orderBy(desc(schema.taskStatuses.isDefault), asc(schema.taskStatuses.sortOrder))
      .limit(1);

    for (const task of template.tasks) {
      await db.insert(schema.tasks).values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        projectId: project.id,
        statusId: defaultStatus?.id ?? null,
        title: task.title,
        description: task.description,
        priority: task.priority,
        assigneeId: null,
        reporterId: ctx.userId,
        dueAt: null,
        sourceType: "manual",
        sourceId: null,
        rank: null,
        metadataJson: {
          templateId: template.id,
        },
      });
    }

    const pages = [];
    for (const pageTemplate of template.pages) {
      const pageSlug = await uniquePageSlug({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        slug: pageTemplate.slug,
      });

      const [page] = await db.insert(schema.compiledPages).values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        projectId: project.id,
        slug: pageSlug,
        title: pageTemplate.title,
        pageType: pageTemplate.pageType,
        status: "active",
        summary: pageTemplate.summary,
        sourceConfidenceBps: 6500,
        humanOwnerId: ctx.userId,
        metadataJson: {
          templateId: template.id,
          seededBy: "workspace_template",
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
        contentMarkdown: pageTemplate.contentMarkdown,
        changeSummary: `Seeded from ${template.name} template.`,
        reviewStatus: "approved",
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
      });

      pages.push(page);
    }

    await recordAuditEvent({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "template.applied",
      entityType: "project",
      entityId: project.id,
      metadataJson: {
        templateId: template.id,
        taskCount: template.tasks.length,
        pageCount: pages.length,
      },
    });

    return NextResponse.json({ project, pages, template }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
