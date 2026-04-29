import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export async function getCompiledKnowledge(args: {
  tenantId: string;
  workspaceSlug: string;
}) {
  const { tenantId, workspaceSlug } = args;

  const [workspace] = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
    })
    .from(schema.workspaces)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.workspaces.tenantId))
    .where(and(
      eq(schema.workspaces.tenantId, tenantId),
      eq(schema.workspaces.slug, workspaceSlug),
    ))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const pages = await db
    .select({
      id: schema.compiledPages.id,
      slug: schema.compiledPages.slug,
      title: schema.compiledPages.title,
      pageType: schema.compiledPages.pageType,
      summary: schema.compiledPages.summary,
      sourceConfidenceBps: schema.compiledPages.sourceConfidenceBps,
      updatedAt: schema.compiledPages.updatedAt,
      revisionCount: sql<number>`count(${schema.compiledPageRevisions.id})`.mapWith(Number),
      latestRevision: sql<number>`max(${schema.compiledPageRevisions.revisionNumber})`.mapWith(Number),
      pendingProposalCount: sql<number>`
        count(${schema.proposals.id}) filter (
          where ${schema.proposals.status} = 'pending'
        )
      `.mapWith(Number),
    })
    .from(schema.compiledPages)
    .leftJoin(schema.compiledPageRevisions, eq(schema.compiledPageRevisions.pageId, schema.compiledPages.id))
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.workspaceId, schema.compiledPages.workspaceId),
        eq(schema.proposals.targetType, "compiled_page"),
      ),
    )
    .where(and(
      eq(schema.compiledPages.tenantId, tenantId),
      eq(schema.compiledPages.workspaceId, workspace.id),
      eq(schema.compiledPages.status, "active"),
    ))
    .groupBy(schema.compiledPages.id)
    .orderBy(desc(schema.compiledPages.updatedAt));

  const projects = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      slug: schema.projects.slug,
      status: schema.projects.status,
    })
    .from(schema.projects)
    .where(and(
      eq(schema.projects.tenantId, tenantId),
      eq(schema.projects.workspaceId, workspace.id),
    ))
    .orderBy(desc(schema.projects.updatedAt))
    .limit(40);

  return {
    workspace,
    projects,
    pages: pages.map((page) => ({
      ...page,
      revisionCount: Number(page.revisionCount || 0),
      latestRevision: page.latestRevision ? Number(page.latestRevision) : null,
      pendingProposalCount: Number(page.pendingProposalCount || 0),
      updatedAt: page.updatedAt.toISOString(),
    })),
  };
}

