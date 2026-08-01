"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { ActivityLevel, DietType, Goal, Sex } from "@/generated/prisma/enums";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
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

  await prisma.user.update({
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

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { status: "success", message: "Profile saved." };
}
