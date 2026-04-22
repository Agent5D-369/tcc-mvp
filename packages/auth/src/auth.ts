import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db, schema } from "@workspace-kit/db";
import { ensureUserWorkspaceMembership, resolveMembershipByEmail } from "./membership";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const [upserted] = await db
        .insert(schema.users)
        .values({
          email,
          fullName: user.name ?? null,
          avatarUrl: user.image ?? null,
        })
        .onConflictDoUpdate({
          target: schema.users.email,
          set: {
            fullName: user.name ?? null,
            avatarUrl: user.image ?? null,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          fullName: schema.users.fullName,
        });

      if (!upserted) return false;

      await ensureUserWorkspaceMembership({
        userId: upserted.id,
      });

      return true;
    },
    async jwt({ token, user }) {
      const email = (user?.email || token.email || "").toString().toLowerCase();
      if (!email) return token;

      const membership = await resolveMembershipByEmail(email);
      if (membership) {
        token.userId = membership.userId;
        token.fullName = membership.fullName;
        token.activeTenantId = membership.tenantId;
        token.activeWorkspaceId = membership.workspaceId;
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = {
          id: "",
          name: null,
          email: token.email ?? "",
          image: null,
        } as typeof session.user;
      }

      session.user.id = (token.userId as string | undefined) ?? "";
      session.user.name = (token.fullName as string | undefined) ?? session.user.name ?? null;
      session.activeTenantId = (token.activeTenantId as string | undefined) ?? null;
      session.activeWorkspaceId = (token.activeWorkspaceId as string | undefined) ?? null;

      return session;
    },
  },
});
