import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { completeThreadMessage } from "@workspace-kit/ai-core";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const createMessageSchema = z.object({
  content: z.string().min(1),
  model: z.string().optional(),
});

type RouteParams = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_: NextRequest, { params }: RouteParams) {
  try {
    await resolveTenantContext();
    const { threadId } = await params;

    const messages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.threadId, threadId))
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
    const { threadId } = await params;
    const body = createMessageSchema.parse(await req.json());

    const result = await completeThreadMessage({
      tenantId: ctx.tenantId,
      threadId,
      userId: ctx.userId,
      content: body.content,
      model: body.model,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
