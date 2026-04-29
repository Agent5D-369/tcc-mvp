import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export async function getWorkspaceThreadsIndex(args: {
  tenantId: string;
  workspaceId: string;
}) {
  const threads = await db
    .select({
      id: schema.threads.id,
      title: schema.threads.title,
      threadType: schema.threads.threadType,
      pinned: schema.threads.pinned,
      updatedAt: schema.threads.updatedAt,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
      agentName: schema.agentDefinitions.name,
      messageCount: sql<number>`count(${schema.messages.id})`.mapWith(Number),
    })
    .from(schema.threads)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.threads.projectId))
    .leftJoin(schema.agentDefinitions, eq(schema.agentDefinitions.id, schema.threads.agentId))
    .leftJoin(schema.messages, eq(schema.messages.threadId, schema.threads.id))
    .where(and(
      eq(schema.threads.tenantId, args.tenantId),
      eq(schema.threads.workspaceId, args.workspaceId),
    ))
    .groupBy(schema.threads.id, schema.projects.id, schema.agentDefinitions.id)
    .orderBy(desc(schema.threads.pinned), desc(schema.threads.updatedAt), asc(schema.threads.title));

  return threads.map((thread) => ({
    ...thread,
    updatedAt: thread.updatedAt ? thread.updatedAt.toISOString() : null,
  }));
}

export async function getThreadOverview(args: {
  tenantId: string;
  workspaceId: string;
  threadId: string;
}) {
  const [thread] = await db
    .select({
      id: schema.threads.id,
      title: schema.threads.title,
      threadType: schema.threads.threadType,
      pinned: schema.threads.pinned,
      updatedAt: schema.threads.updatedAt,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
      agentName: schema.agentDefinitions.name,
    })
    .from(schema.threads)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.threads.projectId))
    .leftJoin(schema.agentDefinitions, eq(schema.agentDefinitions.id, schema.threads.agentId))
    .where(and(
      eq(schema.threads.id, args.threadId),
      eq(schema.threads.tenantId, args.tenantId),
      eq(schema.threads.workspaceId, args.workspaceId),
    ))
    .limit(1);

  if (!thread) {
    throw new Error("Thread not found");
  }

  const messages = await db
    .select({
      id: schema.messages.id,
      role: schema.messages.role,
      authorType: schema.messages.authorType,
      content: schema.messages.content,
      createdAt: schema.messages.createdAt,
    })
    .from(schema.messages)
    .where(and(
      eq(schema.messages.threadId, args.threadId),
      eq(schema.messages.tenantId, args.tenantId),
    ))
    .orderBy(asc(schema.messages.createdAt));

  return {
    thread: {
      ...thread,
      updatedAt: thread.updatedAt ? thread.updatedAt.toISOString() : null,
    },
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}
