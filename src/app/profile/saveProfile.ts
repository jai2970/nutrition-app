import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { ActivityLevel, DietType, Goal, Sex } from "@/generated/prisma/enums";
import {
  calculateBMI,
  bmiCategory,
  calculateBMR,
  calculateTDEE,
  calculateCalorieGoal,
  calculateMacroTargets,
  isProfileComplete,
} from "@/lib/nutrition";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  isFirstCompletion?: boolean;
  bmi?: number;
  bmiCategory?: string;
  calorieGoal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

// Plain (non-"use server") shared core so it can be called both from the
// updateProfile Server Action (returning-user edit form) and from the
// /api/complete-onboarding route handler (onboarding wizard) — the latter
// needs a route handler rather than calling the action directly, since
// invoking a Server Action from a client component always refreshes the
// current route's server tree, which would blow away the wizard's own
// client-side result screen the moment the profile becomes complete.
export async function saveProfile(formData: FormData): Promise<ProfileFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const age = Number(formData.get("age"));
  const sex = String(formData.get("sex"));
  const heightCm = Number(formData.get("heightCm"));
  const weightKg = Number(formData.get("weightKg"));
  const activityLevel = String(formData.get("activityLevel"));
  const dietType = String(formData.get("dietType"));
  const goal = String(formData.get("goal"));

  if (
    !Number.isFinite(age) ||
    !Object.values(Sex).includes(sex as Sex) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    !Object.values(ActivityLevel).includes(activityLevel as ActivityLevel) ||
    !Object.values(DietType).includes(dietType as DietType) ||
    !Object.values(Goal).includes(goal as Goal)
  ) {
    return { status: "error", message: "Please fill in every field before saving." };
  }

  const user = await getCurrentUser();
  // Was this profile incomplete before this save? If so, this save is the
  // user's first-ever completion, and the onboarding results screen should
  // show — routine later edits to an already-complete profile shouldn't.
  const wasIncomplete = !isProfileComplete(user);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name || null,
      age,
      sex: sex as Sex,
      heightCm,
      weightKg,
      activityLevel: activityLevel as ActivityLevel,
      dietType: dietType as DietType,
      goal: goal as Goal,
    },
  });

  if (wasIncomplete && isProfileComplete(updated)) {
    const bmi = calculateBMI(updated.weightKg, updated.heightCm);
    const bmr = calculateBMR({
      weightKg: updated.weightKg,
      heightCm: updated.heightCm,
      age: updated.age,
      sex: updated.sex,
    });
    const tdee = calculateTDEE(bmr, updated.activityLevel);
    const calorieGoal = calculateCalorieGoal(tdee, updated.goal);
    const macroTargets = calculateMacroTargets(updated.weightKg, calorieGoal);

    return {
      status: "success",
      message: "Profile saved.",
      isFirstCompletion: true,
      bmi,
      bmiCategory: bmiCategory(bmi),
      calorieGoal,
      proteinG: macroTargets.proteinG,
      carbsG: macroTargets.carbsG,
      fatG: macroTargets.fatG,
    };
  }

  return { status: "success", message: "Profile saved." };
}
