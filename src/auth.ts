import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { googleUserSeed } from "@/lib/google-profile";

function roleFromDatabaseUser(user: object): Role {
  if ("role" in user && typeof user.role === "string") {
    return user.role as Role;
  }
  return "VISITOR";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Google({
      profile(profile) {
        return googleUserSeed(profile);
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user = {
        ...session.user,
        id: user.id,
        role: roleFromDatabaseUser(user),
      };
      return session;
    },
  },
});
