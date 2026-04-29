import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(160),
  meetingAt: z.string().optional(),
  summary: z.string().trim().max(2000).optional(),
  notesMarkdown: z.string().trim().max(12000).optional(),
});

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertCanEditWorkspace(ctx);
    const { projectId } = await params;
    const body = createMeetingSchema.parse(await req.json());

    const [project] = await db
      .select({
        id: schema.projects.id,
        tenantId: schema.projects.tenantId,
        workspaceId: schema.projects.workspaceId,
      })
      .from(schema.projects)
      .where(and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.tenantId, ctx.tenantId),
        eq(schema.projects.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const meetingAt = body.meetingAt ? new Date(body.meetingAt) : null;
    if (meetingAt && Number.isNaN(meetingAt.getTime())) {
      return NextResponse.json({ error: "Invalid meeting time" }, { status: 400 });
    }

    const [meeting] = await db
      .insert(schema.meetingNotes)
      .values({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        projectId: project.id,
        title: body.title,
        meetingAt,
        facilitatorId: ctx.userId,
        rawTranscriptPath: null,
        summary: body.summary || null,
        notesMarkdown: body.notesMarkdown || null,
        sourceType: "manual",
        sourceId: null,
      })
      .returning();

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
