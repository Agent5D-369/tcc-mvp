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
      },
    });

    return NextResponse.json({ project, template }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
