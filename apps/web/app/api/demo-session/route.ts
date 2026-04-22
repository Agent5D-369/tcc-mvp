import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@workspace-kit/db";
import { ensureUserWorkspaceMembership, resolveMembershipByEmail } from "@workspace-kit/auth/membership";
import { clearDemoSessionCookie, createDemoSessionToken, setDemoSessionCookie } from "@workspace-kit/auth/demoSession";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";

const demoSessionSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Demo mode is disabled" }, { status: 403 });
  }

  try {
    console.log("[demo-session] request received");
    const body = demoSessionSchema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const name = body.name.trim();

    const [user] = await db
      .insert(schema.users)
      .values({
        email,
        fullName: name,
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          fullName: name,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
      });

    console.log("[demo-session] user upserted", { userId: user?.id, email });

    await ensureUserWorkspaceMembership({ userId: user.id });
    console.log("[demo-session] membership ensured", { userId: user.id });

    const membership = await resolveMembershipByEmail(email);
    if (!membership?.workspaceId) {
      console.error("[demo-session] membership lookup returned no workspace", { email });
      return NextResponse.json({ error: "No workspace membership available" }, { status: 500 });
    }

    const route = await getActiveWorkspaceRoute({
      tenantId: membership.tenantId,
      workspaceId: membership.workspaceId,
    });

    if (!route) {
      console.error("[demo-session] active workspace route lookup failed", {
        email,
        tenantId: membership.tenantId,
        workspaceId: membership.workspaceId,
      });
      return NextResponse.json({ error: "Workspace route could not be resolved" }, { status: 500 });
    }

    const token = await createDemoSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      tenantId: membership.tenantId,
      workspaceId: membership.workspaceId,
    });

    await setDemoSessionCookie(token);
    console.log("[demo-session] cookie written", { userId: user.id, workspaceId: membership.workspaceId });

    return NextResponse.json({ ok: true, url: `/${route.tenantSlug}/${route.workspaceSlug}` });
  } catch (error) {
    console.error("[demo-session] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

export async function DELETE() {
  await clearDemoSessionCookie();
  return NextResponse.json({ ok: true });
}
