UPDATE tenants
SET
  name = 'QuickLaunch Team Command Center',
  slug = 'quicklaunch-team-command-center',
  updated_at = now()
WHERE slug = 'quicklaunch-demo';

UPDATE workspaces
SET
  name = 'Command Center Demo',
  slug = 'command-center-demo',
  description = 'Sample workspace for turning meeting, email, voice, and chat dumps into approved tasks, decisions, and source-backed memory.',
  updated_at = now()
WHERE slug = 'demo-command';

UPDATE projects
SET
  name = 'Communications-to-Clarity Pilot',
  slug = 'communications-to-clarity-pilot',
  summary = 'A sample workflow for capturing raw communication, extracting next steps, approving changes, and maintaining a living project brain.',
  updated_at = now()
WHERE slug = 'demo-operating-brain';

UPDATE users
SET
  full_name = 'Team Command Center Demo User',
  updated_at = now()
WHERE email = 'demo@example.com';

