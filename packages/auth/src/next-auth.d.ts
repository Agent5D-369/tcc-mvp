import "next-auth";

declare module "next-auth" {
  interface Session {
    activeTenantId?: string | null;
    activeWorkspaceId?: string | null;
    isPlatformAdmin?: boolean;
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    fullName?: string | null;
    activeTenantId?: string | null;
    activeWorkspaceId?: string | null;
    isPlatformAdmin?: boolean;
  }
}
