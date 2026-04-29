UPDATE tasks
SET status_id = task_statuses.id,
    updated_at = now()
FROM task_statuses
WHERE task_statuses.workspace_id = tasks.workspace_id
  AND task_statuses.tenant_id = tasks.tenant_id
  AND task_statuses.kind = 'done'
  AND tasks.title IN (
    'Finalize Railway-ready app shell',
    'Write tenant onboarding notes',
    'Connect the production database on Railway'
  )
  AND tasks.description IN (
    'Close the remaining build and deployment gaps so the MVP can ship as one web service.',
    'Document how a new organization gets a tenant, workspace, and default memberships.',
    'Provision PostgreSQL, set environment variables, and run migrations in Railway.'
  );
