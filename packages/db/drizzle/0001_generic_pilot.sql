DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM workspaces WHERE slug = 'amora-command')
    AND NOT EXISTS (SELECT 1 FROM workspaces WHERE slug = 'pilot-command')
  THEN
    UPDATE workspaces
    SET
      name = 'Pilot Command Center',
      slug = 'pilot-command',
      description = 'Pilot workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.',
      updated_at = now()
    WHERE slug = 'amora-command';
  END IF;
END $$;

UPDATE workspaces
SET
  name = 'Pilot Command Center',
  description = 'Pilot workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.',
  updated_at = now()
WHERE slug = 'pilot-command';

UPDATE projects
SET
  name = 'Pilot Operating Brain',
  summary = 'A narrow pilot for capturing raw communication, extracting next steps, approving changes, and maintaining a living project brain.',
  metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"pilot":"generic"}'::jsonb,
  updated_at = now()
WHERE slug = 'pilot-operating-brain';

UPDATE queues
SET metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"pilot":"generic"}'::jsonb,
    updated_at = now()
WHERE metadata_json ->> 'pilot' = 'amora';

UPDATE interactions
SET metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"pilot":"generic"}'::jsonb,
    updated_at = now()
WHERE metadata_json ->> 'pilot' = 'amora';

UPDATE proposals
SET
  body_markdown = replace(body_markdown, 'Amora pilot', 'pilot workspace'),
  proposed_patch_json = replace(proposed_patch_json::text, 'Amora Command Center Lite', 'Pilot Command Center')::jsonb,
  updated_at = now()
WHERE body_markdown ILIKE '%Amora%' OR proposed_patch_json::text ILIKE '%Amora%';

UPDATE compiled_pages
SET metadata_json = coalesce(metadata_json, '{}'::jsonb) - 'pilot' || '{"pilot":"generic"}'::jsonb,
    updated_at = now()
WHERE metadata_json ->> 'pilot' = 'amora';

UPDATE compiled_page_revisions
SET
  content_markdown = replace(content_markdown, 'Amora Command Center Lite', 'Pilot Command Center'),
  change_summary = replace(change_summary, 'Amora pilot', 'pilot workspace')
WHERE content_markdown ILIKE '%Amora%' OR change_summary ILIKE '%Amora%';
