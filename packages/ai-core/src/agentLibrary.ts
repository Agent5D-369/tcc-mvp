import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export type AgentSurface = "capture" | "thread" | "project" | "task" | "memory" | "meeting";

export type AgentDefinitionInput = {
  name: string;
  role: string;
  description?: string | null;
  systemPrompt: string;
  surfaces: AgentSurface[];
  workspaceId?: string | null;
  isActive?: boolean;
};

function normalizeSurfaces(value: unknown): AgentSurface[] {
  if (!Array.isArray(value)) return ["thread"];
  const allowed = new Set(["capture", "thread", "project", "task", "memory", "meeting"]);
  return value.filter((item): item is AgentSurface => typeof item === "string" && allowed.has(item));
}

export async function listAgentDefinitions(args: {
  tenantId: string;
  workspaceId: string;
  surface?: AgentSurface;
}) {
  const rows = await db
    .select({
      id: schema.agentDefinitions.id,
      tenantId: schema.agentDefinitions.tenantId,
      workspaceId: schema.agentDefinitions.workspaceId,
      name: schema.agentDefinitions.name,
      role: schema.agentDefinitions.role,
      description: schema.agentDefinitions.description,
      systemPrompt: schema.agentDefinitions.systemPrompt,
      toolPolicyJson: schema.agentDefinitions.toolPolicyJson,
      approvalMode: schema.agentDefinitions.approvalMode,
      activeVersion: schema.agentDefinitions.activeVersion,
      isSystem: schema.agentDefinitions.isSystem,
      updatedAt: schema.agentDefinitions.updatedAt,
    })
    .from(schema.agentDefinitions)
    .where(and(
      eq(schema.agentDefinitions.tenantId, args.tenantId),
      or(
        eq(schema.agentDefinitions.workspaceId, args.workspaceId),
        isNull(schema.agentDefinitions.workspaceId),
      ),
    ))
    .orderBy(asc(schema.agentDefinitions.isSystem), asc(schema.agentDefinitions.name));

  return rows
    .map((agent) => ({
      ...agent,
      surfaces: normalizeSurfaces((agent.toolPolicyJson as { surfaces?: unknown }).surfaces),
      isActive: (agent.toolPolicyJson as { isActive?: unknown }).isActive !== false,
      updatedAt: agent.updatedAt.toISOString(),
    }))
    .filter((agent) => !args.surface || agent.surfaces.includes(args.surface));
}

export async function upsertAgentDefinition(args: {
  tenantId: string;
  workspaceId: string;
  userId: string;
  agentId?: string | null;
  input: AgentDefinitionInput;
}) {
  const toolPolicyJson = {
    surfaces: args.input.surfaces.length ? args.input.surfaces : ["thread"],
    isActive: args.input.isActive !== false,
  };

  if (args.agentId) {
    const [agent] = await db
      .update(schema.agentDefinitions)
      .set({
        name: args.input.name.trim(),
        role: args.input.role.trim(),
        description: args.input.description?.trim() || null,
        systemPrompt: args.input.systemPrompt.trim(),
        toolPolicyJson,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.agentDefinitions.id, args.agentId),
        eq(schema.agentDefinitions.tenantId, args.tenantId),
        eq(schema.agentDefinitions.isSystem, false),
        or(
          eq(schema.agentDefinitions.workspaceId, args.workspaceId),
          isNull(schema.agentDefinitions.workspaceId),
        ),
      ))
      .returning();

    if (!agent) {
      throw new Error("Agent not found");
    }

    return agent;
  }

  const [agent] = await db
    .insert(schema.agentDefinitions)
    .values({
      tenantId: args.tenantId,
      workspaceId: args.input.workspaceId === null ? null : args.workspaceId,
      name: args.input.name.trim(),
      role: args.input.role.trim(),
      description: args.input.description?.trim() || null,
      systemPrompt: args.input.systemPrompt.trim(),
      toolPolicyJson,
      memoryPolicyJson: {},
      handoffPolicyJson: {},
      approvalMode: "manual",
      activeVersion: 1,
      isSystem: false,
      createdBy: args.userId,
    })
    .returning();

  return agent;
}
