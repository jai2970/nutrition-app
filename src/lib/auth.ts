import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// --- Manual setup required ---
// Create a Google OAuth 2.0 Client ID at console.cloud.google.com
// (APIs & Services → Credentials → Create Credentials → OAuth client ID),
// with authorized redirect URIs:
//   http://localhost:3000/api/auth/callback/google
//   https://nutrition-app-delta-tawny.vercel.app/api/auth/callback/google
// Then add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local (and to
// the Vercel project's Environment Variables for production).

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // The pre-auth "Jai" user row was created with this email directly in
      // the database (no OAuth account attached). Google always verifies
      // email ownership, so it's safe here to let a first Google sign-in
      // with a matching email link to that existing row instead of erroring
      // out — this is what lets the original profile and meal history
      // survive the switch to real auth.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Database sessions don't expose the user's id on session.user by
    // default — every other query in this app scopes by user id, so it
    // needs to be carried through explicitly.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
