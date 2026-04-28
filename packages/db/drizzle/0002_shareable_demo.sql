DO $$
DECLARE
  demo_user_id uuid;
  owner_user_id uuid;
  demo_tenant_id uuid;
  demo_workspace_id uuid;
BEGIN
  INSERT INTO users (email, full_name, created_at, updated_at)
  VALUES ('demo@example.com', 'QuickLaunch Demo User', now(), now())
  ON CONFLICT (email) DO UPDATE
  SET full_name = 'QuickLaunch Demo User', updated_at = now()
  RETURNING id INTO demo_user_id;

  INSERT INTO users (email, full_name, created_at, updated_at)
  VALUES ('rbroider@gmail.com', 'Rick Broider', now(), now())
  ON CONFLICT (email) DO UPDATE
  SET full_name = coalesce(users.full_name, 'Rick Broider'), updated_at = now()
  RETURNING id INTO owner_user_id;

  SELECT id INTO demo_tenant_id
  FROM tenants
  WHERE slug = 'quicklaunch-demo'
  LIMIT 1;

  IF demo_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, plan, status, settings_json, created_at, updated_at)
    VALUES ('QuickLaunch Demo', 'quicklaunch-demo', 'team', 'active', '{}'::jsonb, now(), now())
    RETURNING id INTO demo_tenant_id;
  END IF;

  IF EXISTS (SELECT 1 FROM workspaces WHERE tenant_id = demo_tenant_id AND slug = 'pilot-command')
    AND NOT EXISTS (SELECT 1 FROM workspaces WHERE tenant_id = demo_tenant_id AND slug = 'demo-command')
  THEN
    UPDATE workspaces
    SET
      name = 'Demo Command Center',
      slug = 'demo-command',
      description = 'Demo workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.',
      updated_at = now()
    WHERE tenant_id = demo_tenant_id AND slug = 'pilot-command';
  END IF;

  SELECT id INTO demo_workspace_id
  FROM workspaces
  WHERE tenant_id = demo_tenant_id AND slug = 'demo-command'
  LIMIT 1;

  IF demo_workspace_id IS NULL THEN
    INSERT INTO workspaces (tenant_id, name, slug, description, visibility, created_by, created_at, updated_at)
    VALUES (
      demo_tenant_id,
      'Demo Command Center',
      'demo-command',
      'Demo workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.',
      'private',
      demo_user_id,
      now(),
      now()
    )
    RETURNING id INTO demo_workspace_id;
  END IF;

  INSERT INTO memberships (tenant_id, workspace_id, user_id, role, is_default_workspace, joined_at)
  VALUES (demo_tenant_id, demo_workspace_id, demo_user_id, 'owner', true, now())
  ON CONFLICT (tenant_id, workspace_id, user_id) DO UPDATE
  SET role = 'owner', is_default_workspace = true;

  UPDATE memberships
  SET is_default_workspace = false
  WHERE tenant_id = demo_tenant_id
    AND user_id = demo_user_id
    AND workspace_id <> demo_workspace_id;

  INSERT INTO memberships (tenant_id, workspace_id, user_id, role, is_default_workspace, joined_at)
  VALUES (demo_tenant_id, demo_workspace_id, owner_user_id, 'owner', true, now())
  ON CONFLICT (tenant_id, workspace_id, user_id) DO UPDATE
  SET role = 'owner', is_default_workspace = true;

  UPDATE memberships
  SET is_default_workspace = false
  WHERE tenant_id = demo_tenant_id
    AND user_id = owner_user_id
    AND workspace_id <> demo_workspace_id;

  UPDATE projects
  SET
    name = 'Demo Operating Brain',
    slug = 'demo-operating-brain',
    summary = 'A demo workflow for capturing raw communication, extracting next steps, approving changes, and maintaining a living project brain.',
    metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"demo":true}'::jsonb,
    updated_at = now()
  WHERE workspace_id = demo_workspace_id
    AND slug IN ('pilot-operating-brain', 'demo-operating-brain');

  UPDATE queues
  SET metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"demo":true}'::jsonb,
      updated_at = now()
  WHERE workspace_id = demo_workspace_id;

  UPDATE interactions
  SET metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"demo":true}'::jsonb,
      updated_at = now()
  WHERE workspace_id = demo_workspace_id;

  UPDATE compiled_pages
  SET metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"demo":true}'::jsonb,
      updated_at = now()
  WHERE workspace_id = demo_workspace_id;
END $$;
