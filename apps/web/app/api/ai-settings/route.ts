import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantAiSettings, updateTenantAiSettings } from "@workspace-kit/ai-core";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanAdminWorkspace, assertNotDemoUser } from "@workspace-kit/tenancy/permissions";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";

const aiSettingsSchema = z.object({
  mode: z.enum(["managed", "byo_key", "disabled"]),
  defaultModel: z.string().trim().min(3).max(160),
  monthlyBudgetCents: z.number().int().min(0).max(100_000),
  maxOutputTokens: z.number().int().min(256).max(4000),
  openRouterApiKey: z.string().trim().max(400).optional(),
});

async function requireAiAdmin() {
  const ctx = await resolveTenantContext();
  assertNotDemoUser(ctx);
  assertCanAdminWorkspace(ctx);

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

    await recordAuditEvent({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "ai_settings.updated",
      entityType: "tenant",
      entityId: ctx.tenantId,
      metadataJson: {
        mode: body.mode,
        defaultModel: body.defaultModel,
        monthlyBudgetCents: body.monthlyBudgetCents,
        maxOutputTokens: body.maxOutputTokens,
        providerKeyChanged: Boolean(body.openRouterApiKey),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
