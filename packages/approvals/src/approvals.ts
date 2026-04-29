import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";

type ProposalPatch = Record<string, unknown>;

type ProposalEdits = {
  title?: string;
  bodyMarkdown?: string | null;
  sourceExcerpt?: string | null;
};

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
  edits?: ProposalEdits;
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

  const editedTitle = args.edits?.title?.trim();
  const draft = {
    ...proposal,
    title: editedTitle || proposal.title,
    bodyMarkdown: args.edits && "bodyMarkdown" in args.edits
      ? args.edits.bodyMarkdown
      : proposal.bodyMarkdown,
    sourceExcerpt: args.edits && "sourceExcerpt" in args.edits
      ? args.edits.sourceExcerpt
      : proposal.sourceExcerpt,
  };

  if (args.edits) {
    await db
      .update(schema.proposals)
      .set({
        title: draft.title,
        bodyMarkdown: draft.bodyMarkdown,
        sourceExcerpt: draft.sourceExcerpt,
        updatedAt: new Date(),
      })
      .where(eq(schema.proposals.id, proposal.id));
  }

  const patch = {
    ...(proposal.proposedPatchJson ?? {}),
    title: draft.title,
  };
  let appliedEntityId: string | null = null;

  if (draft.targetType === "task") {
    const [defaultStatus] = await db
      .select({ id: schema.taskStatuses.id })
      .from(schema.taskStatuses)
      .where(and(
        eq(schema.taskStatuses.workspaceId, args.workspaceId),
        eq(schema.taskStatuses.kind, "todo"),
      ))
      .limit(1);

    if (!draft.projectId) {
      throw new Error("Task proposals require a project");
    }

    const [task] = await db.insert(schema.tasks).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: draft.projectId,
      statusId: defaultStatus?.id ?? null,
      title: stringFromPatch(patch, "title") || draft.title,
      description: draft.bodyMarkdown,
      priority: priorityFromPatch(patch),
      assigneeId: null,
      reporterId: args.userId,
      dueAt: null,
      sourceType: "agent",
      sourceId: draft.interactionId,
      rank: null,
      metadataJson: {
        proposalId: draft.id,
        approvalInbox: true,
      },
    }).returning({ id: schema.tasks.id });

    appliedEntityId = task.id;
  } else if (draft.targetType === "decision") {
    const [decision] = await db.insert(schema.decisionLog).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: draft.projectId,
      title: draft.title,
      context: draft.bodyMarkdown,
      decisionText: stringFromPatch(patch, "decisionText") || draft.bodyMarkdown || draft.title,
      status: "accepted",
      decidedBy: args.userId,
      decidedAt: new Date(),
      sourceType: "agent",
      sourceId: draft.interactionId,
    }).returning({ id: schema.decisionLog.id });

    appliedEntityId = decision.id;
  } else if (draft.targetType === "compiled_page") {
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
      `## ${draft.title}`,
      "",
      draft.bodyMarkdown || "",
      draft.sourceExcerpt ? `\nSource excerpt:\n${draft.sourceExcerpt}` : "",
    ].join("\n").trim();

    const [revision] = await db.insert(schema.compiledPageRevisions).values({
      tenantId: args.tenantId,
      pageId: page.id,
      interactionId: draft.interactionId,
      revisionNumber: revisionSummary?.nextRevision ?? 1,
      contentMarkdown: content,
      changeSummary: stringFromPatch(patch, "changeSummary") || draft.title,
      reviewStatus: "approved",
      reviewedBy: args.userId,
      reviewedAt: new Date(),
    }).returning({ id: schema.compiledPageRevisions.id });

    appliedEntityId = revision.id;
  } else {
    const [memory] = await db.insert(schema.memoryItems).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: draft.projectId,
      scope: draft.projectId ? "project" : "workspace",
      kind: draft.targetType === "open_question" ? "constraint" : "fact",
      key: draft.title,
      valueJson: {
        body: draft.bodyMarkdown,
        sourceExcerpt: draft.sourceExcerpt,
        targetType: draft.targetType,
      },
      confidenceBps: draft.confidenceBps,
      reviewStatus: "approved",
      sourceType: "agent",
      sourceId: draft.interactionId,
      proposedBy: draft.proposedBy,
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

  await recordAuditEvent({
    tenantId: args.tenantId,
    workspaceId: args.workspaceId,
    userId: args.userId,
    action: "proposal.approved",
    entityType: draft.targetType,
    entityId: appliedEntityId,
    metadataJson: {
      proposalId: proposal.id,
      targetType: draft.targetType,
    },
  });

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

  await recordAuditEvent({
    tenantId: args.tenantId,
    workspaceId: args.workspaceId,
    userId: args.userId,
    action: "proposal.rejected",
    entityType: "proposal",
    entityId: updated.id,
  });

  return updated;
}
