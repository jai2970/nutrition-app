import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { signOut } from "@/lib/auth";
import { isProfileComplete } from "@/lib/nutrition";
import ProfileForm from "./ProfileForm";
import OnboardingWizard from "./OnboardingWizard";

// See dashboard/page.tsx for why this is needed — no dynamic API usage here
// means Next would otherwise statically prerender the page at build time.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  // proxy.ts already redirects signed-out visitors before they reach this
  // page — this is a defense-in-depth check for the Server Component itself.
  if (!user) {
    redirect("/login");
  }

  // First-time users get the step-by-step wizard; a returning user editing
  // an already-complete profile gets the plain single-page form.
  if (!isProfileComplete(user)) {
    return <OnboardingWizard />;
  }

  return (
    <div className="w-full max-w-xl mx-auto px-6 py-12">
      <h1 className="font-heading text-2xl font-semibold mb-1">Your profile</h1>
      <p className="text-sm text-muted mb-8">
        This information is used to calculate your calorie and macro targets.
      </p>

      <ProfileForm user={user} />

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-8 pt-6 border-t border-border"
      >
        <button type="submit" className="text-sm text-muted hover:text-foreground transition-colors">
          Sign out
        </button>
      </form>
    </div>
  );
}
