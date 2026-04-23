import { and, asc, count, desc, eq, sql } from "drizzle-orm";
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

  const nowIso = new Date().toISOString();
  const dueSoonIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

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
          and ${schema.tasks.dueAt} < ${nowIso}
          and (
            ${schema.taskStatuses.kind} is null
            or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')
          )
        )
      `.mapWith(Number),
      blockedTasks: sql<number>`
        count(*) filter (
          where ${schema.taskStatuses.kind} = 'blocked'
        )
      `.mapWith(Number),
      urgentTasks: sql<number>`
        count(*) filter (
          where ${schema.tasks.priority} in ('high', 'urgent')
          and (
            ${schema.taskStatuses.kind} is null
            or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')
          )
        )
      `.mapWith(Number),
      dueSoonTasks: sql<number>`
        count(*) filter (
          where ${schema.tasks.dueAt} is not null
          and ${schema.tasks.dueAt} >= ${nowIso}
          and ${schema.tasks.dueAt} < ${dueSoonIso}
          and (
            ${schema.taskStatuses.kind} is null
            or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')
          )
        )
      `.mapWith(Number),
      unassignedTasks: sql<number>`
        count(*) filter (
          where ${schema.taskStatuses.id} is null
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

  const openTasks = await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      priority: schema.tasks.priority,
      dueAt: schema.tasks.dueAt,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
      statusKind: schema.taskStatuses.kind,
    })
    .from(schema.tasks)
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .leftJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
    .where(and(
      eq(schema.tasks.tenantId, tenantId),
      eq(schema.tasks.workspaceId, workspace.id),
      sql`${schema.taskStatuses.kind} is null or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')`,
    ))
    .orderBy(asc(schema.tasks.dueAt), desc(schema.tasks.updatedAt))
    .limit(8);

  const focusTasks = await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      priority: schema.tasks.priority,
      dueAt: schema.tasks.dueAt,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
      statusKind: schema.taskStatuses.kind,
    })
    .from(schema.tasks)
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .leftJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
    .where(and(
      eq(schema.tasks.tenantId, tenantId),
      eq(schema.tasks.workspaceId, workspace.id),
      sql`${schema.taskStatuses.kind} is null or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')`,
    ))
    .orderBy(
      asc(sql`case when ${schema.taskStatuses.kind} = 'blocked' then 0 else 1 end`),
      asc(sql`case when ${schema.tasks.priority} = 'urgent' then 0 when ${schema.tasks.priority} = 'high' then 1 else 2 end`),
      asc(sql`case when ${schema.tasks.dueAt} is null then 1 else 0 end`),
      asc(schema.tasks.dueAt),
      desc(schema.tasks.updatedAt),
    )
    .limit(3);

  const metrics = {
    activeProjects: activeProjectsCount?.value ?? 0,
    openTasks: taskMetrics?.openTasks ?? 0,
    overdueTasks: taskMetrics?.overdueTasks ?? 0,
    decisionsLogged: decisionMetrics?.value ?? 0,
    blockedTasks: taskMetrics?.blockedTasks ?? 0,
    urgentTasks: taskMetrics?.urgentTasks ?? 0,
    dueSoonTasks: taskMetrics?.dueSoonTasks ?? 0,
    unassignedTasks: taskMetrics?.unassignedTasks ?? 0,
  };

  const attentionItems: string[] = [];
  if (metrics.overdueTasks > 0) {
    attentionItems.push(`${metrics.overdueTasks} overdue task${metrics.overdueTasks === 1 ? "" : "s"} need reassignment or a fresh due date.`);
  }
  if (metrics.blockedTasks > 0) {
    attentionItems.push(`${metrics.blockedTasks} blocked task${metrics.blockedTasks === 1 ? "" : "s"} need an unblock decision or owner follow-up.`);
  }
  if (metrics.urgentTasks > 0) {
    attentionItems.push(`${metrics.urgentTasks} high-priority task${metrics.urgentTasks === 1 ? "" : "s"} should be reviewed before lower-priority work.`);
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
    recentDecisions: recentDecisions.map((decision) => ({
      ...decision,
      decidedAt: decision.decidedAt ? decision.decidedAt.toISOString() : null,
    })),
    recentMeetings: recentMeetings.map((meeting) => ({
      ...meeting,
      meetingAt: meeting.meetingAt ? meeting.meetingAt.toISOString() : null,
    })),
    openTasks: openTasks.map((task) => ({
      ...task,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      statusKind: task.statusKind ?? null,
    })),
    focusTasks: focusTasks.map((task) => ({
      ...task,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      statusKind: task.statusKind ?? null,
    })),
    attentionItems,
    commandBrief: {
      summary: `${metrics.activeProjects} active project${metrics.activeProjects === 1 ? "" : "s"}, ${metrics.openTasks} open task${metrics.openTasks === 1 ? "" : "s"}, and ${metrics.decisionsLogged} logged decision${metrics.decisionsLogged === 1 ? "" : "s"} define the current operating picture.`,
      priorities: [
        metrics.overdueTasks > 0 ? "Triage overdue work before adding new commitments." : "Keep current due dates honest and visible.",
        recentMeetings.length > 0 ? "Turn the latest meeting notes into assigned follow-up." : "Start capturing meeting output in the workspace.",
        recentDecisions.length > 0 ? "Review whether the most recent decisions changed task ownership or sequencing." : "Establish a habit of recording decisions as they happen.",
      ],
      blockers: attentionItems,
    },
  };
}
