import { pgEnum } from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan_t", ["free", "pro", "team", "enterprise"]);
export const tenantStatusEnum = pgEnum("tenant_status_t", ["active", "trialing", "suspended", "deleted"]);
export const workspaceVisibilityEnum = pgEnum("workspace_visibility_t", ["private", "internal"]);
export const membershipRoleEnum = pgEnum("membership_role_t", ["owner", "admin", "manager", "member", "guest"]);

export const projectStatusEnum = pgEnum("project_status_t", ["draft", "active", "paused", "completed", "archived"]);
export const healthEnum = pgEnum("health_t", ["green", "yellow", "red", "unknown"]);
export const priorityEnum = pgEnum("priority_t", ["low", "medium", "high", "urgent"]);
export const taskStatusKindEnum = pgEnum("task_status_kind_t", ["todo", "in_progress", "blocked", "done", "canceled"]);

export const sourceTypeEnum = pgEnum("source_type_t", ["manual", "meeting", "chat", "document", "agent"]);
export const threadTypeEnum = pgEnum("thread_type_t", ["general", "project", "meeting", "agent_run", "prompt_lab"]);
export const messageRoleEnum = pgEnum("message_role_t", ["system", "user", "assistant", "tool"]);
export const authorTypeEnum = pgEnum("author_type_t", ["user", "agent", "system"]);

export const approvalModeEnum = pgEnum("approval_mode_t", ["manual", "suggest_only", "auto_safe"]);
export const runStatusEnum = pgEnum("run_status_t", ["queued", "running", "awaiting_approval", "succeeded", "failed", "canceled"]);
export const artifactTypeEnum = pgEnum("artifact_type_t", ["markdown", "json", "csv", "doc", "image", "plan", "summary"]);

export const knowledgeSourceTypeEnum = pgEnum("knowledge_source_type_t", ["upload", "google_drive", "notion", "slack", "web", "email", "calendar"]);
export const documentStatusEnum = pgEnum("document_status_t", ["queued", "processing", "ready", "failed", "archived"]);

export const memoryScopeEnum = pgEnum("memory_scope_t", ["user", "project", "workspace", "tenant", "agent"]);
export const memoryKindEnum = pgEnum("memory_kind_t", ["fact", "preference", "decision", "constraint", "glossary", "relationship"]);
export const memoryReviewStatusEnum = pgEnum("memory_review_status_t", ["proposed", "approved", "rejected"]);

export const decisionStatusEnum = pgEnum("decision_status_t", ["proposed", "accepted", "rejected", "superseded"]);