export async function getCompiledPage(args: {
  tenantId: string;
  workspaceSlug: string;
  pageSlug: string;
}) {
  const { tenantId, workspaceSlug, pageSlug } = args;

  const [page] = await db
    .select({
      id: schema.compiledPages.id,
      slug: schema.compiledPages.slug,
      title: schema.compiledPages.title,
      pageType: schema.compiledPages.pageType,
      summary: schema.compiledPages.summary,
      sourceConfidenceBps: schema.compiledPages.sourceConfidenceBps,
      updatedAt: schema.compiledPages.updatedAt,
      workspaceId: schema.workspaces.id,
      projectId: schema.compiledPages.projectId,
      workspaceName: schema.workspaces.name,
      workspaceSlug: schema.workspaces.slug,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
      projectName: schema.projects.name,
    })
    .from(schema.compiledPages)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.compiledPages.workspaceId))
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.compiledPages.tenantId))
    .leftJoin(schema.projects, eq(schema.projects.id, schema.compiledPages.projectId))
    .where(and(
      eq(schema.compiledPages.tenantId, tenantId),
      eq(schema.workspaces.slug, workspaceSlug),
      eq(schema.compiledPages.slug, pageSlug),
      eq(schema.compiledPages.status, "active"),
    ))
    .limit(1);

  if (!page) {
    throw new Error("Compiled page not found");
  }

  const revisions = await db
    .select({
      id: schema.compiledPageRevisions.id,
      revisionNumber: schema.compiledPageRevisions.revisionNumber,
      contentMarkdown: schema.compiledPageRevisions.contentMarkdown,
      changeSummary: schema.compiledPageRevisions.changeSummary,
      reviewStatus: schema.compiledPageRevisions.reviewStatus,
      reviewedAt: schema.compiledPageRevisions.reviewedAt,
      createdAt: schema.compiledPageRevisions.createdAt,
      interactionId: schema.interactions.id,
      interactionTitle: schema.interactions.title,
      interactionSummary: schema.interactions.summary,
      sourceLabel: schema.interactions.sourceLabel,
      sourceExcerpt: schema.interactions.rawContent,
    })
    .from(schema.compiledPageRevisions)
    .leftJoin(schema.interactions, eq(schema.interactions.id, schema.compiledPageRevisions.interactionId))
    .where(and(
      eq(schema.compiledPageRevisions.tenantId, tenantId),
      eq(schema.compiledPageRevisions.pageId, page.id),
    ))
    .orderBy(desc(schema.compiledPageRevisions.revisionNumber));

  const pendingProposals = await db
    .select({
      id: schema.proposals.id,
      title: schema.proposals.title,
      bodyMarkdown: schema.proposals.bodyMarkdown,
      sourceExcerpt: schema.proposals.sourceExcerpt,
      confidenceBps: schema.proposals.confidenceBps,
      queueName: schema.queues.name,
      createdAt: schema.proposals.createdAt,
    })
    .from(schema.proposals)
    .leftJoin(schema.queues, eq(schema.queues.id, schema.proposals.queueId))
    .where(and(
      eq(schema.proposals.tenantId, tenantId),
      eq(schema.proposals.workspaceId, page.workspaceId),
      eq(schema.proposals.targetType, "compiled_page"),
      eq(schema.proposals.status, "pending"),
    ))
    .orderBy(desc(schema.proposals.createdAt));

  const relatedTasks = page.projectId ? await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      priority: schema.tasks.priority,
      dueAt: schema.tasks.dueAt,
      statusName: schema.taskStatuses.name,
    })
    .from(schema.tasks)
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .where(and(
      eq(schema.tasks.tenantId, tenantId),
      eq(schema.tasks.workspaceId, page.workspaceId),
      eq(schema.tasks.projectId, page.projectId),
    ))
    .orderBy(desc(schema.tasks.updatedAt))
    .limit(5) : [];

  const relatedDecisions = page.projectId ? await db
    .select({
      id: schema.decisionLog.id,
      title: schema.decisionLog.title,
      status: schema.decisionLog.status,
      decidedAt: schema.decisionLog.decidedAt,
    })
    .from(schema.decisionLog)
    .where(and(
      eq(schema.decisionLog.tenantId, tenantId),
      eq(schema.decisionLog.workspaceId, page.workspaceId),
      eq(schema.decisionLog.projectId, page.projectId),
    ))
    .orderBy(desc(schema.decisionLog.updatedAt))
    .limit(5) : [];

  return {
    page: {
      ...page,
      updatedAt: page.updatedAt.toISOString(),
    },
    revisions: revisions.map((revision) => ({
      ...revision,
      reviewedAt: revision.reviewedAt ? revision.reviewedAt.toISOString() : null,
      createdAt: revision.createdAt.toISOString(),
      sourceExcerpt: revision.sourceExcerpt ? `${revision.sourceExcerpt.slice(0, 280)}${revision.sourceExcerpt.length > 280 ? "..." : ""}` : null,
    })),
    pendingProposals: pendingProposals.map((proposal) => ({
      ...proposal,
      createdAt: proposal.createdAt.toISOString(),
    })),
    relatedTasks: relatedTasks.map((task) => ({
      ...task,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    })),
    relatedDecisions: relatedDecisions.map((decision) => ({
      ...decision,
      decidedAt: decision.decidedAt ? decision.decidedAt.toISOString() : null,
    })),
  };
}
