CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid,
  "workspace_id" uuid,
  "user_id" uuid,
  "action" varchar(120) NOT NULL,
  "entity_type" varchar(80),
  "entity_id" uuid,
  "metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audit_events_tenant_idx" ON "audit_events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "audit_events_workspace_idx" ON "audit_events" ("workspace_id");
CREATE INDEX IF NOT EXISTS "audit_events_user_idx" ON "audit_events" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_events_action_idx" ON "audit_events" ("action");

DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

UPDATE memberships
SET role = 'manager'
WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@example.com')
  AND role = 'owner';
