"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  parseMealDescription,
  parseMealImage,
  type ParsedMealItem,
  type EstimatedMacros,
} from "@/lib/gemini";
import { findBestFoodMatch, matchFood } from "@/lib/food-match";
import { searchFoods } from "@/lib/food-search";
import { Meal } from "@/generated/prisma/enums";

export type MatchedItem = {
  parsedName: string;
  grams: number;
  confidence: "high" | "medium" | "low";
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
  confidence: "high" | "medium" | "low";
  meal: Meal | null;
  estimatedMacros: EstimatedMacros;
};

export type ParseMealResult =
  | { status: "success"; matched: MatchedItem[]; unmatched: UnmatchedItem[] }
  | { status: "error"; message: string };

type FoodRow = Awaited<ReturnType<typeof prisma.foodItem.findMany>>[number];

// New matcher: hybrid semantic/text search, then Gemini picks the best
// candidate. Any failure (embedding, DB, Gemini) just means "no new match" so
// the old matcher below still gets its say.
async function semanticMatch(name: string): Promise<FoodRow | null> {
  try {
    const candidates = await searchFoods(name);
    return await matchFood(name, candidates);
  } catch (err) {
    console.warn("[food-match] semantic match failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function matchParsedItems(
  parsedItems: ParsedMealItem[],
): Promise<{ matched: MatchedItem[]; unmatched: UnmatchedItem[] }> {
  const foods = await prisma.foodItem.findMany();

  // Both matchers run for every item; the semantic one wins when it finds
  // something, otherwise the old word-overlap/alias one is the fallback.
  // Each decision is logged so we can compare them over real meals before
  // retiring the old matcher.
  const semanticMatches = await Promise.all(parsedItems.map((item) => semanticMatch(item.name)));

  const matched: MatchedItem[] = [];
  const unmatched: UnmatchedItem[] = [];

  parsedItems.forEach((item, i) => {
    const newMatch = semanticMatches[i];
    const oldMatch = findBestFoodMatch(item.name, foods);
    const food = newMatch ?? oldMatch;
    const winner = newMatch ? "new" : oldMatch ? "old" : "none";
    console.log(
      `[food-match] item="${item.name}" new="${newMatch?.name ?? "-"}" old="${oldMatch?.name ?? "-"}" agree=${
        !!newMatch && newMatch.id === oldMatch?.id
      } used=${winner}`,
    );

    if (food) {
      matched.push({
        parsedName: item.name,
        grams: item.grams,
        confidence: item.confidence,
        meal: item.meal,
        food: {
          id: food.id,
          name: food.name,
          servingLabel: food.servingLabel,
          caloriesPer100g: food.caloriesPer100g,
        },
      });
    } else {
      unmatched.push({
        parsedName: item.name,
        grams: item.grams,
        confidence: item.confidence,
        meal: item.meal,
        estimatedMacros: item.estimatedMacros,
      });
    }
  });

  return { matched, unmatched };
}

function geminiErrorMessage(err: unknown): string {
  return err instanceof Error && err.message === "GEMINI_API_KEY is not set."
    ? "AI meal reading isn't available right now."
    : "The AI helper is unavailable right now. Please try again in a moment.";
}

export async function parseMealText(description: string): Promise<ParseMealResult> {
  if (!(await getCurrentUser())) {
    return { status: "error", message: "Please sign in to log a meal." };
  }

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
      message: "We couldn't spot any food in that. Try listing the items, like “2 rotis, dal and curd”.",
    };
  }

  const { matched, unmatched } = await matchParsedItems(parsedItems);
  return { status: "success", matched, unmatched };
}

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function parseMealPhoto(formData: FormData): Promise<ParseMealResult> {
  if (!(await getCurrentUser())) {
    return { status: "error", message: "Please sign in to log a meal." };
  }

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
      message: "We couldn't spot any food in that photo. Try a clearer, well-lit shot from above, or describe the meal instead.",
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
  if (!user) {
    return { status: "error", message: "Please sign in to log a meal." };
  }

  await prisma.foodEntry.createMany({
    data: entries.map((entry) => ({
      userId: user.id,
      foodItemId: entry.foodItemId,
      grams: entry.grams,
      meal: entry.meal,
    })),
  });

  revalidatePath("/dashboard");

  return { status: "success", count: entries.length };
}

export type LogCustomResult = { status: "success" } | { status: "error"; message: string };

// For a food Gemini identified but that has no database match — logs the
// AI's estimated macros directly on the entry rather than requiring a
// FoodItem row.
export async function logCustomEntry(entry: {
  name: string;
  grams: number;
  meal: Meal;
  macros: EstimatedMacros;
}): Promise<LogCustomResult> {
  const name = entry.name.trim();
  if (!name) {
    return { status: "error", message: "Missing food name." };
  }
  if (!Number.isFinite(entry.grams) || entry.grams <= 0) {
    return { status: "error", message: "Quantity must be greater than 0." };
  }
  if (!Object.values(Meal).includes(entry.meal)) {
    return { status: "error", message: "Pick a meal." };
  }
  const { calories, protein, carbs, fat } = entry.macros;
  if (
    ![calories, protein, carbs, fat].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
  ) {
    return { status: "error", message: "Invalid estimated macros." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Please sign in to log a meal." };
  }

  await prisma.foodEntry.create({
    data: {
      userId: user.id,
      foodItemId: null,
      grams: entry.grams,
      meal: entry.meal,
      customFoodName: name,
      customCalories: calories,
      customProtein: protein,
      customCarbs: carbs,
      customFat: fat,
    },
  });

  revalidatePath("/dashboard");

  return { status: "success" };
}
