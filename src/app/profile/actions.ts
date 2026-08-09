"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveProfile, type ProfileFormState } from "./saveProfile";

// Used by ProfileForm (the returning-user edit form) via useActionState —
// a real <form> submission, so the "refresh current route after a Server
// Action" behavior this relies on is fine here: it's exactly what makes
// the redirect below take effect for a subsequent edit.
export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const result = await saveProfile(formData);

  if (result.status !== "success") {
    return result;
  }

  revalidatePath("/dashboard");

  if (result.isFirstCompletion) {
    // ProfileForm only ever renders for an already-complete profile, so in
    // practice this branch is unreachable from there — kept only so the
    // shared saveProfile() result type stays honest.
    revalidatePath("/profile");
    return result;
  }

  // A returning user editing an already-complete profile — no welcome
  // screen, just back to Today with a brief success indicator.
  revalidatePath("/profile");
  redirect("/dashboard?updated=1");
}
