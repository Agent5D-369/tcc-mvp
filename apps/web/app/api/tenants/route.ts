import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTenantWorkspaceForUser, getSession, setActiveWorkspacePreference } from "@workspace-kit/auth";

const createTenantSchema = z.object({
  tenantName: z.string().trim().min(2).max(120),
  workspaceName: z.string().trim().min(2).max(120),
  workspaceDescription: z.string().trim().max(280).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email?.toLowerCase() === "demo@example.com") {
      return NextResponse.json({ error: "Demo access cannot create organizations" }, { status: 403 });
    }

    const body = createTenantSchema.parse(await req.json());
    const created = await createTenantWorkspaceForUser({
      userId: session.user.id,
      tenantName: body.tenantName,
      workspaceName: body.workspaceName,
      workspaceDescription: body.workspaceDescription,
      allowAdditionalTenant: session.isPlatformAdmin,
    });

    await setActiveWorkspacePreference({
      tenantId: created.tenantId,
      workspaceId: created.workspaceId,
    });

    return NextResponse.json({
      tenant: {
        id: created.tenantId,
        slug: created.tenantSlug,
        name: created.tenantName,
      },
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
