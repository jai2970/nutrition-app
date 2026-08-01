"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { parseMealDescription } from "@/lib/gemini";
import { findBestFoodMatch } from "@/lib/food-match";
import { Meal } from "@/generated/prisma/enums";

export type MatchedItem = {
  parsedName: string;
  grams: number;
  meal: Meal | null;
  food: {
    id: string;
    name: string;
    servingLabel: string;
    caloriesPer100g: number;
  };
};

export type UnmatchedItem = {
  parsedName: string;
  grams: number;
  meal: Meal | null;
};

export type ParseMealResult =
  | { status: "success"; matched: MatchedItem[]; unmatched: UnmatchedItem[] }
  | { status: "error"; message: string };

export async function parseMealText(description: string): Promise<ParseMealResult> {
  const trimmed = description.trim();
  if (!trimmed) {
    return { status: "error", message: "Describe what you ate first." };
  }

  let parsedItems;
  try {
    parsedItems = await parseMealDescription(trimmed);
  } catch (err) {
    console.error("Gemini meal parse failed:", err);
    const message =
      err instanceof Error && err.message === "GEMINI_API_KEY is not set."
        ? "AI parsing isn't configured (missing GEMINI_API_KEY)."
        : "Couldn't reach Gemini right now. Please try again.";
    return { status: "error", message };
  }

  if (parsedItems.length === 0) {
    return {
      status: "error",
      message: "Couldn't identify any food items in that description.",
    };
  }

  const foods = await prisma.foodItem.findMany();

  const matched: MatchedItem[] = [];
  const unmatched: UnmatchedItem[] = [];

  for (const item of parsedItems) {
    const food = findBestFoodMatch(item.name, foods);
    if (food) {
      matched.push({
        parsedName: item.name,
        grams: item.grams,
        meal: item.meal,
        food: {
          id: food.id,
          name: food.name,
          servingLabel: food.servingLabel,
          caloriesPer100g: food.caloriesPer100g,
        },
      });
    } else {
      unmatched.push({ parsedName: item.name, grams: item.grams, meal: item.meal });
    }
  }

  return { status: "success", matched, unmatched };
}

export type LogParsedResult =
  | { status: "success"; count: number }
  | { status: "error"; message: string };

export async function logParsedItems(
  entries: { foodItemId: string; grams: number; meal: Meal }[],
): Promise<LogParsedResult> {
  if (entries.length === 0) {
    return { status: "error", message: "No items to add." };
  }
  for (const entry of entries) {
    if (!Number.isFinite(entry.grams) || entry.grams <= 0) {
      return { status: "error", message: "All quantities must be greater than 0." };
    }
    if (!Object.values(Meal).includes(entry.meal)) {
      return { status: "error", message: "Pick a meal for every item." };
    }
  }

  const foodItemIds = entries.map((e) => e.foodItemId);
  const existingCount = await prisma.foodItem.count({
    where: { id: { in: foodItemIds } },
  });
  if (existingCount !== new Set(foodItemIds).size) {
    return { status: "error", message: "One or more foods no longer exist." };
  }

  const user = await getCurrentUser();

  await prisma.foodEntry.createMany({
    data: entries.map((entry) => ({
      userId: user.id,
      foodItemId: entry.foodItemId,
      grams: entry.grams,
      meal: entry.meal,
    })),
  });

  revalidatePath("/log");
  revalidatePath("/dashboard");

  return { status: "success", count: entries.length };
}
