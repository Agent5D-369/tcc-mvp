import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantAiSettings, updateTenantAiSettings } from "@workspace-kit/ai-core";
import { resolveMembershipByWorkspace } from "@workspace-kit/auth";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const aiSettingsSchema = z.object({
  mode: z.enum(["managed", "byo_key", "disabled"]),
  defaultModel: z.string().trim().min(3).max(160),
  monthlyBudgetCents: z.number().int().min(0).max(100_000),
  maxOutputTokens: z.number().int().min(256).max(4000),
  openRouterApiKey: z.string().trim().max(400).optional(),
});

async function requireAiAdmin() {
  const ctx = await resolveTenantContext();
  const actorMembership = await resolveMembershipByWorkspace({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    workspaceId: ctx.workspaceId,
  });

  if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
    throw new Error("Only owners and admins can manage AI settings");
  }

  return ctx;
}

export async function GET() {
  try {
    const ctx = await requireAiAdmin();
    const settings = await getTenantAiSettings(ctx.tenantId);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAiAdmin();
    const body = aiSettingsSchema.parse(await req.json());
    const settings = await updateTenantAiSettings({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      mode: body.mode,
      defaultModel: body.defaultModel,
      monthlyBudgetCents: body.monthlyBudgetCents,
      maxOutputTokens: body.maxOutputTokens,
      openRouterApiKey: body.openRouterApiKey,
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
