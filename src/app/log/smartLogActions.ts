"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  parseMealDescription,
  parseMealImage,
  type ParsedMealItem,
} from "@/lib/gemini";
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

async function matchParsedItems(
  parsedItems: ParsedMealItem[],
): Promise<{ matched: MatchedItem[]; unmatched: UnmatchedItem[] }> {
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

  return { matched, unmatched };
}

function geminiErrorMessage(err: unknown): string {
  return err instanceof Error && err.message === "GEMINI_API_KEY is not set."
    ? "AI parsing isn't configured (missing GEMINI_API_KEY)."
    : "Couldn't reach Gemini right now. Please try again.";
}

export async function parseMealText(description: string): Promise<ParseMealResult> {
  const trimmed = description.trim();
  if (!trimmed) {
    return { status: "error", message: "Describe what you ate first." };
  }

  let parsedItems;
  try {
    parsedItems = await parseMealDescription(trimmed);
  } catch (err) {
    console.error("Gemini meal text parse failed:", err);
    return { status: "error", message: geminiErrorMessage(err) };
  }

  if (parsedItems.length === 0) {
    return {
      status: "error",
      message: "Couldn't identify any food items in that description.",
    };
  }

  const { matched, unmatched } = await matchParsedItems(parsedItems);
  return { status: "success", matched, unmatched };
}

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function parseMealPhoto(formData: FormData): Promise<ParseMealResult> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo first." };
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return { status: "error", message: "Please upload a JPEG, PNG, WEBP, or HEIC photo." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { status: "error", message: "That photo is too large. Try a smaller image." };
  }

  // Read the raw bytes server-side rather than accepting a pre-encoded base64
  // string from the client — passing a multi-MB string as a plain Server
  // Action argument hits an internal Flight-protocol safety limit ("Maximum
  // array nesting exceeded") well before any of our own size checks do.
  // A File inside FormData is instead transferred as a binary attachment.
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  let parsedItems;
  try {
    parsedItems = await parseMealImage(base64Data, file.type);
  } catch (err) {
    console.error("Gemini meal photo parse failed:", err);
    return { status: "error", message: geminiErrorMessage(err) };
  }

  if (parsedItems.length === 0) {
    return {
      status: "error",
      message: "Couldn't identify any food items in that photo.",
    };
  }

  const { matched, unmatched } = await matchParsedItems(parsedItems);
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
