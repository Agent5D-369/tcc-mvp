import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveMembershipByWorkspace,
  updateWorkspaceDetails,
} from "@workspace-kit/auth";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertNotDemoUser } from "@workspace-kit/tenancy/permissions";

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

    if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
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
