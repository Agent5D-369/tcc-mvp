"use server";

import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import {
  type CaptureSourceKind,
  createInteractionCapture,
  extractInteractionProposals,
  getCaptureContext,
} from "@workspace-kit/capture";

const allowedSourceKinds = new Set([
  "meeting_transcript",
  "email_thread",
  "voice_note",
  "chat_summary",
  "founder_dump",
  "other",
]);

export async function createCaptureAction(
  route: { tenantSlug: string; workspaceSlug: string },
  formData: FormData,
) {
  const session = await getSession();

  if (!session?.activeTenantId || !session.user.id) {
    redirect("/signin");
  }

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
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  });

  const interaction = await createInteractionCapture({
    tenantId: session.activeTenantId,
    workspaceId: context.workspace.id,
    userId: session.user.id,
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
  const session = await getSession();

  if (!session?.activeTenantId || !session.user.id || !session.activeWorkspaceId) {
    redirect("/signin");
  }

  const interactionId = formData.get("interactionId")?.toString().trim();
  if (!interactionId) {
    redirect(`/${route.tenantSlug}/${route.workspaceSlug}/capture?error=missing`);
  }

  const proposals = await extractInteractionProposals({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
    userId: session.user.id,
    interactionId,
    agentId: formData.get("agentId")?.toString().trim() || null,
  });

  redirect(`/${route.tenantSlug}/${route.workspaceSlug}/capture?captured=${interactionId}&extracted=${proposals.length}`);
}
