import { and, eq } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

async function main() {
  const email = (process.env.AUTH_DEMO_EMAIL || "demo@example.com").toLowerCase();
  const fullName = process.env.AUTH_DEMO_NAME || "QuickLaunch Demo User";

  const [user] = await db.insert(schema.users).values({
    email,
    fullName,
  }).onConflictDoUpdate({
    target: schema.users.email,
    set: { fullName, updatedAt: new Date() },
  }).returning();

  let [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "quicklaunch-demo"))
    .limit(1);

  if (!tenant) {
    [tenant] = await db.insert(schema.tenants).values({
      name: "QuickLaunch Demo",
      slug: "quicklaunch-demo",
      plan: "team",
      status: "active",
      settingsJson: {},
    }).returning();
  }

  let [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(and(
      eq(schema.workspaces.tenantId, tenant.id),
      eq(schema.workspaces.slug, "ops-command"),
    ))
    .limit(1);

  if (!workspace) {
    [workspace] = await db.insert(schema.workspaces).values({
      tenantId: tenant.id,
      name: "Ops Command",
      slug: "ops-command",
      description: "Central workspace for project visibility, meeting follow-through, and decision tracking.",
      visibility: "private",
      createdBy: user.id,
    }).returning();
  }

  await db.insert(schema.memberships).values({
    tenantId: tenant.id,
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
    isDefaultWorkspace: true,
  }).onConflictDoNothing();

  let [project] = await db
    .select()
    .from(schema.projects)
    .where(and(
      eq(schema.projects.workspaceId, workspace.id),
      eq(schema.projects.slug, "phase-one-rollout"),
    ))
    .limit(1);

  if (!project) {
    [project] = await db.insert(schema.projects).values({
      tenantId: tenant.id,
      workspaceId: workspace.id,
      name: "Phase 1 Rollout",
      slug: "phase-one-rollout",
      summary: "Launch the first multitenant Team Command Center workspace on Railway with crisp project visibility and strong operating habits.",
      status: "active",
      health: "yellow",
      ownerId: user.id,
      metadataJson: {},
    }).returning();
  }

  const statuses = [
    { name: "Backlog", kind: "todo", sortOrder: 0, isDefault: true },
    { name: "In Progress", kind: "in_progress", sortOrder: 1, isDefault: false },
    { name: "Blocked", kind: "blocked", sortOrder: 2, isDefault: false },
    { name: "Done", kind: "done", sortOrder: 3, isDefault: false },
    { name: "Canceled", kind: "canceled", sortOrder: 4, isDefault: false },
  ] as const;

  for (const status of statuses) {
    await db.insert(schema.taskStatuses).values({
      tenantId: tenant.id,
      workspaceId: workspace.id,
      ...status,
      color: null,
    }).onConflictDoNothing();
  }

  const workspaceStatuses = await db
    .select()
    .from(schema.taskStatuses)
    .where(eq(schema.taskStatuses.workspaceId, workspace.id));

  const statusByKind = Object.fromEntries(workspaceStatuses.map((status) => [status.kind, status]));

  const milestones = [
    {
      name: "App shell and routing",
      description: "Finish the base Next.js shell, tenant routing, and auth redirects.",
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sortOrder: 0,
    },
    {
      name: "Railway deployment",
      description: "Deploy the web app and connect the production PostgreSQL service.",
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      sortOrder: 1,
    },
  ] as const;

  for (const milestone of milestones) {
    const existing = await db
      .select({ id: schema.milestones.id })
      .from(schema.milestones)
      .where(and(
        eq(schema.milestones.projectId, project.id),
        eq(schema.milestones.name, milestone.name),
      ))
      .limit(1);

    if (!existing.length) {
      await db.insert(schema.milestones).values({
        tenantId: tenant.id,
        workspaceId: workspace.id,
        projectId: project.id,
        name: milestone.name,
        description: milestone.description,
        dueAt: milestone.dueAt,
        sortOrder: milestone.sortOrder,
        metadataJson: {},
        createdBy: user.id,
      });
    }
  }

  const tasks = [
    {
      title: "Finalize Railway-ready app shell",
      description: "Close the remaining build and deployment gaps so the MVP can ship as one web service.",
      priority: "high" as const,
      statusId: statusByKind.in_progress?.id ?? null,
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Write tenant onboarding notes",
      description: "Document how a new organization gets a tenant, workspace, and default memberships.",
      priority: "medium" as const,
      statusId: statusByKind.todo?.id ?? null,
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Connect the production database on Railway",
      description: "Provision PostgreSQL, set environment variables, and run migrations in Railway.",
      priority: "urgent" as const,
      statusId: statusByKind.blocked?.id ?? null,
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const task of tasks) {
    const existing = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.projectId, project.id),
        eq(schema.tasks.title, task.title),
      ))
      .limit(1);

    if (!existing.length) {
      await db.insert(schema.tasks).values({
        tenantId: tenant.id,
        workspaceId: workspace.id,
        projectId: project.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        statusId: task.statusId,
        assigneeId: user.id,
        reporterId: user.id,
        dueAt: task.dueAt,
        sourceType: "manual",
        sourceId: null,
        rank: null,
        metadataJson: {},
      });
    }
  }

  const decisions = [
    {
      title: "Phase 1 centers on execution visibility",
      decisionText: "Team Command Center will launch first as a multitenant command center for projects, tasks, meetings, and decisions rather than as an AI-first workspace.",
      status: "accepted" as const,
    },
    {
      title: "Railway is the first hosting target",
      decisionText: "The initial hosted environment will be Railway with a single web service and PostgreSQL before adding workers or Redis.",
      status: "accepted" as const,
    },
  ];

  for (const decision of decisions) {
    const existing = await db
      .select({ id: schema.decisionLog.id })
      .from(schema.decisionLog)
      .where(and(
        eq(schema.decisionLog.projectId, project.id),
        eq(schema.decisionLog.title, decision.title),
      ))
      .limit(1);

    if (!existing.length) {
      await db.insert(schema.decisionLog).values({
        tenantId: tenant.id,
        workspaceId: workspace.id,
        projectId: project.id,
        title: decision.title,
        context: null,
        decisionText: decision.decisionText,
        status: decision.status,
        decidedBy: user.id,
        decidedAt: new Date(),
        sourceType: "manual",
        sourceId: null,
      });
    }
  }

  const meetingTitle = "Phase 1 launch planning";
  const existingMeeting = await db
    .select({ id: schema.meetingNotes.id })
    .from(schema.meetingNotes)
    .where(and(
      eq(schema.meetingNotes.projectId, project.id),
      eq(schema.meetingNotes.title, meetingTitle),
    ))
    .limit(1);

  if (!existingMeeting.length) {
    await db.insert(schema.meetingNotes).values({
      tenantId: tenant.id,
      workspaceId: workspace.id,
      projectId: project.id,
      title: meetingTitle,
      meetingAt: new Date(),
      facilitatorId: user.id,
      rawTranscriptPath: null,
      summary: "Aligned the MVP around multitenant execution visibility, Railway deployment, and a tight Phase 1 scope.",
      notesMarkdown: "- Keep the UI calm and operational.\n- Track tasks, meetings, decisions, and milestones first.\n- Leave deeper automation and AI features for later phases.",
      sourceType: "manual",
      sourceId: null,
    });
  }

  console.log({
    userId: user.id,
    tenantId: tenant.id,
    workspaceId: workspace.id,
    projectId: project.id,
    route: `/${tenant.slug}/${workspace.slug}`,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
