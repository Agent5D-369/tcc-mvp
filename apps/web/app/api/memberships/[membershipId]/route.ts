import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  countWorkspaceOwners,
  removeMembership,
  resolveMembershipByWorkspace,
  updateMembershipRole,
} from "@workspace-kit/auth";
import { db, schema } from "@workspace-kit/db";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertNotDemoUser } from "@workspace-kit/tenancy/permissions";

const membershipRoleSchema = z.enum(["owner", "admin", "manager", "member", "guest"]);

const updateMembershipSchema = z.object({
  role: membershipRoleSchema,
});

type RouteParams = {
  params: Promise<{ membershipId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    assertNotDemoUser(ctx);
    const { membershipId } = await params;
    const actorMembership = await resolveMembershipByWorkspace({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });

    if (!ctx.isPlatformAdmin && (!actorMembership || !["owner", "admin"].includes(actorMembership.role))) {
      return NextResponse.json({ error: "Only owners or admins can manage members" }, { status: 403 });
    }

    const body = updateMembershipSchema.parse(await req.json());
    const [targetMembership] = await db
      .select({
        id: schema.memberships.id,
        userId: schema.memberships.userId,
        role: schema.memberships.role,
      })
      .from(schema.memberships)
      .where(and(
        eq(schema.memberships.id, membershipId),
        eq(schema.memberships.tenantId, ctx.tenantId),
        eq(schema.memberships.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!targetMembership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    if (!ctx.isPlatformAdmin && actorMembership?.role !== "owner" && (targetMembership.role === "owner" || body.role === "owner")) {
      return NextResponse.json({ error: "Only an owner can change owner roles" }, { status: 403 });
    }

    if (targetMembership.userId === ctx.userId && targetMembership.role === "owner" && body.role !== "owner") {
      const ownerCount = await countWorkspaceOwners({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
      });

      if (ownerCount <= 1) {
        return NextResponse.json({ error: "This workspace must keep at least one owner" }, { status: 400 });
      }
    }

    const membership = await updateMembershipRole({
      membershipId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      role: body.role,
    });

    return NextResponse.json({ membership });
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
    assertNotDemoUser(ctx);
    const { membershipId } = await params;
    const actorMembership = await resolveMembershipByWorkspace({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });

    if (!ctx.isPlatformAdmin && (!actorMembership || !["owner", "admin"].includes(actorMembership.role))) {
      return NextResponse.json({ error: "Only owners or admins can manage members" }, { status: 403 });
    }

    const [targetMembership] = await db
      .select({
        id: schema.memberships.id,
        userId: schema.memberships.userId,
        role: schema.memberships.role,
      })
      .from(schema.memberships)
      .where(and(
        eq(schema.memberships.id, membershipId),
        eq(schema.memberships.tenantId, ctx.tenantId),
        eq(schema.memberships.workspaceId, ctx.workspaceId),
      ))
      .limit(1);

    if (!targetMembership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    if (targetMembership.userId === ctx.userId) {
      return NextResponse.json({ error: "Self-removal is not available from this screen yet" }, { status: 400 });
    }

    if (!ctx.isPlatformAdmin && actorMembership?.role !== "owner" && targetMembership.role === "owner") {
      return NextResponse.json({ error: "Only an owner can remove another owner" }, { status: 403 });
    }

    if (targetMembership.role === "owner") {
      const ownerCount = await countWorkspaceOwners({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
      });

      if (ownerCount <= 1) {
        return NextResponse.json({ error: "This workspace must keep at least one owner" }, { status: 400 });
      }
    }

    await removeMembership({
      membershipId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
