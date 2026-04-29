"use server";

import { redirect } from "next/navigation";
import { getSession, resolveMembershipByWorkspace } from "@workspace-kit/auth";
import {
  type CaptureSourceKind,
  createInteractionCapture,
  extractInteractionProposals,
  getCaptureContext,
} from "@workspace-kit/capture";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

const allowedSourceKinds = new Set([
  "meeting_transcript",
  "email_thread",
  "voice_note",
  "chat_summary",
  "founder_dump",
  "other",
]);

async function requireWritableActiveRoute(route: { tenantSlug: string; workspaceSlug: string }) {
  const session = await getSession();

  if (!session?.activeTenantId || !session.user.id || !session.activeWorkspaceId) {
    redirect("/signin");
  }

  const activeRoute = await getActiveWorkspaceRoute({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  if (!activeRoute || activeRoute.tenantSlug !== route.tenantSlug || activeRoute.workspaceSlug !== route.workspaceSlug) {
    redirect(activeRoute ? `/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/capture` : "/onboarding");
  }

  const membership = await resolveMembershipByWorkspace({
    userId: session.user.id,
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  assertCanEditWorkspace({ role: membership?.role ?? "guest" });

  return {
    userId: session.user.id,
    tenantId: session.activeTenantId!,
    workspaceId: session.activeWorkspaceId!,
  };
}

export async function createCaptureAction(
  route: { tenantSlug: string; workspaceSlug: string },
  formData: FormData,
) {
  const session = await requireWritableActiveRoute(route);

  const title = formData.get("title")?.toString().trim();
  const sourceKindValue = formData.get("sourceKind")?.toString().trim();
  const projectId = formData.get("projectId")?.toString().trim();
  const queueId = formData.get("queueId")?.toString().trim();
  const participants = formData.get("participants")?.toString().trim();
  const occurredAtValue = formData.get("occurredAt")?.toString().trim();
  const rawContent = formData.get("rawContent")?.toString().trim();

  if (!title || !rawContent || !sourceKindValue || !allowedSourceKinds.has(sourceKindValue)) {
    redirect(`/${route.tenantSlug}/${route.workspaceSlug}/capture?error=missing`);
  }

  const context = await getCaptureContext({
    tenantId: session.tenantId,
    workspaceSlug: route.workspaceSlug,
  });

  const interaction = await createInteractionCapture({
    tenantId: session.tenantId,
    workspaceId: context.workspace.id,
    userId: session.userId,
    title,
    sourceKind: sourceKindValue as CaptureSourceKind,
    projectId: projectId || null,
    queueId: queueId || null,
    participants: participants || null,
    occurredAt: occurredAtValue ? new Date(occurredAtValue) : null,
    rawContent,
  });

  redirect(`/${route.tenantSlug}/${route.workspaceSlug}/capture?captured=${interaction.id}`);
}

export async function extractCaptureAction(
  route: { tenantSlug: string; workspaceSlug: string },
  formData: FormData,
) {
  const session = await requireWritableActiveRoute(route);

  const interactionId = formData.get("interactionId")?.toString().trim();
  if (!interactionId) {
    redirect(`/${route.tenantSlug}/${route.workspaceSlug}/capture?error=missing`);
  }

  const proposals = await extractInteractionProposals({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    userId: session.userId,
    interactionId,
    agentId: formData.get("agentId")?.toString().trim() || null,
  });

  redirect(`/${route.tenantSlug}/${route.workspaceSlug}/capture?captured=${interactionId}&extracted=${proposals.length}`);
}
