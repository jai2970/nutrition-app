import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { saveProfile } from "@/app/profile/saveProfile";

// A plain Route Handler rather than a Server Action: OnboardingWizard calls
// this via fetch() so completing onboarding doesn't trigger Next.js's
// automatic "refresh the current route" behavior that comes with invoking
// a Server Action from a client component — that refresh would swap in a
// fresh server render of ProfileForm (the profile is complete now) before
// the wizard ever gets to show its own client-side result screen.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ status: "error", message: "Not signed in." }, { status: 401 });
  }

  const formData = await request.formData();
  const result = await saveProfile(formData, session.user.id);

  if (result.status === "success") {
    revalidatePath("/dashboard");
  }

  return Response.json(result);
}
