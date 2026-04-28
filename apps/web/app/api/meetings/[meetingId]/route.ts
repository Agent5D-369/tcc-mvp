import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const updateMeetingSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  meetingAt: z.union([z.string(), z.null()]).optional(),
  summary: z.union([z.string().trim().max(2000), z.null()]).optional(),
  notesMarkdown: z.union([z.string().trim().max(12000), z.null()]).optional(),
});

type RouteParams = {
  params: Promise<{ meetingId: string }>;
};

function parseMeetingAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid meeting time");
  }

  return parsed;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { meetingId } = await params;
    const body = updateMeetingSchema.parse(await req.json());

    const [meeting] = await db
      .select({ id: schema.meetingNotes.id })
      .from(schema.meetingNotes)
      .where(and(
        eq(schema.meetingNotes.id, meetingId),
        eq(schema.meetingNotes.tenantId, ctx.tenantId),
        eq(schema.meetingNotes.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const updateValues: Partial<typeof schema.meetingNotes.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      updateValues.title = body.title;
    }
    if (body.meetingAt !== undefined) {
      updateValues.meetingAt = parseMeetingAt(body.meetingAt);
    }
    if (body.summary !== undefined) {
      updateValues.summary = body.summary || null;
    }
    if (body.notesMarkdown !== undefined) {
      updateValues.notesMarkdown = body.notesMarkdown || null;
    }

    const [updatedMeeting] = await db
      .update(schema.meetingNotes)
      .set(updateValues)
      .where(eq(schema.meetingNotes.id, meeting.id))
      .returning({
        id: schema.meetingNotes.id,
        title: schema.meetingNotes.title,
        summary: schema.meetingNotes.summary,
        notesMarkdown: schema.meetingNotes.notesMarkdown,
        meetingAt: schema.meetingNotes.meetingAt,
      });

    return NextResponse.json({
      meeting: {
        ...updatedMeeting,
        meetingAt: updatedMeeting.meetingAt ? updatedMeeting.meetingAt.toISOString() : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const { meetingId } = await params;

    const [meeting] = await db
      .select({ id: schema.meetingNotes.id })
      .from(schema.meetingNotes)
      .where(and(
        eq(schema.meetingNotes.id, meetingId),
        eq(schema.meetingNotes.tenantId, ctx.tenantId),
        eq(schema.meetingNotes.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await db.delete(schema.meetingNotes).where(eq(schema.meetingNotes.id, meeting.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
