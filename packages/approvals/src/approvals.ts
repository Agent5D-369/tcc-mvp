import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

type ProposalPatch = Record<string, unknown>;

function stringFromPatch(patch: ProposalPatch, key: string) {
  const value = patch[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function priorityFromPatch(patch: ProposalPatch) {
  const value = stringFromPatch(patch, "priority");
  return value === "low" || value === "medium" || value === "high" || value === "urgent"
    ? value
    : "medium";
}

export async function getApprovalInbox(args: {
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

  const queues = await db
    .select({
      id: schema.queues.id,
      name: schema.queues.name,
      slug: schema.queues.slug,
      description: schema.queues.description,
      sortOrder: schema.queues.sortOrder,
    })
    .from(schema.queues)
    .where(and(
      eq(schema.queues.tenantId, tenantId),
      eq(schema.queues.workspaceId, workspace.id),
    ))
    .orderBy(asc(schema.queues.sortOrder), asc(schema.queues.name));

  const proposals = await db
    .select({
      id: schema.proposals.id,
      title: schema.proposals.title,
      targetType: schema.proposals.targetType,
      bodyMarkdown: schema.proposals.bodyMarkdown,
      status: schema.proposals.status,
      confidenceBps: schema.proposals.confidenceBps,
      sourceExcerpt: schema.proposals.sourceExcerpt,
      proposedPatchJson: schema.proposals.proposedPatchJson,
      createdAt: schema.proposals.createdAt,
      queueId: schema.proposals.queueId,
      queueName: schema.queues.name,
      projectName: schema.projects.name,
      interactionTitle: schema.interactions.title,
      interactionSummary: schema.interactions.summary,
      sourceLabel: schema.interactions.sourceLabel,
    })
    .from(schema.proposals)
    .leftJoin(schema.queues, eq(schema.queues.id, schema.proposals.queueId))
    .leftJoin(schema.projects, eq(schema.projects.id, schema.proposals.projectId))
    .leftJoin(schema.interactions, eq(schema.interactions.id, schema.proposals.interactionId))
    .where(and(
      eq(schema.proposals.tenantId, tenantId),
      eq(schema.proposals.workspaceId, workspace.id),
      eq(schema.proposals.status, "pending"),
    ))
    .orderBy(asc(schema.queues.sortOrder), desc(schema.proposals.createdAt));

  return {
    workspace,
    queues: queues.map((queue) => ({
      ...queue,
      proposals: proposals
        .filter((proposal) => proposal.queueId === queue.id)
        .map((proposal) => ({
          ...proposal,
          createdAt: proposal.createdAt.toISOString(),
        })),
    })),
    unqueued: proposals
      .filter((proposal) => !proposal.queueId)
      .map((proposal) => ({
        ...proposal,
        createdAt: proposal.createdAt.toISOString(),
      })),
  };
}

export async function approveProposal(args: {
  tenantId: string;
  workspaceId: string;
  userId: string;
  proposalId: string;
}) {
  const [proposal] = await db
    .select()
    .from(schema.proposals)
    .where(and(
      eq(schema.proposals.tenantId, args.tenantId),
      eq(schema.proposals.workspaceId, args.workspaceId),
      eq(schema.proposals.id, args.proposalId),
      eq(schema.proposals.status, "pending"),
    ))
    .limit(1);

  if (!proposal) {
    throw new Error("Pending proposal not found");
  }

  const patch = proposal.proposedPatchJson ?? {};
  let appliedEntityId: string | null = null;

  if (proposal.targetType === "task") {
    const [defaultStatus] = await db
      .select({ id: schema.taskStatuses.id })
      .from(schema.taskStatuses)
      .where(and(
        eq(schema.taskStatuses.workspaceId, args.workspaceId),
        eq(schema.taskStatuses.kind, "todo"),
      ))
      .limit(1);

    if (!proposal.projectId) {
      throw new Error("Task proposals require a project");
    }

    const [task] = await db.insert(schema.tasks).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: proposal.projectId,
      statusId: defaultStatus?.id ?? null,
      title: stringFromPatch(patch, "title") || proposal.title,
      description: proposal.bodyMarkdown,
      priority: priorityFromPatch(patch),
      assigneeId: null,
      reporterId: args.userId,
      dueAt: null,
      sourceType: "agent",
      sourceId: proposal.interactionId,
      rank: null,
      metadataJson: {
        proposalId: proposal.id,
        approvalInbox: true,
      },
    }).returning({ id: schema.tasks.id });

    appliedEntityId = task.id;
  } else if (proposal.targetType === "decision") {
    const [decision] = await db.insert(schema.decisionLog).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: proposal.projectId,
      title: proposal.title,
      context: proposal.bodyMarkdown,
      decisionText: stringFromPatch(patch, "decisionText") || proposal.bodyMarkdown || proposal.title,
      status: "accepted",
      decidedBy: args.userId,
      decidedAt: new Date(),
      sourceType: "agent",
      sourceId: proposal.interactionId,
    }).returning({ id: schema.decisionLog.id });

    appliedEntityId = decision.id;
  } else if (proposal.targetType === "compiled_page") {
    const pageSlug = stringFromPatch(patch, "pageSlug") || "project-overview";
    const [page] = await db
      .select({ id: schema.compiledPages.id })
      .from(schema.compiledPages)
      .where(and(
        eq(schema.compiledPages.workspaceId, args.workspaceId),
        eq(schema.compiledPages.slug, pageSlug),
      ))
      .limit(1);

    if (!page) {
      throw new Error(`Compiled page not found: ${pageSlug}`);
    }

    const [revisionSummary] = await db
      .select({
        nextRevision: sql<number>`coalesce(max(${schema.compiledPageRevisions.revisionNumber}), 0) + 1`.mapWith(Number),
      })
      .from(schema.compiledPageRevisions)
      .where(eq(schema.compiledPageRevisions.pageId, page.id));

    const content = [
      `## ${proposal.title}`,
      "",
      proposal.bodyMarkdown || "",
      proposal.sourceExcerpt ? `\nSource excerpt:\n${proposal.sourceExcerpt}` : "",
    ].join("\n").trim();

    const [revision] = await db.insert(schema.compiledPageRevisions).values({
      tenantId: args.tenantId,
      pageId: page.id,
      interactionId: proposal.interactionId,
      revisionNumber: revisionSummary?.nextRevision ?? 1,
      contentMarkdown: content,
      changeSummary: stringFromPatch(patch, "changeSummary") || proposal.title,
      reviewStatus: "approved",
      reviewedBy: args.userId,
      reviewedAt: new Date(),
    }).returning({ id: schema.compiledPageRevisions.id });

    appliedEntityId = revision.id;
  } else {
    const [memory] = await db.insert(schema.memoryItems).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: proposal.projectId,
      scope: proposal.projectId ? "project" : "workspace",
      kind: proposal.targetType === "open_question" ? "constraint" : "fact",
      key: proposal.title,
      valueJson: {
        body: proposal.bodyMarkdown,
        sourceExcerpt: proposal.sourceExcerpt,
        targetType: proposal.targetType,
      },
      confidenceBps: proposal.confidenceBps,
      reviewStatus: "approved",
      sourceType: "agent",
      sourceId: proposal.interactionId,
      proposedBy: proposal.proposedBy,
      reviewedBy: args.userId,
      lastConfirmedAt: new Date(),
    }).returning({ id: schema.memoryItems.id });

    appliedEntityId = memory.id;
  }

  const [updated] = await db
    .update(schema.proposals)
    .set({
      status: "approved",
      appliedEntityId,
      reviewedBy: args.userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.proposals.id, proposal.id))
    .returning();

  return updated;
}

export async function rejectProposal(args: {
  tenantId: string;
  workspaceId: string;
  userId: string;
  proposalId: string;
}) {
  const [updated] = await db
    .update(schema.proposals)
    .set({
      status: "rejected",
      reviewedBy: args.userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(schema.proposals.tenantId, args.tenantId),
      eq(schema.proposals.workspaceId, args.workspaceId),
      eq(schema.proposals.id, args.proposalId),
      eq(schema.proposals.status, "pending"),
    ))
    .returning();

  if (!updated) {
    throw new Error("Pending proposal not found");
  }

  return updated;
}
