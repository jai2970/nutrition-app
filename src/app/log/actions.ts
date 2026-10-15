"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { Meal } from "@/generated/prisma/enums";

export type LogFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addFoodEntry(
  _prevState: LogFormState,
  formData: FormData,
): Promise<LogFormState> {
  const foodItemId = String(formData.get("foodItemId") ?? "");
  const grams = Number(formData.get("grams"));
  const meal = String(formData.get("meal"));

  if (!foodItemId) {
    return { status: "error", message: "Pick a food from the search results first." };
  }
  if (!Number.isFinite(grams) || grams <= 0) {
    return { status: "error", message: "Enter a quantity greater than 0." };
  }
  if (!Object.values(Meal).includes(meal as Meal)) {
    return { status: "error", message: "Pick a meal." };
  }

  const foodItem = await prisma.foodItem.findUnique({ where: { id: foodItemId } });
  if (!foodItem) {
    return { status: "error", message: "That food no longer exists." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Your session expired. Please sign in again." };
  }

  await prisma.foodEntry.create({
    data: {
      userId: user.id,
      foodItemId,
      grams,
      meal: meal as Meal,
    },
  });

  revalidatePath("/dashboard");

  return { status: "success", message: `Added ${foodItem.name} to your log.` };
}

export type DeleteEntryResult = { status: "success" | "error"; message: string };

export async function deleteFoodEntry(formData: FormData): Promise<DeleteEntryResult> {
  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) {
    return { status: "error", message: "Couldn't tell which entry to remove." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Your session expired. Please sign in again." };
  }

  // Scoping the delete to the current user's own entries means a forged
  // entryId for someone else's entry just deletes nothing, rather than
  // requiring a separate ownership check before deleting.
  const { count } = await prisma.foodEntry.deleteMany({ where: { id: entryId, userId: user.id } });

  revalidatePath("/dashboard");

  if (count === 0) {
    return { status: "error", message: "That entry was already removed." };
  }
  return { status: "success", message: "Removed from your log." };
}
