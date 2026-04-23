export type AppSession = {
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    image?: string | null;
  };
  activeTenantId: string | null;
  activeWorkspaceId: string | null;
  isPlatformAdmin: boolean;
};
