"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveProposal, rejectProposal } from "@workspace-kit/approvals";
import { getSession } from "@workspace-kit/auth";

export async function approveProposalAction(
  route: { tenantSlug: string; workspaceSlug: string },
  formData: FormData,
) {
  const session = await getSession();

  if (!session?.activeTenantId || !session.activeWorkspaceId || !session.user.id) {
    redirect("/signin");
  }

  const proposalId = formData.get("proposalId")?.toString().trim();
  if (!proposalId) {
    redirect(`/${route.tenantSlug}/${route.workspaceSlug}/approvals`);
  }

  await approveProposal({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
    userId: session.user.id,
    proposalId,
    edits: {
      title: formData.get("title")?.toString().trim() || undefined,
      bodyMarkdown: formData.get("bodyMarkdown")?.toString().trim() || null,
      sourceExcerpt: formData.get("sourceExcerpt")?.toString().trim() || null,
    },
  });

  revalidatePath(`/${route.tenantSlug}/${route.workspaceSlug}`);
  revalidatePath(`/${route.tenantSlug}/${route.workspaceSlug}/approvals`);
  redirect(`/${route.tenantSlug}/${route.workspaceSlug}/approvals?approved=1`);
}

export async function rejectProposalAction(
  route: { tenantSlug: string; workspaceSlug: string },
  formData: FormData,
) {
  const session = await getSession();

  if (!session?.activeTenantId || !session.activeWorkspaceId || !session.user.id) {
    redirect("/signin");
  }

  const proposalId = formData.get("proposalId")?.toString().trim();
  if (!proposalId) {
    redirect(`/${route.tenantSlug}/${route.workspaceSlug}/approvals`);
  }

  await rejectProposal({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
    userId: session.user.id,
    proposalId,
  });

  revalidatePath(`/${route.tenantSlug}/${route.workspaceSlug}`);
  revalidatePath(`/${route.tenantSlug}/${route.workspaceSlug}/approvals`);
  redirect(`/${route.tenantSlug}/${route.workspaceSlug}/approvals?rejected=1`);
}
