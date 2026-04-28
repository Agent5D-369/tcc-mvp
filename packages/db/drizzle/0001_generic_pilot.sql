DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM workspaces WHERE slug = 'pilot-command')
    AND NOT EXISTS (SELECT 1 FROM workspaces WHERE slug = 'demo-command')
  THEN
    UPDATE workspaces
    SET
      name = 'Demo Command Center',
      slug = 'demo-command',
      description = 'Demo workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.',
      updated_at = now()
    WHERE slug = 'pilot-command';
  END IF;
END $$;

UPDATE workspaces
SET
  name = 'Demo Command Center',
  description = 'Demo workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.',
  updated_at = now()
WHERE slug = 'demo-command';

UPDATE projects
SET
  name = 'Demo Operating Brain',
  slug = 'demo-operating-brain',
  summary = 'A demo workflow for capturing raw communication, extracting next steps, approving changes, and maintaining a living project brain.',
  metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'demo' || '{"demo":true}'::jsonb,
  updated_at = now()
WHERE slug IN ('pilot-operating-brain', 'demo-operating-brain');
