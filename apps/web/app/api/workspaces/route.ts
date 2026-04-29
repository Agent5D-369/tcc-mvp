import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createWorkspaceForTenant,
  resolveMembershipByWorkspace,
  setActiveWorkspacePreference,
} from "@workspace-kit/auth";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertNotDemoUser } from "@workspace-kit/tenancy/permissions";

const createWorkspaceSchema = z.object({
  workspaceName: z.string().trim().min(2).max(120),
  workspaceDescription: z.string().trim().max(280).optional(),
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

    if (!ctx.isPlatformAdmin && (!actorMembership || !["owner", "admin"].includes(actorMembership.role))) {
      return NextResponse.json({ error: "Only owners or admins can create workspaces" }, { status: 403 });
    }

    const body = createWorkspaceSchema.parse(await req.json());
    const created = await createWorkspaceForTenant({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      workspaceName: body.workspaceName,
      workspaceDescription: body.workspaceDescription,
      creatorRole: ctx.isPlatformAdmin ? "owner" : actorMembership?.role ?? "admin",
    });

    await setActiveWorkspacePreference({
      tenantId: created.tenantId,
      workspaceId: created.workspaceId,
    });

    return NextResponse.json({
      workspace: {
        id: created.workspaceId,
        slug: created.workspaceSlug,
        name: created.workspaceName,
      },
      url: `/${created.tenantSlug}/${created.workspaceSlug}`,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
