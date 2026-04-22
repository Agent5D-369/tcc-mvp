import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export async function getWorkspaceShellData(args: {
  userId: string;
  tenantSlug: string;
  workspaceSlug: string;
}) {
  const [currentWorkspace] = await db
    .select({
      tenantId: schema.tenants.id,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
      workspaceId: schema.workspaces.id,
      workspaceName: schema.workspaces.name,
      workspaceSlug: schema.workspaces.slug,
      workspaceDescription: schema.workspaces.description,
    })
    .from(schema.workspaces)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.workspaces.tenantId))
    .where(and(
      eq(schema.tenants.slug, args.tenantSlug),
      eq(schema.workspaces.slug, args.workspaceSlug),
    ))
    .limit(1);

  if (!currentWorkspace) {
    throw new Error("Workspace not found");
  }

  const contexts = await db
    .select({
      tenantId: schema.tenants.id,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
      workspaceId: schema.workspaces.id,
      workspaceName: schema.workspaces.name,
      workspaceSlug: schema.workspaces.slug,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
    .where(eq(schema.memberships.userId, args.userId))
    .orderBy(asc(schema.tenants.name), asc(schema.workspaces.name));

  return {
    currentWorkspace,
    contexts,
  };
}

export async function getWorkspaceProjectsIndex(args: {
  tenantId: string;
  workspaceId: string;
}) {
  const projects = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      slug: schema.projects.slug,
      summary: schema.projects.summary,
      status: schema.projects.status,
      health: schema.projects.health,
      targetDate: schema.projects.targetDate,
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
      eq(schema.projects.tenantId, args.tenantId),
      eq(schema.projects.workspaceId, args.workspaceId),
      sql`${schema.projects.status} <> 'archived'`,
    ))
    .groupBy(schema.projects.id)
    .orderBy(
      asc(sql`case when ${schema.projects.status} = 'active' then 0 else 1 end`),
      asc(schema.projects.targetDate),
      desc(schema.projects.updatedAt),
    );

  return projects.map((project) => ({
    ...project,
    targetDate: project.targetDate ? project.targetDate.toISOString() : null,
  }));
}

export async function getWorkspaceTasksIndex(args: {
  tenantId: string;
  workspaceId: string;
}) {
  const tasks = await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      dueAt: schema.tasks.dueAt,
      priority: schema.tasks.priority,
      statusId: schema.taskStatuses.id,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
      statusName: schema.taskStatuses.name,
      statusKind: schema.taskStatuses.kind,
    })
    .from(schema.tasks)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
    .leftJoin(schema.taskStatuses, eq(schema.taskStatuses.id, schema.tasks.statusId))
    .where(and(
      eq(schema.tasks.tenantId, args.tenantId),
      eq(schema.tasks.workspaceId, args.workspaceId),
      sql`${schema.taskStatuses.kind} is null or ${schema.taskStatuses.kind} in ('todo', 'in_progress', 'blocked')`,
    ))
    .orderBy(
      asc(sql`case when ${schema.taskStatuses.kind} = 'blocked' then 0 else 1 end`),
      asc(schema.tasks.dueAt),
      desc(schema.tasks.updatedAt),
    );

  return tasks.map((task) => ({
    ...task,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    statusName: task.statusName ?? "Unassigned",
    statusKind: task.statusKind ?? null,
  }));
}

export async function getWorkspaceTaskStatuses(args: {
  tenantId: string;
  workspaceId: string;
}) {
  return db
    .select({
      id: schema.taskStatuses.id,
      name: schema.taskStatuses.name,
      kind: schema.taskStatuses.kind,
    })
    .from(schema.taskStatuses)
    .where(and(
      eq(schema.taskStatuses.tenantId, args.tenantId),
      eq(schema.taskStatuses.workspaceId, args.workspaceId),
    ))
    .orderBy(asc(schema.taskStatuses.sortOrder), asc(schema.taskStatuses.name));
}

export async function getWorkspaceMeetingsIndex(args: {
  tenantId: string;
  workspaceId: string;
}) {
  const meetings = await db
    .select({
      id: schema.meetingNotes.id,
      title: schema.meetingNotes.title,
      summary: schema.meetingNotes.summary,
      meetingAt: schema.meetingNotes.meetingAt,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
    })
    .from(schema.meetingNotes)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.meetingNotes.projectId))
    .where(and(
      eq(schema.meetingNotes.tenantId, args.tenantId),
      eq(schema.meetingNotes.workspaceId, args.workspaceId),
    ))
    .orderBy(desc(schema.meetingNotes.meetingAt), desc(schema.meetingNotes.updatedAt));

  return meetings.map((meeting) => ({
    ...meeting,
    meetingAt: meeting.meetingAt ? meeting.meetingAt.toISOString() : null,
  }));
}
