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

  await db
    .update(schema.memberships)
    .set({ isDefaultWorkspace: false })
    .where(and(
      eq(schema.memberships.tenantId, tenant.id),
      eq(schema.memberships.userId, user.id),
    ));

  let [pilotWorkspace] = await db
    .select()
    .from(schema.workspaces)
    .where(and(
      eq(schema.workspaces.tenantId, tenant.id),
      eq(schema.workspaces.slug, "pilot-command"),
    ))
    .limit(1);

  if (!pilotWorkspace) {
    [pilotWorkspace] = await db.insert(schema.workspaces).values({
      tenantId: tenant.id,
      name: "Pilot Command Center",
      slug: "pilot-command",
      description: "Pilot workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.",
      visibility: "private",
      createdBy: user.id,
    }).returning();
  }

  await db.insert(schema.memberships).values({
    tenantId: tenant.id,
    workspaceId: pilotWorkspace.id,
    userId: user.id,
    role: "owner",
    isDefaultWorkspace: true,
  }).onConflictDoUpdate({
    target: [
      schema.memberships.tenantId,
      schema.memberships.workspaceId,
      schema.memberships.userId,
    ],
    set: { isDefaultWorkspace: true, role: "owner" },
  });

  let [pilotProject] = await db
    .select()
    .from(schema.projects)
    .where(and(
      eq(schema.projects.workspaceId, pilotWorkspace.id),
      eq(schema.projects.slug, "pilot-operating-brain"),
    ))
    .limit(1);

  if (!pilotProject) {
    [pilotProject] = await db.insert(schema.projects).values({
      tenantId: tenant.id,
      workspaceId: pilotWorkspace.id,
      name: "Pilot Operating Brain",
      slug: "pilot-operating-brain",
      summary: "A narrow pilot for capturing raw communication, extracting next steps, approving changes, and maintaining a living project brain.",
      status: "active",
      health: "yellow",
      ownerId: user.id,
      metadataJson: {
        pilot: "generic",
        scope: "capture-approval-memory",
      },
    }).returning();
  }

  for (const status of statuses) {
    await db.insert(schema.taskStatuses).values({
      tenantId: tenant.id,
      workspaceId: pilotWorkspace.id,
      ...status,
      color: null,
    }).onConflictDoNothing();
  }

  const queueSeeds = [
    {
      name: "Leadership",
      slug: "leadership",
      description: "Founder priorities, strategic decisions, alignment gaps, and unresolved leadership questions.",
      sortOrder: 0,
    },
    {
      name: "Hiring / Team",
      slug: "hiring-team",
      description: "Role clarity, hiring needs, team ownership, onboarding, and capacity questions.",
      sortOrder: 1,
    },
    {
      name: "Ops",
      slug: "ops",
      description: "Operating follow-up, SOPs, admin details, and routine execution work.",
      sortOrder: 2,
    },
  ] as const;

  for (const queue of queueSeeds) {
    await db.insert(schema.queues).values({
      tenantId: tenant.id,
      workspaceId: pilotWorkspace.id,
      ...queue,
      metadataJson: { pilot: "generic" },
    }).onConflictDoNothing();
  }

  const pilotQueues = await db
    .select()
    .from(schema.queues)
    .where(eq(schema.queues.workspaceId, pilotWorkspace.id));

  const queueBySlug = Object.fromEntries(pilotQueues.map((queue) => [queue.slug, queue]));

  const captureTitle = "Founder ops and hiring dump";
  let [pilotInteraction] = await db
    .select()
    .from(schema.interactions)
    .where(and(
      eq(schema.interactions.workspaceId, pilotWorkspace.id),
      eq(schema.interactions.title, captureTitle),
    ))
    .limit(1);

  if (!pilotInteraction) {
    [pilotInteraction] = await db.insert(schema.interactions).values({
      tenantId: tenant.id,
      workspaceId: pilotWorkspace.id,
      projectId: pilotProject.id,
      queueId: queueBySlug.ops?.id ?? null,
      title: captureTitle,
      sourceType: "manual",
      sourceLabel: "voice-to-text note",
      occurredAt: new Date(),
      summary: "Captured a messy founder update about hiring pressure, unclear ownership, and the need to turn meeting follow-up into visible tasks.",
      rawContent: "We need to stop losing action items after calls. Hiring is moving but roles are fuzzy. Ops follow-up keeps living in memory and messages. We need one place to approve next steps and keep decisions visible.",
      artifactId: null,
      capturedBy: user.id,
      metadataJson: {
        pilot: "generic",
        intakeType: "voice_note",
      },
    }).returning();
  }

  const proposalSeeds = [
    {
      targetType: "task",
      title: "Define owner for each active hiring lane",
      bodyMarkdown: "Create a visible task to assign owners for current hiring lanes and identify gaps.",
      queueId: queueBySlug["hiring-team"]?.id ?? null,
      sourceExcerpt: "Hiring is moving but roles are fuzzy.",
      proposedPatchJson: {
        title: "Define owner for each active hiring lane",
        priority: "high",
        status: "todo",
      },
    },
    {
      targetType: "decision",
      title: "Use approval-first capture before automating writes",
      bodyMarkdown: "Record that pilot workspace output must be reviewed before becoming tasks, decisions, or memory.",
      queueId: queueBySlug.leadership?.id ?? null,
      sourceExcerpt: "We need one place to approve next steps and keep decisions visible.",
      proposedPatchJson: {
        decisionText: "Pilot Command Center will use approval-first capture for meeting, email, voice, and copied chat dumps.",
        status: "accepted",
      },
    },
    {
      targetType: "compiled_page",
      title: "Update Ops SOPs with capture habit",
      bodyMarkdown: "Add a lightweight SOP: dump meeting notes and voice updates into TCC after important conversations.",
      queueId: queueBySlug.ops?.id ?? null,
      sourceExcerpt: "We need to stop losing action items after calls.",
      proposedPatchJson: {
        pageSlug: "ops-sops",
        changeSummary: "Add capture-after-call habit to Ops SOPs.",
      },
    },
  ] as const;

  for (const proposal of proposalSeeds) {
    const existing = await db
      .select({ id: schema.proposals.id })
      .from(schema.proposals)
      .where(and(
        eq(schema.proposals.workspaceId, pilotWorkspace.id),
        eq(schema.proposals.title, proposal.title),
      ))
      .limit(1);

    if (!existing.length) {
      await db.insert(schema.proposals).values({
        tenantId: tenant.id,
        workspaceId: pilotWorkspace.id,
        projectId: pilotProject.id,
        interactionId: pilotInteraction.id,
        status: "pending",
        confidenceBps: 7800,
        proposedBy: user.id,
        reviewedBy: null,
        reviewedAt: null,
        ...proposal,
      });
    }
  }

  const compiledPageSeeds = [
    {
      slug: "project-overview",
      title: "Project Overview",
      pageType: "overview",
      summary: "The pilot turns messy communication into approved tasks, decisions, questions, and memory.",
      content: "# Project Overview\n\nPilot Command Center is a narrow pilot for capture, approval, and continuity.\n",
    },
    {
      slug: "current-roles",
      title: "Current Roles",
      pageType: "roles",
      summary: "Role clarity belongs here as hiring and ownership details become explicit.",
      content: "# Current Roles\n\nUse approved source-backed updates to keep role ownership current.\n",
    },
    {
      slug: "open-questions",
      title: "Open Questions",
      pageType: "questions",
      summary: "Unresolved questions extracted from meetings, email, voice notes, and copied chat summaries.",
      content: "# Open Questions\n\n- Which hiring lanes need a named owner this week?\n",
    },
    {
      slug: "decisions",
      title: "Decisions",
      pageType: "decisions",
      summary: "Accepted decisions with source context so the team avoids relitigating settled calls.",
      content: "# Decisions\n\nAccepted decisions should be linked back to the source interaction that produced them.\n",
    },
    {
      slug: "hiring-needs",
      title: "Hiring Needs",
      pageType: "hiring",
      summary: "Hiring gaps, role needs, and ownership questions surfaced by the pilot.",
      content: "# Hiring Needs\n\nUse approved proposals to keep hiring needs current.\n",
    },
    {
      slug: "ops-sops",
      title: "Ops SOPs",
      pageType: "sop",
      summary: "Small operating habits that reduce founder memory burden and loose follow-up.",
      content: "# Ops SOPs\n\n- After important conversations, dump notes into the Capture Hub for extraction and approval.\n",
    },
  ] as const;

  for (const pageSeed of compiledPageSeeds) {
    let [compiledPage] = await db
      .select()
      .from(schema.compiledPages)
      .where(and(
        eq(schema.compiledPages.workspaceId, pilotWorkspace.id),
        eq(schema.compiledPages.slug, pageSeed.slug),
      ))
      .limit(1);

    if (!compiledPage) {
      [compiledPage] = await db.insert(schema.compiledPages).values({
        tenantId: tenant.id,
        workspaceId: pilotWorkspace.id,
        projectId: pilotProject.id,
        slug: pageSeed.slug,
        title: pageSeed.title,
        pageType: pageSeed.pageType,
        status: "active",
        summary: pageSeed.summary,
        sourceConfidenceBps: 7000,
        humanOwnerId: user.id,
        metadataJson: { pilot: "generic" },
      }).returning();
    }

    const existingRevision = await db
      .select({ id: schema.compiledPageRevisions.id })
      .from(schema.compiledPageRevisions)
      .where(and(
        eq(schema.compiledPageRevisions.pageId, compiledPage.id),
        eq(schema.compiledPageRevisions.revisionNumber, 1),
      ))
      .limit(1);

    if (!existingRevision.length) {
      await db.insert(schema.compiledPageRevisions).values({
        tenantId: tenant.id,
        pageId: compiledPage.id,
        interactionId: pilotInteraction.id,
        revisionNumber: 1,
        contentMarkdown: pageSeed.content,
        changeSummary: "Initial pilot workspace page shell.",
        reviewStatus: "approved",
        reviewedBy: user.id,
        reviewedAt: new Date(),
      });
    }
  }

  console.log({
    userId: user.id,
    tenantId: tenant.id,
    workspaceId: pilotWorkspace.id,
    projectId: pilotProject.id,
    route: `/${tenant.slug}/${pilotWorkspace.slug}`,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
