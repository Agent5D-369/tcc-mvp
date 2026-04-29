import { and, asc, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const createThreadSchema = z.object({
  title: z.string().trim().min(2).max(160),
  threadType: z.enum(["general", "project", "meeting", "agent_run", "prompt_lab"]).optional(),
  projectId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  pinned: z.boolean().optional(),
});

export async function GET() {
  try {
    const ctx = await resolveTenantContext();

    const threads = await db
      .select({
        id: schema.threads.id,
        title: schema.threads.title,
        threadType: schema.threads.threadType,
        pinned: schema.threads.pinned,
        updatedAt: schema.threads.updatedAt,
        projectId: schema.projects.id,
        projectName: schema.projects.name,
        projectSlug: schema.projects.slug,
        messageCount: sql<number>`count(${schema.messages.id})`.mapWith(Number),
      })
      .from(schema.threads)
      .leftJoin(schema.projects, eq(schema.projects.id, schema.threads.projectId))
      .leftJoin(schema.messages, eq(schema.messages.threadId, schema.threads.id))
      .where(and(
        eq(schema.threads.tenantId, ctx.tenantId),
        eq(schema.threads.workspaceId, ctx.workspaceId),
      ))
      .groupBy(schema.threads.id, schema.projects.id)
      .orderBy(desc(schema.threads.pinned), desc(schema.threads.updatedAt), asc(schema.threads.title));

    return NextResponse.json({
      threads: threads.map((thread) => ({
        ...thread,
        updatedAt: thread.updatedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext();
    const body = createThreadSchema.parse(await req.json());

    if (body.projectId) {
      const [project] = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(and(
          eq(schema.projects.id, body.projectId),
          eq(schema.projects.tenantId, ctx.tenantId),
          eq(schema.projects.workspaceId, ctx.workspaceId),
        ))
        .limit(1);

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    if (body.agentId) {
      const [agent] = await db
        .select({ id: schema.agentDefinitions.id })
        .from(schema.agentDefinitions)
        .where(and(
          eq(schema.agentDefinitions.id, body.agentId),
          eq(schema.agentDefinitions.tenantId, ctx.tenantId),
          sql`${schema.agentDefinitions.workspaceId} is null or ${schema.agentDefinitions.workspaceId} = ${ctx.workspaceId}`,
        ))
        .limit(1);

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const [thread] = await db
      .insert(schema.threads)
      .values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        projectId: body.projectId ?? null,
        title: body.title,
        threadType: body.agentId ? "agent_run" : body.projectId ? "project" : (body.threadType ?? "general"),
        createdBy: ctx.userId,
        agentId: body.agentId ?? null,
        pinned: body.pinned ?? false,
      })
      .returning({
        id: schema.threads.id,
        title: schema.threads.title,
      });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
