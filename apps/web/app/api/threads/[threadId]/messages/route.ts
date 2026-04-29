import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { completeThreadMessage } from "@workspace-kit/ai-core";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

const createMessageSchema = z.object({
  content: z.string().min(1),
  model: z.string().optional(),
  generateReply: z.boolean().optional(),
});

type RouteParams = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { threadId } = await params;

    const [thread] = await db
      .select({ id: schema.threads.id })
      .from(schema.threads)
      .where(and(
        eq(schema.threads.id, threadId),
        eq(schema.threads.tenantId, ctx.tenantId),
        eq(schema.threads.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(schema.messages)
      .where(and(
        eq(schema.messages.threadId, threadId),
        eq(schema.messages.tenantId, ctx.tenantId),
      ))
      .orderBy(asc(schema.messages.createdAt));

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { threadId } = await params;
    const body = createMessageSchema.parse(await req.json());

    let result;

    if (body.generateReply) {
      result = await completeThreadMessage({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        threadId,
        userId: ctx.userId,
        content: body.content,
        model: body.model,
      });
    } else {
      const [thread] = await db
        .select({ id: schema.threads.id })
        .from(schema.threads)
        .where(and(
          eq(schema.threads.id, threadId),
          eq(schema.threads.tenantId, ctx.tenantId),
          eq(schema.threads.workspaceId, ctx.workspaceId),
        ))
        .limit(1);

      if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      const [userMessage] = await db
        .insert(schema.messages)
        .values({
          tenantId: ctx.tenantId,
          threadId,
          role: "user",
          authorType: "user",
          authorId: ctx.userId,
          content: body.content,
          tokenUsageJson: {},
          citationsJson: [],
        })
        .returning();

      await db
        .update(schema.threads)
        .set({ updatedAt: new Date() })
        .where(eq(schema.threads.id, threadId));

      result = {
        userMessage,
        assistantMessage: null,
      };
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
