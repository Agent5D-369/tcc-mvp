import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";
import { resolveMembershipByEmail } from "@workspace-kit/auth/membership";
import { clearDemoSessionCookie, createDemoSessionToken, setDemoSessionCookie } from "@workspace-kit/auth/demoSession";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { recordAuditEvent } from "@workspace-kit/tenancy/audit";

const demoSessionSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: NextRequest) {
  try {
    console.log("[demo-session] request received");
    const body = demoSessionSchema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    if (email !== "demo@example.com") {
      return NextResponse.json({ error: "Demo access is limited to demo@example.com" }, { status: 403 });
    }

    const name = "QuickLaunch Demo User";

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

    const [demoWorkspace] = await db
      .select({
        tenantId: schema.tenants.id,
        workspaceId: schema.workspaces.id,
      })
      .from(schema.workspaces)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.workspaces.tenantId))
      .where(and(
        eq(schema.tenants.slug, "quicklaunch-demo"),
        eq(schema.workspaces.slug, "demo-command"),
      ))
      .limit(1);

    if (!demoWorkspace) {
      return NextResponse.json({ error: "Demo workspace is not seeded" }, { status: 500 });
    }

    await db
      .insert(schema.memberships)
      .values({
        tenantId: demoWorkspace.tenantId,
        workspaceId: demoWorkspace.workspaceId,
        userId: user.id,
        role: "manager",
        isDefaultWorkspace: true,
      })
      .onConflictDoUpdate({
        target: [schema.memberships.tenantId, schema.memberships.workspaceId, schema.memberships.userId],
        set: {
          role: "manager",
          isDefaultWorkspace: true,
        },
      });
    console.log("[demo-session] demo membership ensured", { userId: user.id });

    const membership = await resolveMembershipByEmail(email);
    if (!membership?.workspaceId || membership.workspaceId !== demoWorkspace.workspaceId) {
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
    await recordAuditEvent({
      tenantId: membership.tenantId,
      workspaceId: membership.workspaceId,
      userId: user.id,
      action: "demo.signed_in",
      entityType: "user",
      entityId: user.id,
    });
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
