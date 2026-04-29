import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addWorkspaceMemberByEmail, resolveMembershipByWorkspace } from "@workspace-kit/auth";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertNotDemoUser } from "@workspace-kit/tenancy/permissions";

const membershipRoleSchema = z.enum(["owner", "admin", "manager", "member", "guest"]);

const createMembershipSchema = z.object({
  email: z.string().trim().email(),
  role: membershipRoleSchema,
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext();
    assertNotDemoUser(ctx);
    const actorMembership = await resolveMembershipByWorkspace({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });

    if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
      return NextResponse.json({ error: "Only owners or admins can manage members" }, { status: 403 });
    }

    const body = createMembershipSchema.parse(await req.json());

    if (actorMembership.role !== "owner" && body.role === "owner") {
      return NextResponse.json({ error: "Only an owner can add another owner" }, { status: 403 });
    }

    const membership = await addWorkspaceMemberByEmail({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      email: body.email,
      role: body.role,
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
