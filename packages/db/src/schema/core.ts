import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  membershipRoleEnum,
  planEnum,
  tenantStatusEnum,
  workspaceVisibilityEnum,
} from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  locale: text("locale"),
  timezone: text("timezone"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => ({
  emailIdx: uniqueIndex("users_email_unique").on(t.email),
}));

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  plan: planEnum("plan").default("free").notNull(),
  status: tenantStatusEnum("status").default("trialing").notNull(),
  settingsJson: jsonb("settings_json").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (t) => ({
  slugIdx: uniqueIndex("tenants_slug_unique").on(t.slug),
}));

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  description: text("description"),
  visibility: workspaceVisibilityEnum("visibility").default("private").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
}, (t) => ({
  tenantIdx: index("workspaces_tenant_idx").on(t.tenantId),
  tenantSlugIdx: uniqueIndex("workspaces_tenant_slug_unique").on(t.tenantId, t.slug),
}));

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: membershipRoleEnum("role").default("member").notNull(),
  isDefaultWorkspace: boolean("is_default_workspace").default(false).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  membershipIdx: uniqueIndex("memberships_unique").on(t.tenantId, t.workspaceId, t.userId),
  userIdx: index("memberships_user_idx").on(t.userId),
}));

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }),
  entityId: uuid("entity_id"),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("audit_events_tenant_idx").on(t.tenantId),
  workspaceIdx: index("audit_events_workspace_idx").on(t.workspaceId),
  userIdx: index("audit_events_user_idx").on(t.userId),
  actionIdx: index("audit_events_action_idx").on(t.action),
}));
