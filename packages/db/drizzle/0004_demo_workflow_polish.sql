DO $$
DECLARE
  demo_user_id uuid;
  demo_tenant_id uuid;
  demo_workspace_id uuid;
  demo_project_id uuid;
  ops_queue_id uuid;
  leadership_queue_id uuid;
  demo_interaction_id uuid;
BEGIN
  SELECT id INTO demo_user_id FROM users WHERE email = 'demo@example.com' LIMIT 1;
  SELECT id INTO demo_tenant_id FROM tenants WHERE slug = 'quicklaunch-demo' LIMIT 1;
  SELECT id INTO demo_workspace_id FROM workspaces WHERE tenant_id = demo_tenant_id AND slug = 'demo-command' LIMIT 1;
  SELECT id INTO demo_project_id FROM projects WHERE workspace_id = demo_workspace_id ORDER BY updated_at DESC LIMIT 1;
  SELECT id INTO ops_queue_id FROM queues WHERE workspace_id = demo_workspace_id AND slug = 'ops' LIMIT 1;
  SELECT id INTO leadership_queue_id FROM queues WHERE workspace_id = demo_workspace_id AND slug = 'leadership' LIMIT 1;

  IF demo_tenant_id IS NULL OR demo_workspace_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO agent_definitions (
    tenant_id, workspace_id, name, role, description, system_prompt, tool_policy_json,
    memory_policy_json, handoff_policy_json, approval_mode, active_version, is_system, created_by, created_at, updated_at
  )
  SELECT
    demo_tenant_id,
    demo_workspace_id,
    'Meeting Extractor',
    'Meeting intelligence analyst',
    'Extracts summaries, decisions, tasks, owners, open questions, and memory updates from meeting transcripts.',
    '# Mission
Turn meeting notes into source-backed operating proposals.

# Output posture
- Capture decisions separately from tasks.
- Preserve open questions when ownership or timing is unclear.
- Suggest memory updates only for durable facts, roles, SOPs, or context.
- Never invent owners, dates, or commitments.',
    '{"surfaces":["capture","meeting","memory"],"isActive":true}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    'manual',
    1,
    false,
    demo_user_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM agent_definitions WHERE tenant_id = demo_tenant_id AND workspace_id = demo_workspace_id AND name = 'Meeting Extractor'
  );

  INSERT INTO agent_definitions (
    tenant_id, workspace_id, name, role, description, system_prompt, tool_policy_json,
    memory_policy_json, handoff_policy_json, approval_mode, active_version, is_system, created_by, created_at, updated_at
  )
  SELECT
    demo_tenant_id,
    demo_workspace_id,
    'Decision Tracker',
    'Decision historian',
    'Finds decisions, decision reversals, assumptions, and evidence from messy communication.',
    '# Mission
Identify what was decided, what is still unresolved, and what evidence supports each recommendation.

# Rules
- A decision must include the choice, context, and effect.
- If the source only implies a decision, mark it as proposed.
- Prefer crisp wording that can go straight into a decision log after review.',
    '{"surfaces":["capture","thread","project","memory"],"isActive":true}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    'manual',
    1,
    false,
    demo_user_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM agent_definitions WHERE tenant_id = demo_tenant_id AND workspace_id = demo_workspace_id AND name = 'Decision Tracker'
  );

  INSERT INTO agent_definitions (
    tenant_id, workspace_id, name, role, description, system_prompt, tool_policy_json,
    memory_policy_json, handoff_policy_json, approval_mode, active_version, is_system, created_by, created_at, updated_at
  )
  SELECT
    demo_tenant_id,
    demo_workspace_id,
    'Founder Follow-up Agent',
    'Founder operations aide',
    'Turns founder voice notes and raw follow-up into clear next actions without overbuilding process.',
    '# Mission
Reduce founder memory burden by converting raw follow-up into specific proposed actions.

# Rules
- Keep recommendations practical and lightweight.
- Separate urgent follow-up from long-term ideas.
- Flag unclear ownership instead of guessing.
- Use approval-first wording.',
    '{"surfaces":["capture","thread","task"],"isActive":true}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    'manual',
    1,
    false,
    demo_user_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM agent_definitions WHERE tenant_id = demo_tenant_id AND workspace_id = demo_workspace_id AND name = 'Founder Follow-up Agent'
  );

  INSERT INTO interactions (
    tenant_id, workspace_id, project_id, queue_id, title, source_type, source_label,
    occurred_at, summary, raw_content, captured_by, metadata_json, created_at, updated_at
  )
  SELECT
    demo_tenant_id,
    demo_workspace_id,
    demo_project_id,
    coalesce(ops_queue_id, leadership_queue_id),
    'Sample leadership sync: launch follow-up',
    'meeting',
    'Sample meeting transcript',
    now() - interval '1 day',
    'Leadership discussed launch readiness, hiring coverage, customer onboarding, and the need to turn meeting follow-up into approved operating records.',
    'Read AI recap pasted by founder:

Attendees: Founder, Ops Lead, Hiring Lead, Customer Lead.

