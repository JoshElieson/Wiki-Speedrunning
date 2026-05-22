import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isPrismaConfigError } from "@/lib/database";
import { getUserByEmail, upsertOAuthUser } from "@/server/repositories/user-repository";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env("GOOGLE_CLIENT_ID"),
      clientSecret: env("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  secret: env("NEXTAUTH_SECRET"),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/profile",
    error: "/profile",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      try {
        const dbUser = await upsertOAuthUser({
          email: user.email,
          displayName: user.name,
          avatarUrl: user.image,
        });

        user.id = dbUser.id;
        user.username = dbUser.username;
        user.name = dbUser.displayName ?? dbUser.username;
        user.image = dbUser.avatarUrl ?? user.image;
        return true;
      } catch (error) {
        if (isPrismaConfigError(error)) {
          console.error("[auth] database unavailable during sign-in", error);
          return false;
        }
        throw error;
      }
    },
    async jwt({ token, user, account, trigger }) {
      const applyDbUser = async (email: string) => {
        try {
          const dbUser = await getUserByEmail(email);
          if (!dbUser) {
            return;
          }
          token.sub = dbUser.id;
          token.id = dbUser.id;
          token.username = dbUser.username;
          token.name = dbUser.displayName ?? dbUser.username;
          token.picture = dbUser.avatarUrl ?? token.picture;
        } catch (error) {
          if (isPrismaConfigError(error)) {
            console.error("[auth] database unavailable during jwt callback", error);
            return;
          }
          throw error;
        }
      };

      // On OAuth sign-in, load the DB user by email (custom user fields from signIn
      // are not always forwarded into this callback).
      if (account && token.email) {
        await applyDbUser(token.email);
      } else if (user?.email) {
        await applyDbUser(user.email);
      } else if (trigger === "update" && token.email) {
        await applyDbUser(token.email);
      } else if ((!token.id || !token.username) && token.email) {
        await applyDbUser(token.email);
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return `${baseUrl}/profile`;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.name = (token.name as string | undefined) ?? session.user.name;
        session.user.image = (token.picture as string | undefined) ?? session.user.image;
      }
      return session;
    },
  },
};
