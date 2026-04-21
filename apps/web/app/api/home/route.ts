import { NextResponse } from "next/server";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { getWorkspaceHome } from "@workspace-kit/home";

export async function GET() {
  try {
    const ctx = await resolveTenantContext();
    const payload = await getWorkspaceHome({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
