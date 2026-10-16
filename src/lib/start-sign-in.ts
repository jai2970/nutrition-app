import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

// Auth.js stores a short-lived PKCE cookie on whichever host the visitor
// clicked "Sign in" on, but Google always sends them back to the host in
// NEXTAUTH_URL / AUTH_URL. Starting on any other host (a deployment-specific
// *.vercel.app address, a preview link, an alias) loses the cookie and fails
// with "InvalidCheck: pkceCodeVerifier value could not be parsed". So if the
// visitor is on the wrong host, send them to the right one to start over.
export async function startGoogleSignIn() {
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configured) {
    try {
      const canonical = new URL(configured);
      const h = await headers();
      const current = h.get("x-forwarded-host") ?? h.get("host");
      if (current && current !== canonical.host) {
        redirect(`${canonical.origin}/login`);
      }
    } catch (err) {
      // redirect() throws a control-flow error that must propagate; a bad
      // env URL should not block sign-in.
      if (err instanceof Error && "digest" in err) throw err;
    }
  }
  await signIn("google", { redirectTo: "/dashboard" });
}
