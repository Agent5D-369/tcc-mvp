import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";
import { createOpenRouterChat, type ChatMessage } from "./openrouter";

export async function completeThreadMessage(args: {
  tenantId: string;
  workspaceId: string;
  threadId: string;
  userId: string;
  content: string;
  model?: string;
}) {
  const threadRows = await db
    .select({
      id: schema.threads.id,
      title: schema.threads.title,
      agentId: schema.threads.agentId,
      modelPolicyId: schema.threads.modelPolicyId,
      workspaceId: schema.threads.workspaceId,
      projectId: schema.threads.projectId,
      systemPrompt: schema.agentDefinitions.systemPrompt,
    })
    .from(schema.threads)
    .leftJoin(schema.agentDefinitions, eq(schema.agentDefinitions.id, schema.threads.agentId))
    .where(and(
      eq(schema.threads.id, args.threadId),
      eq(schema.threads.tenantId, args.tenantId),
      eq(schema.threads.workspaceId, args.workspaceId),
    ))
    .limit(1);

  const thread = threadRows[0];
  if (!thread) {
    throw new Error("Thread not found");
  }

  const [userMessage] = await db.insert(schema.messages).values({
    tenantId: args.tenantId,
    threadId: args.threadId,
    role: "user",
    authorType: "user",
    authorId: args.userId,
    content: args.content,
    tokenUsageJson: {},
    citationsJson: [],
  }).returning();

  const priorMessages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.threadId, args.threadId))
    .orderBy(asc(schema.messages.createdAt));

  const messages: ChatMessage[] = [];
  if (thread.systemPrompt) {
    messages.push({ role: "system", content: thread.systemPrompt });
  }

  for (const m of priorMessages.slice(-24)) {
    if (m.role === "system") continue;
    messages.push({
      role: m.role === "tool" ? "tool" : m.role,
      content: m.content,
    });
  }

  const completion = await createOpenRouterChat({
    model: args.model,
    messages,
  });

  const usage = (completion.raw as any)?.usage ?? {};

  const [assistantMessage] = await db.insert(schema.messages).values({
    tenantId: args.tenantId,
    threadId: args.threadId,
    role: "assistant",
    authorType: "agent",
    authorId: thread.agentId,
    content: completion.text,
    provider: completion.provider ?? null,
    modelName: completion.model ?? null,
    tokenUsageJson: usage,
    citationsJson: [],
  }).returning();

  await db.insert(schema.modelUsageEvents).values({
    tenantId: args.tenantId,
    workspaceId: thread.workspaceId,
    projectId: thread.projectId,
    threadId: args.threadId,
    userId: args.userId,
    agentId: thread.agentId,
    provider: completion.provider || "openrouter",
    modelName: completion.model || args.model || process.env.OPENROUTER_DEFAULT_MODEL || "unknown",
    inputTokens: Number(usage.prompt_tokens || usage.input_tokens || 0),
    outputTokens: Number(usage.completion_tokens || usage.output_tokens || 0),
    costMicros: 0,
  });

  return {
    userMessage,
    assistantMessage,
  };
}
