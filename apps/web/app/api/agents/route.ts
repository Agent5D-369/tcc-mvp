import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listAgentDefinitions, upsertAgentDefinition } from "@workspace-kit/ai-core";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";
import { assertCanAdminWorkspace, assertNotDemoUser } from "@workspace-kit/tenancy/permissions";

const surfaceSchema = z.enum(["capture", "thread", "project", "task", "memory", "meeting"]);

const agentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(80),
  description: z.string().trim().max(280).optional(),
  systemPrompt: z.string().trim().min(20).max(8000),
  surfaces: z.array(surfaceSchema).min(1),
  scope: z.enum(["workspace", "tenant"]).default("workspace"),
  isActive: z.boolean().optional(),
});

async function requireAgentAdmin() {
  const ctx = await resolveTenantContext();
  assertNotDemoUser(ctx);
  assertCanAdminWorkspace(ctx);

  return ctx;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext();
    const surface = req.nextUrl.searchParams.get("surface");
    const parsedSurface = surfaceSchema.safeParse(surface);
    const agents = await listAgentDefinitions({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      surface: parsedSurface.success ? parsedSurface.data : undefined,
    });

    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAgentAdmin();
    const body = agentSchema.parse(await req.json());
    const agent = await upsertAgentDefinition({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      input: {
        name: body.name,
        role: body.role,
        description: body.description,
        systemPrompt: body.systemPrompt,
        surfaces: body.surfaces,
        workspaceId: body.scope === "tenant" ? null : ctx.workspaceId,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
