import { and, count, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";
import type { HomePayload } from "@workspace-kit/shared/contracts/home";

export async function getWorkspaceHome(args: {
  tenantId: string;
  workspaceId?: string;
  workspaceSlug?: string;
}): Promise<HomePayload> {
  const { tenantId, workspaceId, workspaceSlug } = args;

  if (!workspaceId && !workspaceSlug) {
    throw new Error("A workspace identifier is required");
  }

  const [workspace] = await db
    .select({
      tenantId: schema.tenants.id,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      description: schema.workspaces.description,
    })
    .from(schema.workspaces)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.workspaces.tenantId))
    .where(and(
      eq(schema.workspaces.tenantId, tenantId),
      workspaceId ? eq(schema.workspaces.id, workspaceId) : eq(schema.workspaces.slug, workspaceSlug!),
    ));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const [activeProjectsCount] = await db
    .select({ value: count() })
    .from(schema.projects)
    .where(and(
      eq(schema.projects.tenantId, tenantId),
      eq(schema.projects.workspaceId, workspace.id),
      eq(schema.projects.status, "active"),
    ));

  const now = new Date();

  const [taskMetrics] = await db
    .select({
      openTasks: sql<number>`
        count(*) filter (
          where ${schema.taskStatuses.kind} is null
          or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')
        )
      `.mapWith(Number),
      overdueTasks: sql<number>`
        count(*) filter (
          where ${schema.tasks.dueAt} is not null
          and ${schema.tasks.dueAt} < ${now}
          and (
            ${schema.taskStatuses.kind} is null
            or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')
          )
        )
      `.mapWith(Number),
    })
    .from(schema.tasks)
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .where(and(
      eq(schema.tasks.tenantId, tenantId),
      eq(schema.tasks.workspaceId, workspace.id),
    ));

  const [decisionMetrics] = await db
    .select({ value: count() })
    .from(schema.decisionLog)
    .where(and(
      eq(schema.decisionLog.tenantId, tenantId),
      eq(schema.decisionLog.workspaceId, workspace.id),
    ));

  const activeProjects = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      slug: schema.projects.slug,
      status: schema.projects.status,
      health: schema.projects.health,
      openTaskCount: sql<number>`
        count(${schema.tasks.id}) filter (
          where ${schema.taskStatuses.kind} is null
          or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')
        )
      `.mapWith(Number),
    })
    .from(schema.projects)
    .leftJoin(schema.tasks, eq(schema.tasks.projectId, schema.projects.id))
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .where(and(
      eq(schema.projects.tenantId, tenantId),
      eq(schema.projects.workspaceId, workspace.id),
    ))
    .groupBy(schema.projects.id)
    .orderBy(desc(schema.projects.updatedAt))
    .limit(8);

  const openTasks = await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      priority: schema.tasks.priority,
      dueAt: schema.tasks.dueAt,
      updatedAt: schema.tasks.updatedAt,
      statusName: schema.taskStatuses.name,
      statusKind: schema.taskStatuses.kind,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
    })
    .from(schema.tasks)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .where(and(
      eq(schema.tasks.tenantId, tenantId),
      eq(schema.tasks.workspaceId, workspace.id),
      sql`
        ${schema.taskStatuses.kind} is null
        or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')
      `,
    ))
    .orderBy(desc(schema.tasks.updatedAt))
    .limit(6);

  const [proposalMetrics] = await db
    .select({ value: count() })
    .from(schema.proposals)
    .where(and(
      eq(schema.proposals.tenantId, tenantId),
      eq(schema.proposals.workspaceId, workspace.id),
      eq(schema.proposals.status, "pending"),
    ));

  const [interactionMetrics] = await db
    .select({ value: count() })
    .from(schema.interactions)
    .where(and(
      eq(schema.interactions.tenantId, tenantId),
      eq(schema.interactions.workspaceId, workspace.id),
    ));

  const recentDecisions = await db
    .select({
      id: schema.decisionLog.id,
      title: schema.decisionLog.title,
      status: schema.decisionLog.status,
      decidedAt: schema.decisionLog.decidedAt,
      projectName: schema.projects.name,
    })
    .from(schema.decisionLog)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.decisionLog.projectId))
    .where(and(
      eq(schema.decisionLog.tenantId, tenantId),
      eq(schema.decisionLog.workspaceId, workspace.id),
    ))
    .orderBy(desc(schema.decisionLog.updatedAt))
    .limit(5);

  const recentMeetings = await db
    .select({
      id: schema.meetingNotes.id,
      title: schema.meetingNotes.title,
      meetingAt: schema.meetingNotes.meetingAt,
      summary: schema.meetingNotes.summary,
      projectName: schema.projects.name,
    })
    .from(schema.meetingNotes)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.meetingNotes.projectId))
    .where(and(
      eq(schema.meetingNotes.tenantId, tenantId),
      eq(schema.meetingNotes.workspaceId, workspace.id),
    ))
    .orderBy(desc(schema.meetingNotes.meetingAt))
    .limit(5);

  const recentInteractions = await db
    .select({
      id: schema.interactions.id,
      title: schema.interactions.title,
      sourceLabel: schema.interactions.sourceLabel,
      summary: schema.interactions.summary,
      queueName: schema.queues.name,
      createdAt: schema.interactions.createdAt,
    })
    .from(schema.interactions)
    .leftJoin(schema.queues, eq(schema.queues.id, schema.interactions.queueId))
    .where(and(
      eq(schema.interactions.tenantId, tenantId),
      eq(schema.interactions.workspaceId, workspace.id),
    ))
    .orderBy(desc(schema.interactions.createdAt))
    .limit(5);

  const approvalQueues = await db
    .select({
      id: schema.queues.id,
      name: schema.queues.name,
      slug: schema.queues.slug,
      sortOrder: schema.queues.sortOrder,
      pendingCount: sql<number>`
        count(${schema.proposals.id}) filter (
          where ${schema.proposals.status} = 'pending'
        )
      `.mapWith(Number),
    })
    .from(schema.queues)
    .leftJoin(schema.proposals, eq(schema.proposals.queueId, schema.queues.id))
    .where(and(
      eq(schema.queues.tenantId, tenantId),
      eq(schema.queues.workspaceId, workspace.id),
    ))
    .groupBy(schema.queues.id)
    .orderBy(schema.queues.sortOrder);

  const compiledPages = await db
    .select({
      id: schema.compiledPages.id,
      title: schema.compiledPages.title,
      slug: schema.compiledPages.slug,
      summary: schema.compiledPages.summary,
      updatedAt: schema.compiledPages.updatedAt,
    })
    .from(schema.compiledPages)
    .where(and(
      eq(schema.compiledPages.tenantId, tenantId),
      eq(schema.compiledPages.workspaceId, workspace.id),
      eq(schema.compiledPages.status, "active"),
    ))
    .orderBy(desc(schema.compiledPages.updatedAt))
    .limit(6);

  const metrics = {
    activeProjects: activeProjectsCount?.value ?? 0,
    openTasks: taskMetrics?.openTasks ?? 0,
    overdueTasks: taskMetrics?.overdueTasks ?? 0,
    decisionsLogged: decisionMetrics?.value ?? 0,
    pendingApprovals: proposalMetrics?.value ?? 0,
    capturedInteractions: interactionMetrics?.value ?? 0,
  };

  const attentionItems: string[] = [];
  if (metrics.pendingApprovals > 0) {
    attentionItems.push(`${metrics.pendingApprovals} proposed update${metrics.pendingApprovals === 1 ? "" : "s"} need approval before they become tasks, decisions, or memory.`);
  }
  if (metrics.overdueTasks > 0) {
    attentionItems.push(`${metrics.overdueTasks} overdue task${metrics.overdueTasks === 1 ? "" : "s"} need reassignment or a fresh due date.`);
  }
  if (metrics.decisionsLogged === 0) {
    attentionItems.push("Capture at least one decision so new teammates can understand what is already settled.");
  }
  if (recentMeetings.length === 0) {
    attentionItems.push("Log the latest team meeting to anchor follow-up actions in shared context.");
  }
  if (metrics.activeProjects === 0) {
    attentionItems.push("Create the first active project to turn the workspace into a real operating surface.");
  }

  return {
    tenant: {
      id: workspace.tenantId,
      name: workspace.tenantName,
      slug: workspace.tenantSlug,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
    },
    metrics,
    activeProjects: activeProjects.map((project) => ({
      ...project,
      openTaskCount: Number(project.openTaskCount || 0),
    })),
    openTasks: openTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      statusName: task.statusName,
      statusKind: task.statusKind,
      projectName: task.projectName,
      projectSlug: task.projectSlug,
    })),
    recentDecisions: recentDecisions.map((decision) => ({
      ...decision,
      decidedAt: decision.decidedAt ? decision.decidedAt.toISOString() : null,
    })),
    recentMeetings: recentMeetings.map((meeting) => ({
      ...meeting,
      meetingAt: meeting.meetingAt ? meeting.meetingAt.toISOString() : null,
    })),
    recentInteractions: recentInteractions.map((interaction) => ({
      ...interaction,
      createdAt: interaction.createdAt.toISOString(),
    })),
    approvalQueues: approvalQueues.map((queue) => ({
      id: queue.id,
      name: queue.name,
      slug: queue.slug,
      pendingCount: Number(queue.pendingCount || 0),
    })),
    compiledPages: compiledPages.map((page) => ({
      ...page,
      updatedAt: page.updatedAt.toISOString(),
    })),
    attentionItems,
    commandBrief: {
      summary: `${metrics.activeProjects} active project${metrics.activeProjects === 1 ? "" : "s"}, ${metrics.openTasks} open task${metrics.openTasks === 1 ? "" : "s"}, ${metrics.pendingApprovals} pending approval${metrics.pendingApprovals === 1 ? "" : "s"}, and ${metrics.decisionsLogged} logged decision${metrics.decisionsLogged === 1 ? "" : "s"} define the current operating picture.`,
      priorities: [
        metrics.pendingApprovals > 0 ? "Clear the approval inbox so extracted commitments become visible operating state." : "Keep the capture-to-approval loop moving as new communication arrives.",
        metrics.overdueTasks > 0 ? "Triage overdue work before adding new commitments." : "Keep current due dates honest and visible.",
        recentMeetings.length > 0 ? "Turn the latest meeting notes into assigned follow-up." : "Start capturing meeting output in the workspace.",
      ],
      blockers: attentionItems,
    },
  };
}
