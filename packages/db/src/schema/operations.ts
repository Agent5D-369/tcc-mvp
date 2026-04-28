import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { artifacts } from "./ai";
import { tenants, users, workspaces } from "./core";
import { sourceTypeEnum } from "./enums";
import { projects } from "./projects";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const queues = pgTable("queues", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (t) => ({
  workspaceSlugIdx: uniqueIndex("queues_workspace_slug_unique").on(t.workspaceId, t.slug),
  tenantWorkspaceIdx: index("queues_tenant_workspace_idx").on(t.tenantId, t.workspaceId),
}));

export const interactions = pgTable("interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  queueId: uuid("queue_id").references(() => queues.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  sourceType: sourceTypeEnum("source_type").default("manual").notNull(),
  sourceLabel: text("source_label"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  summary: text("summary"),
  rawContent: text("raw_content"),
  artifactId: uuid("artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
  capturedBy: uuid("captured_by").references(() => users.id, { onDelete: "set null" }),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (t) => ({
  workspaceIdx: index("interactions_workspace_idx").on(t.workspaceId),
  projectIdx: index("interactions_project_idx").on(t.projectId),
  queueIdx: index("interactions_queue_idx").on(t.queueId),
}));

export const proposals = pgTable("proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  queueId: uuid("queue_id").references(() => queues.id, { onDelete: "set null" }),
  interactionId: uuid("interaction_id").references(() => interactions.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  title: text("title").notNull(),
  bodyMarkdown: text("body_markdown"),
  status: text("status").default("pending").notNull(),
  confidenceBps: integer("confidence_bps").default(7000).notNull(),
  sourceExcerpt: text("source_excerpt"),
  proposedPatchJson: jsonb("proposed_patch_json").$type<Record<string, unknown>>().default({}).notNull(),
  appliedEntityId: uuid("applied_entity_id"),
  proposedBy: uuid("proposed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  workspaceStatusIdx: index("proposals_workspace_status_idx").on(t.workspaceId, t.status),
  queueStatusIdx: index("proposals_queue_status_idx").on(t.queueId, t.status),
  interactionIdx: index("proposals_interaction_idx").on(t.interactionId),
}));

export const compiledPages = pgTable("compiled_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  pageType: text("page_type").notNull(),
  status: text("status").default("active").notNull(),
  summary: text("summary"),
  sourceConfidenceBps: integer("source_confidence_bps").default(7000).notNull(),
  humanOwnerId: uuid("human_owner_id").references(() => users.id, { onDelete: "set null" }),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (t) => ({
  workspaceSlugIdx: uniqueIndex("compiled_pages_workspace_slug_unique").on(t.workspaceId, t.slug),
  projectIdx: index("compiled_pages_project_idx").on(t.projectId),
}));

export const compiledPageRevisions = pgTable("compiled_page_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  pageId: uuid("page_id").notNull().references(() => compiledPages.id, { onDelete: "cascade" }),
  interactionId: uuid("interaction_id").references(() => interactions.id, { onDelete: "set null" }),
  revisionNumber: integer("revision_number").notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  changeSummary: text("change_summary"),
  reviewStatus: text("review_status").default("approved").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pageRevisionIdx: uniqueIndex("compiled_page_revisions_page_revision_unique").on(t.pageId, t.revisionNumber),
}));
