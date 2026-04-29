import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";
import {
  resolveMembershipByWorkspace,
  updateWorkspaceDetails,
} from "@workspace-kit/auth";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertNotDemoUser } from "@workspace-kit/tenancy/permissions";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";

const updateWorkspaceSchema = z.object({
  workspaceName: z.string().trim().min(2).max(120),
  workspaceDescription: z.string().trim().max(280).optional(),
});

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await resolveTenantContext();
    assertNotDemoUser(ctx);
    const { workspaceId } = await params;

    if (workspaceId !== ctx.workspaceId) {
      return NextResponse.json({ error: "Only the active workspace can be edited here" }, { status: 403 });
    }

    const actorMembership = await resolveMembershipByWorkspace({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });

    if (!ctx.isPlatformAdmin && (!actorMembership || !["owner", "admin"].includes(actorMembership.role))) {
      return NextResponse.json({ error: "Only owners or admins can edit workspace details" }, { status: 403 });
    }

    const body = updateWorkspaceSchema.parse(await req.json());
    const updated = await updateWorkspaceDetails({
      tenantId: ctx.tenantId,
      workspaceId,
      workspaceName: body.workspaceName,
      workspaceDescription: body.workspaceDescription,
    });

    return NextResponse.json({
      workspace: {
        id: updated.workspaceId,
        slug: updated.workspaceSlug,
        name: updated.workspaceName,
        description: updated.workspaceDescription,
      },
      url: `/${updated.tenantSlug}/${updated.workspaceSlug}/settings`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await resolveTenantContext();
    assertNotDemoUser(ctx);
    const { workspaceId } = await params;

    if (workspaceId === ctx.workspaceId) {
      return NextResponse.json({ error: "Switch to another workspace before deleting this one" }, { status: 409 });
    }

    const actorMembership = await resolveMembershipByWorkspace({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });

    if (!ctx.isPlatformAdmin && (!actorMembership || !["owner", "admin"].includes(actorMembership.role))) {
      return NextResponse.json({ error: "Only owners or admins can delete workspaces" }, { status: 403 });
    }

    const [workspace] = await db
      .select({
        id: schema.workspaces.id,
        name: schema.workspaces.name,
        slug: schema.workspaces.slug,
        tenantId: schema.workspaces.tenantId,
      })
      .from(schema.workspaces)
      .where(and(
        eq(schema.workspaces.id, workspaceId),
        eq(schema.workspaces.tenantId, ctx.tenantId),
      ))
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const [tenantSummary] = await db
      .select({
        workspaceCount: sql<number>`count(${schema.workspaces.id})`.mapWith(Number),
      })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.tenantId, ctx.tenantId));

    if ((tenantSummary?.workspaceCount ?? 0) <= 1) {
      return NextResponse.json({ error: "A tenant must keep at least one workspace" }, { status: 409 });
    }

    const [deleteSummary] = await db
      .select({
        projectCount: sql<number>`count(distinct ${schema.projects.id})`.mapWith(Number),
        memberCount: sql<number>`count(distinct ${schema.memberships.userId})`.mapWith(Number),
      })
      .from(schema.workspaces)
      .leftJoin(schema.projects, eq(schema.projects.workspaceId, schema.workspaces.id))
      .leftJoin(schema.memberships, eq(schema.memberships.workspaceId, schema.workspaces.id))
      .where(and(
        eq(schema.workspaces.id, workspace.id),
        eq(schema.workspaces.tenantId, ctx.tenantId),
      ));

    await recordAuditEvent({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      userId: ctx.userId,
      action: "workspace.deleted",
      entityType: "workspace",
      entityId: workspace.id,
      metadataJson: {
        name: workspace.name,
        slug: workspace.slug,
        projectCount: deleteSummary?.projectCount ?? 0,
        memberCount: deleteSummary?.memberCount ?? 0,
      },
    });

    await db
      .delete(schema.workspaces)
      .where(and(
        eq(schema.workspaces.id, workspace.id),
        eq(schema.workspaces.tenantId, ctx.tenantId),
      ));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
