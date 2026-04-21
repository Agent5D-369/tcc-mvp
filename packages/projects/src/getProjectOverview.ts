import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export async function getProjectOverview(args: {
  tenantId: string;
  workspaceSlug: string;
  projectSlug: string;
}) {
  const { tenantId, workspaceSlug, projectSlug } = args;

  const [project] = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      slug: schema.projects.slug,
      summary: schema.projects.summary,
      status: schema.projects.status,
      health: schema.projects.health,
      ownerId: schema.projects.ownerId,
      workspaceId: schema.projects.workspaceId,
      workspaceName: schema.workspaces.name,
      workspaceSlug: schema.workspaces.slug,
    })
    .from(schema.projects)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.projects.workspaceId))
    .where(and(
      eq(schema.projects.tenantId, tenantId),
      eq(schema.workspaces.slug, workspaceSlug),
      eq(schema.projects.slug, projectSlug),
    ))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  const milestones = await db
    .select({
      id: schema.milestones.id,
      name: schema.milestones.name,
      description: schema.milestones.description,
      dueAt: schema.milestones.dueAt,
      sortOrder: schema.milestones.sortOrder,
    })
    .from(schema.milestones)
    .where(eq(schema.milestones.projectId, project.id))
    .orderBy(asc(schema.milestones.sortOrder), asc(schema.milestones.dueAt));

  const decisions = await db
    .select({
      id: schema.decisionLog.id,
      title: schema.decisionLog.title,
      decisionText: schema.decisionLog.decisionText,
      status: schema.decisionLog.status,
      decidedAt: schema.decisionLog.decidedAt,
    })
    .from(schema.decisionLog)
    .where(eq(schema.decisionLog.projectId, project.id))
    .orderBy(desc(schema.decisionLog.updatedAt))
    .limit(5);

  const recentMeetings = await db
    .select({
      id: schema.meetingNotes.id,
      title: schema.meetingNotes.title,
      summary: schema.meetingNotes.summary,
      meetingAt: schema.meetingNotes.meetingAt,
    })
    .from(schema.meetingNotes)
    .where(eq(schema.meetingNotes.projectId, project.id))
    .orderBy(desc(schema.meetingNotes.meetingAt))
    .limit(5);

  const conversations = await db
    .select({
      id: schema.threads.id,
      title: schema.threads.title,
      updatedAt: schema.threads.updatedAt,
    })
    .from(schema.threads)
    .where(eq(schema.threads.projectId, project.id))
    .orderBy(desc(schema.threads.updatedAt))
    .limit(5);

  const taskSummary = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      done: sql<number>`count(*) filter (where ${schema.taskStatuses.kind} = 'done')`.mapWith(Number),
      blocked: sql<number>`count(*) filter (where ${schema.taskStatuses.kind} = 'blocked')`.mapWith(Number),
    })
    .from(schema.tasks)
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .where(eq(schema.tasks.projectId, project.id));

  const nextActions = await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      dueAt: schema.tasks.dueAt,
      priority: schema.tasks.priority,
    })
    .from(schema.tasks)
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .where(and(
      eq(schema.tasks.projectId, project.id),
      sql`${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')`,
    ))
    .orderBy(asc(schema.tasks.dueAt), desc(schema.tasks.updatedAt))
    .limit(5);

  const summary = taskSummary[0] ?? { total: 0, done: 0, blocked: 0 };

  return {
    project,
    milestoneCount: milestones.length,
    milestones: milestones.map((m) => ({
      ...m,
      dueAt: m.dueAt ? m.dueAt.toISOString() : null,
    })),
    decisions: decisions.map((d) => ({
      ...d,
      decidedAt: d.decidedAt ? d.decidedAt.toISOString() : null,
    })),
    recentMeetings: recentMeetings.map((meeting) => ({
      ...meeting,
      meetingAt: meeting.meetingAt ? meeting.meetingAt.toISOString() : null,
    })),
    conversations: conversations.map((t) => ({
      ...t,
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
    })),
    health: {
      status: project.health,
      totalTasks: summary.total || 0,
      completedTasks: summary.done || 0,
      blockedTasks: summary.blocked || 0,
      completionRatio: summary.total ? Number(((summary.done / summary.total) * 100).toFixed(0)) : 0,
    },
    nextActions: nextActions.map((t) => ({
      ...t,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    })),
  };
}
