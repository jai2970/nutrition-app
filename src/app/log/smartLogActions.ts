"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentUserId } from "@/lib/current-user";
import { startTimer } from "@/lib/timing";
import {
  parseMealDescription,
  parseMealImage,
  type ParsedMealItem,
  type EstimatedMacros,
} from "@/lib/gemini";
import { findBestFoodMatch, matchFood, pickFood } from "@/lib/food-match";
import { searchFoods } from "@/lib/food-search";
import { GeminiBusyError, GEMINI_BUSY_MESSAGE, GEMINI_TOTAL_CEILING_MS } from "@/lib/genai-client";
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

// Only the columns matching needs — the full table now carries long IFCT
// regional-name strings for ~620 foods, which is wasted transfer here.
const MATCHABLE_FOOD_SELECT = {
  id: true,
  name: true,
  aliases: true,
  servingLabel: true,
  caloriesPer100g: true,
  foodGroup: true,
  ifctCode: true,
} as const;

type FoodRow = Awaited<ReturnType<typeof loadMatchableFoods>>[number];

function loadMatchableFoods() {
  return prisma.foodItem.findMany({ select: MATCHABLE_FOOD_SELECT });
}

// New matcher: hybrid semantic/text search, then Gemini picks the best
// candidate. Any failure (embedding, DB, Gemini) just means "no new match" so
// the old matcher below still gets its say.
async function semanticMatch(name: string, deadlineAt: number): Promise<FoodRow | null> {
  const remaining = deadlineAt - Date.now();
  if (remaining < 1500) return null; // parsing used up the budget; old matcher only
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // The whole parse + match round trip shares one deadline so the button
    // never spins past it, even if the embedding request itself hangs.
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), remaining);
    });
    const search = (async () => matchFood(name, await searchFoods(name), { deadlineAt }))();
    search.catch(() => {});
    return await Promise.race([search, timeout]);
  } catch (err) {
    console.warn("[food-match] semantic match failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function matchParsedItems(
  parsedItems: ParsedMealItem[],
  deadlineAt: number,
  foodsPromise: Promise<FoodRow[]>,
  timer: ReturnType<typeof startTimer>,
): Promise<{ matched: MatchedItem[]; unmatched: UnmatchedItem[] }> {

  // Both matchers run for every item; the semantic one wins when it finds
  // something, otherwise the old word-overlap/alias one is the fallback.
  // Each decision is logged so we can compare them over real meals before
  // retiring the old matcher.
  const [semanticMatches, foods] = await Promise.all([
    timer.track("match", Promise.all(parsedItems.map((item) => semanticMatch(item.name, deadlineAt)))),
    foodsPromise,
  ]);

  const matched: MatchedItem[] = [];
  const unmatched: UnmatchedItem[] = [];

  parsedItems.forEach((item, i) => {
    const newMatch = semanticMatches[i];
    const oldMatch = findBestFoodMatch(item.name, foods);
    // Raw pulses/grains (IFCT) are never applied to a cooked portion.
    const { food, used, skippedRaw } = pickFood(item.name, newMatch, oldMatch);
    console.log(
      `[food-match] item="${item.name}" new="${newMatch?.name ?? "-"}" old="${oldMatch?.name ?? "-"}" agree=${
        !!newMatch && newMatch.id === oldMatch?.id
      } used=${used}${skippedRaw ? " skippedRaw=true" : ""}`,
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
  if (err instanceof GeminiBusyError) return GEMINI_BUSY_MESSAGE;
  return err instanceof Error && err.message === "GEMINI_API_KEY is not set."
    ? "AI meal reading isn't available right now."
    : "The AI helper is unavailable right now. Please try again in a moment.";
}

export async function parseMealText(description: string): Promise<ParseMealResult> {
  const timer = startTimer("parse-text");
  if (!(await timer.track("auth", getCurrentUserId()))) {
    timer.end();
    return { status: "error", message: "Please sign in to log a meal." };
  }

  const trimmed = description.trim();
  if (!trimmed) {
    return { status: "error", message: "Describe what you ate first." };
  }

  // One budget for the whole request (parse + food matching).
  const deadlineAt = Date.now() + GEMINI_TOTAL_CEILING_MS;

  // The food table doesn't depend on what Gemini says, so load it while
  // Gemini is thinking instead of after.
  const foodsPromise = loadMatchableFoods();
  foodsPromise.catch(() => {});

  let parsedItems;
  try {
    parsedItems = await timer.track("gemini", parseMealDescription(trimmed, { deadlineAt }));
  } catch (err) {
    console.error("Gemini meal text parse failed:", err);
    timer.end("failed");
    return { status: "error", message: geminiErrorMessage(err) };
  }

  if (parsedItems.length === 0) {
    timer.end("empty");
    return {
      status: "error",
      message: "We couldn't spot any food in that. Try listing the items, like “2 rotis, dal and curd”.",
    };
  }

  const { matched, unmatched } = await matchParsedItems(parsedItems, deadlineAt, foodsPromise, timer);
  timer.end(`items=${parsedItems.length}`);
  return { status: "success", matched, unmatched };
}

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function parseMealPhoto(formData: FormData): Promise<ParseMealResult> {
  const timer = startTimer("parse-photo");
  if (!(await timer.track("auth", getCurrentUserId()))) {
    timer.end();
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

  const deadlineAt = Date.now() + GEMINI_TOTAL_CEILING_MS;

  const foodsPromise = loadMatchableFoods();
  foodsPromise.catch(() => {});

  let parsedItems;
  try {
    parsedItems = await timer.track("gemini", parseMealImage(base64Data, file.type, { deadlineAt }));
  } catch (err) {
    console.error("Gemini meal photo parse failed:", err);
    timer.end("failed");
    return { status: "error", message: geminiErrorMessage(err) };
  }

  if (parsedItems.length === 0) {
    timer.end("empty");
    return {
      status: "error",
      message: "We couldn't spot any food in that photo. Try a clearer, well-lit shot from above, or describe the meal instead.",
    };
  }

  const { matched, unmatched } = await matchParsedItems(parsedItems, deadlineAt, foodsPromise, timer);
  timer.end(`items=${parsedItems.length}`);
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

  // The ownership/existence check and the user lookup don't depend on each
  // other.
  const foodItemIds = entries.map((e) => e.foodItemId);
  const [existingCount, user] = await Promise.all([
    prisma.foodItem.count({ where: { id: { in: foodItemIds } } }),
    getCurrentUser(),
  ]);
  if (existingCount !== new Set(foodItemIds).size) {
    return { status: "error", message: "One or more foods no longer exist." };
  }

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
