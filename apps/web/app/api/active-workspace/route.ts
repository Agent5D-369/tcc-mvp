import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, resolveMembershipByWorkspace, setActiveWorkspacePreference } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";

const activeWorkspaceSchema = z.object({
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = activeWorkspaceSchema.parse(await req.json());
    const membership = await resolveMembershipByWorkspace({
      userId: session.user.id,
      tenantId: body.tenantId,
      workspaceId: body.workspaceId,
    });

    if (!membership) {
      return NextResponse.json({ error: "You do not have access to that workspace" }, { status: 403 });
    }

    await setActiveWorkspacePreference({
      tenantId: body.tenantId,
      workspaceId: body.workspaceId,
    });

    const route = await getActiveWorkspaceRoute({
      tenantId: body.tenantId,
      workspaceId: body.workspaceId,
    });

    return NextResponse.json({
      ok: true,
      url: route ? `/${route.tenantSlug}/${route.workspaceSlug}` : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
