"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveProposal, rejectProposal } from "@workspace-kit/approvals";
import { getSession, resolveMembershipByWorkspace } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";
import { assertCanEditWorkspace } from "@workspace-kit/tenancy/permissions";

async function requireWritableActiveRoute(route: { tenantSlug: string; workspaceSlug: string }) {
  const session = await getSession();

  if (!session?.activeTenantId || !session.activeWorkspaceId || !session.user.id) {
    redirect("/signin");
  }

  const activeRoute = await getActiveWorkspaceRoute({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  if (!activeRoute || activeRoute.tenantSlug !== route.tenantSlug || activeRoute.workspaceSlug !== route.workspaceSlug) {
    redirect(activeRoute ? `/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/approvals` : "/onboarding");
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

export async function approveProposalAction(
  route: { tenantSlug: string; workspaceSlug: string },
  formData: FormData,
) {
  const session = await requireWritableActiveRoute(route);

  const proposalId = formData.get("proposalId")?.toString().trim();
  if (!proposalId) {
    redirect(`/${route.tenantSlug}/${route.workspaceSlug}/approvals`);
  }

  await approveProposal({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    userId: session.userId,
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
  const session = await requireWritableActiveRoute(route);

  const proposalId = formData.get("proposalId")?.toString().trim();
  if (!proposalId) {
    redirect(`/${route.tenantSlug}/${route.workspaceSlug}/approvals`);
  }

  await rejectProposal({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    userId: session.userId,
    proposalId,
  });

  revalidatePath(`/${route.tenantSlug}/${route.workspaceSlug}`);
  revalidatePath(`/${route.tenantSlug}/${route.workspaceSlug}/approvals`);
  redirect(`/${route.tenantSlug}/${route.workspaceSlug}/approvals?rejected=1`);
}