Founder: We need one place to drop meeting notes and get the actual follow-up out. I do not want another project management ceremony.

Ops Lead: The biggest gap is ownership. We know what was discussed, but two days later nobody remembers who owns the next action.

Hiring Lead: For hiring, we need a living roles page. Current needs are fractional ops support, customer onboarding coverage, and a simple interview scorecard.

Customer Lead: For onboarding, we should decide whether every new customer gets a kickoff checklist before the first live session.

Decision: Use a lightweight approval inbox before anything becomes official.

Open question: Who owns weekly review of approved tasks and memory updates?

Follow-up: Draft kickoff checklist, create hiring needs page, and review unresolved ownership by Friday.',
    demo_user_id,
    '{"demo":true,"sample":true,"intake":"seeded_demo"}'::jsonb,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM interactions WHERE workspace_id = demo_workspace_id AND title = 'Sample leadership sync: launch follow-up'
  )
  RETURNING id INTO demo_interaction_id;

  IF demo_interaction_id IS NULL THEN
    SELECT id INTO demo_interaction_id
    FROM interactions
    WHERE workspace_id = demo_workspace_id AND title = 'Sample leadership sync: launch follow-up'
    LIMIT 1;
  END IF;

  INSERT INTO proposals (
    tenant_id, workspace_id, project_id, queue_id, interaction_id, target_type, title,
    body_markdown, status, confidence_bps, source_excerpt, proposed_patch_json, proposed_by, created_at, updated_at
  )
  SELECT demo_tenant_id, demo_workspace_id, demo_project_id, coalesce(ops_queue_id, leadership_queue_id), demo_interaction_id,
    'task',
    'Assign weekly review owner for approved tasks and memory updates',
    'Choose one accountable owner for weekly review of approved tasks, decisions, and compiled memory updates.',
    'pending',
    8800,
    'Open question: Who owns weekly review of approved tasks and memory updates?',
    '{"priority":"high","status":"todo"}'::jsonb,
    demo_user_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM proposals WHERE workspace_id = demo_workspace_id AND title = 'Assign weekly review owner for approved tasks and memory updates'
  );

  INSERT INTO proposals (
    tenant_id, workspace_id, project_id, queue_id, interaction_id, target_type, title,
    body_markdown, status, confidence_bps, source_excerpt, proposed_patch_json, proposed_by, created_at, updated_at
  )
  SELECT demo_tenant_id, demo_workspace_id, demo_project_id, leadership_queue_id, demo_interaction_id,
    'decision',
    'Use approval inbox before writes become official',
    'The team will route AI-generated tasks, decisions, and memory updates through an approval inbox before they become official operating records.',
    'pending',
    9300,
    'Decision: Use a lightweight approval inbox before anything becomes official.',
    '{"status":"accepted"}'::jsonb,
    demo_user_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM proposals WHERE workspace_id = demo_workspace_id AND title = 'Use approval inbox before writes become official'
  );

  INSERT INTO proposals (
    tenant_id, workspace_id, project_id, queue_id, interaction_id, target_type, title,
    body_markdown, status, confidence_bps, source_excerpt, proposed_patch_json, proposed_by, created_at, updated_at
  )
  SELECT demo_tenant_id, demo_workspace_id, demo_project_id, coalesce(ops_queue_id, leadership_queue_id), demo_interaction_id,
    'compiled_page',
    'Update hiring needs and onboarding memory',
    'Add current hiring needs, onboarding checklist direction, and the weekly review ownership gap to the compiled workspace memory.',
    'pending',
    8400,
    'Current needs are fractional ops support, customer onboarding coverage, and a simple interview scorecard.',
    '{"pageSlug":"hiring-needs"}'::jsonb,
    demo_user_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM proposals WHERE workspace_id = demo_workspace_id AND title = 'Update hiring needs and onboarding memory'
  );

  INSERT INTO compiled_pages (
    tenant_id, workspace_id, project_id, slug, title, page_type, status, summary,
    source_confidence_bps, human_owner_id, metadata_json, created_at, updated_at
  )
  VALUES
    (demo_tenant_id, demo_workspace_id, demo_project_id, 'project-overview', 'Project Overview', 'overview', 'active', 'Current operating context, goals, and launch follow-up for this workspace.', 7600, demo_user_id, '{"demo":true}'::jsonb, now(), now()),
    (demo_tenant_id, demo_workspace_id, demo_project_id, 'roles-and-owners', 'Roles and Owners', 'roles', 'active', 'Who owns what, plus unresolved ownership gaps surfaced from meetings and captured communication.', 7200, demo_user_id, '{"demo":true}'::jsonb, now(), now()),
    (demo_tenant_id, demo_workspace_id, demo_project_id, 'hiring-needs', 'Hiring Needs', 'hiring', 'active', 'Open team coverage needs, role notes, and interview process memory.', 7000, demo_user_id, '{"demo":true}'::jsonb, now(), now())
  ON CONFLICT (workspace_id, slug) DO UPDATE
  SET summary = excluded.summary,
      updated_at = now();
END $$;
