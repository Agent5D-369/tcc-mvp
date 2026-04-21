import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

async function ensureUserWorkspaceMembership(args: {
  userId: string;
}) {
  const [existingMembership] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(eq(schema.memberships.userId, args.userId))
    .limit(1);

  if (existingMembership) {
    return;
  }

  let [workspace] = await db
    .select({
      tenantId: schema.workspaces.tenantId,
      workspaceId: schema.workspaces.id,
    })
    .from(schema.workspaces)
    .orderBy(asc(schema.workspaces.createdAt))
    .limit(1);

  if (!workspace) {
    const [tenant] = await db.insert(schema.tenants).values({
      name: "QuickLaunch Demo",
      slug: "quicklaunch-demo",
      plan: "team",
      status: "active",
      settingsJson: {},
    }).returning({
      id: schema.tenants.id,
    });

    const [createdWorkspace] = await db.insert(schema.workspaces).values({
      tenantId: tenant.id,
      name: "Ops Command",
      slug: "ops-command",
      description: "Central workspace for project visibility, meeting follow-through, and decision tracking.",
      visibility: "private",
      createdBy: args.userId,
    }).returning({
      tenantId: schema.workspaces.tenantId,
      workspaceId: schema.workspaces.id,
    });

    workspace = createdWorkspace;
  }

  await db.insert(schema.memberships).values({
    tenantId: workspace.tenantId,
    workspaceId: workspace.workspaceId,
    userId: args.userId,
    role: "owner",
    isDefaultWorkspace: true,
  }).onConflictDoNothing();
}

async function resolveMembershipByEmail(email: string) {
  const [member] = await db
    .select({
      userId: schema.users.id,
      fullName: schema.users.fullName,
      tenantId: schema.memberships.tenantId,
      workspaceId: schema.memberships.workspaceId,
    })
    .from(schema.users)
    .innerJoin(schema.memberships, eq(schema.memberships.userId, schema.users.id))
    .where(eq(schema.users.email, email))
    .orderBy(desc(schema.memberships.isDefaultWorkspace), asc(schema.memberships.joinedAt));

  return member ?? null;
}

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
    Credentials({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const name =
          credentials?.name?.toString().trim() ||
          normalizeEnvValue(process.env.AUTH_DEMO_NAME) ||
          "QuickLaunch Demo User";

        if (!email) {
          return null;
        }

        return {
          id: email,
          email,
          name,
        };
      },
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
