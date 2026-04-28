import { cookies } from "next/headers";

const ACTIVE_WORKSPACE_COOKIE = "ql_active_workspace";

export type ActiveWorkspacePreference = {
  tenantId: string;
  workspaceId: string;
};

export async function readActiveWorkspacePreference(): Promise<ActiveWorkspacePreference | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  const [tenantId, workspaceId] = raw.split(":");
  if (!tenantId || !workspaceId) {
    return null;
  }

  return { tenantId, workspaceId };
}

export async function setActiveWorkspacePreference(preference: ActiveWorkspacePreference) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, `${preference.tenantId}:${preference.workspaceId}`, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearActiveWorkspacePreference() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
}
