import { getCurrentUser } from "@/lib/current-user";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <div className="w-full max-w-xl mx-auto px-6 py-12">
      <h1 className="font-heading text-2xl font-semibold mb-1">Your profile</h1>
      <p className="text-sm text-muted mb-8">
        This information is used to calculate your calorie and macro targets.
      </p>

      <ProfileForm user={user} />
    </div>
  );
}
