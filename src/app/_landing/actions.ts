"use server";

import { startGoogleSignIn } from "@/lib/start-sign-in";

export async function signInWithGoogle() {
  await startGoogleSignIn();
}
