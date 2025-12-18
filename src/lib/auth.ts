import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username?: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      
      // Validate user still exists in DB (handles cleared DB scenario)
      if (token.id && token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, username: true },
          });
          
          // If user was deleted from DB, mark token as invalid
          if (!dbUser) {
            console.log("[AUTH] User not found in DB, invalidating session");
            token.invalidated = true;
            token.id = undefined;
          } else {
            token.username = dbUser.username;
          }
        } catch (error) {
          // User might not exist yet during OAuth flow
          console.log("Could not fetch user:", error);
        }
      }

      // Handle session update
      if (trigger === "update" && session) {
        token.name = session.name;
        token.username = session.username;
      }

      return token;
    },
    async session({ session, token }) {
      // If token was invalidated (user deleted), return session without user
      if (token.invalidated || !token.id) {
        session.user = undefined as unknown as typeof session.user;
        return session;
      }
      
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string | null;
      }
      return session;
    },
    async signIn() {
      // Allow all sign-ins - profile stats are created in the createUser event
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Create profile stats for new users
      try {
        const existingStats = await prisma.profileStats.findUnique({
          where: { userId: user.id! },
        });
        if (!existingStats) {
          await prisma.profileStats.create({
            data: { userId: user.id! },
          });
        }
      } catch (error) {
        console.error("Failed to create profile stats:", error);
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
});
