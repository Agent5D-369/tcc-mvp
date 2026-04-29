import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { upsertAgentDefinition } from "@workspace-kit/ai-core";
import { resolveMembershipByWorkspace } from "@workspace-kit/auth";
import { resolveTenantContext } from "@workspace-kit/tenancy/resolveTenantContext";

const agentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(80),
  description: z.string().trim().max(280).optional(),
  systemPrompt: z.string().trim().min(20).max(8000),
  surfaces: z.array(z.enum(["capture", "thread", "project", "task", "memory", "meeting"])).min(1),
  isActive: z.boolean().optional(),
});

type RouteParams = {
  params: Promise<{ agentId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveTenantContext();
    const actorMembership = await resolveMembershipByWorkspace({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });

    if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
      return NextResponse.json({ error: "Only owners and admins can manage agents" }, { status: 403 });
    }

    const { agentId } = await params;
    const body = agentSchema.parse(await req.json());
    const agent = await upsertAgentDefinition({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      agentId,
      input: {
        name: body.name,
        role: body.role,
        description: body.description,
        systemPrompt: body.systemPrompt,
        surfaces: body.surfaces,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
