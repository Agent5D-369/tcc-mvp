import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { tenants, users, workspaces } from "./core";
import {
  approvalModeEnum,
  artifactTypeEnum,
  authorTypeEnum,
  messageRoleEnum,
  threadTypeEnum,
} from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const modelPolicies = pgTable("model_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  providerAllowlist: jsonb("provider_allowlist").$type<string[]>().default([]).notNull(),
  modelAllowlist: jsonb("model_allowlist").$type<string[]>().default([]).notNull(),
  maxInputTokens: integer("max_input_tokens"),
  maxOutputTokens: integer("max_output_tokens"),
  spendCapCents: integer("spend_cap_cents"),
  privacyJson: jsonb("privacy_json").$type<Record<string, unknown>>().default({}).notNull(),
  routingJson: jsonb("routing_json").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
});

export const tenantAiProviderKeys = pgTable("tenant_ai_provider_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  keyHint: text("key_hint"),
  status: text("status").default("connected").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantProviderIdx: uniqueIndex("tenant_ai_provider_keys_tenant_provider_unique").on(t.tenantId, t.provider),
}));

export const agentDefinitions = pgTable("agent_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  toolPolicyJson: jsonb("tool_policy_json").$type<Record<string, unknown>>().default({}).notNull(),
  memoryPolicyJson: jsonb("memory_policy_json").$type<Record<string, unknown>>().default({}).notNull(),
  handoffPolicyJson: jsonb("handoff_policy_json").$type<Record<string, unknown>>().default({}).notNull(),
  approvalMode: approvalModeEnum("approval_mode").default("manual").notNull(),
  activeVersion: integer("active_version").default(1).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const threads = pgTable("threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  threadType: threadTypeEnum("thread_type").default("general").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  agentId: uuid("agent_id").references(() => agentDefinitions.id, { onDelete: "set null" }),
  modelPolicyId: uuid("model_policy_id").references(() => modelPolicies.id, { onDelete: "set null" }),
  pinned: boolean("pinned").default(false).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  workspaceIdx: index("threads_workspace_idx").on(t.workspaceId),
  projectIdx: index("threads_project_idx").on(t.projectId),
}));

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  authorType: authorTypeEnum("author_type").notNull(),
  authorId: uuid("author_id"),
  content: text("content").notNull(),
  provider: text("provider"),
  modelName: text("model_name"),
  tokenUsageJson: jsonb("token_usage_json").$type<Record<string, unknown>>().default({}).notNull(),
  citationsJson: jsonb("citations_json").$type<unknown[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  threadCreatedIdx: index("messages_thread_created_idx").on(t.threadId, t.createdAt),
}));

export const artifacts = pgTable("artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  threadId: uuid("thread_id").references(() => threads.id, { onDelete: "set null" }),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
  type: artifactTypeEnum("type").notNull(),
  title: text("title").notNull(),
  storagePath: text("storage_path"),
  contentJson: jsonb("content_json").$type<Record<string, unknown> | null>(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const modelUsageEvents = pgTable("model_usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  threadId: uuid("thread_id").references(() => threads.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  agentId: uuid("agent_id").references(() => agentDefinitions.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  modelName: text("model_name").notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  costMicros: bigint("cost_micros", { mode: "number" }).default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
