import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { tenants, users, workspaces } from "./core";
import {
  documentStatusEnum,
  knowledgeSourceTypeEnum,
  memoryKindEnum,
  memoryReviewStatusEnum,
  memoryScopeEnum,
  sourceTypeEnum,
} from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const knowledgeSources = pgTable("knowledge_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  type: knowledgeSourceTypeEnum("type").notNull(),
  label: text("label").notNull(),
  externalId: text("external_id"),
  configJson: jsonb("config_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  knowledgeSourceId: uuid("knowledge_source_id").references(() => knowledgeSources.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  mimeType: text("mime_type"),
  storagePath: text("storage_path"),
  sourceUrl: text("source_url"),
  checksum: text("checksum"),
  status: documentStatusEnum("status").default("queued").notNull(),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
}, (t) => ({
  workspaceProjectIdx: index("documents_workspace_project_idx").on(t.workspaceId, t.projectId),
}));

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  documentIdx: index("document_chunks_document_idx").on(t.documentId),
}));

export const memoryItems = pgTable("memory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  scope: memoryScopeEnum("scope").notNull(),
  kind: memoryKindEnum("kind").notNull(),
  key: text("key").notNull(),
  valueJson: jsonb("value_json").$type<Record<string, unknown>>().notNull(),
  confidenceBps: integer("confidence_bps").default(5000).notNull(),
  reviewStatus: memoryReviewStatusEnum("review_status").default("proposed").notNull(),
  sourceType: sourceTypeEnum("source_type").default("manual").notNull(),
  sourceId: uuid("source_id"),
  proposedBy: uuid("proposed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  scopeIdx: index("memory_items_scope_idx").on(t.tenantId, t.scope, t.kind),
  projectIdx: index("memory_items_project_idx").on(t.projectId),
}));
