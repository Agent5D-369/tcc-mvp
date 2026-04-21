import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants, users, workspaces } from "./core";
import {
  decisionStatusEnum,
  healthEnum,
  priorityEnum,
  projectStatusEnum,
  sourceTypeEnum,
  taskStatusKindEnum,
} from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  summary: text("summary"),
  status: projectStatusEnum("status").default("draft").notNull(),
  health: healthEnum("health").default("unknown").notNull(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  startDate: timestamp("start_date", { mode: "date" }),
  targetDate: timestamp("target_date", { mode: "date" }),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (t) => ({
  workspaceSlugIdx: uniqueIndex("projects_workspace_slug_unique").on(t.workspaceId, t.slug),
  tenantWorkspaceIdx: index("projects_tenant_workspace_idx").on(t.tenantId, t.workspaceId),
}));

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
}, (t) => ({
  projectIdx: index("milestones_project_idx").on(t.projectId),
}));

export const taskStatuses = pgTable("task_statuses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: taskStatusKindEnum("kind").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  color: text("color"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  workspaceNameIdx: uniqueIndex("task_statuses_workspace_name_unique").on(t.workspaceId, t.name),
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentTaskId: uuid("parent_task_id"),
  statusId: uuid("status_id").references(() => taskStatuses.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: priorityEnum("priority").default("medium").notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  estimateMinutes: integer("estimate_minutes"),
  sourceType: sourceTypeEnum("source_type").default("manual").notNull(),
  sourceId: uuid("source_id"),
  rank: numeric("rank", { precision: 20, scale: 10 }),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (t) => ({
  projectIdx: index("tasks_project_idx").on(t.projectId),
  assigneeIdx: index("tasks_assignee_idx").on(t.assigneeId),
  dueIdx: index("tasks_due_idx").on(t.dueAt),
}));

export const meetingNotes = pgTable("meeting_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  meetingAt: timestamp("meeting_at", { withTimezone: true }),
  facilitatorId: uuid("facilitator_id").references(() => users.id, { onDelete: "set null" }),
  rawTranscriptPath: text("raw_transcript_path"),
  summary: text("summary"),
  notesMarkdown: text("notes_markdown"),
  sourceType: sourceTypeEnum("source_type").default("manual").notNull(),
  sourceId: uuid("source_id"),
  ...timestamps,
});

export const decisionLog = pgTable("decision_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  context: text("context"),
  decisionText: text("decision_text").notNull(),
  status: decisionStatusEnum("status").default("proposed").notNull(),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  sourceType: sourceTypeEnum("source_type").default("manual").notNull(),
  sourceId: uuid("source_id"),
  ...timestamps,
});
