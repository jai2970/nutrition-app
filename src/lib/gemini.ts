import { Type, type PartUnion } from "@google/genai";
import { Meal } from "@/generated/prisma/enums";
import { getGenAIClient, runGeminiCall, type RunGeminiCallOptions } from "@/lib/genai-client";

export type EstimatedMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ParsedMealItem = {
  name: string;
  grams: number;
  confidence: "high" | "medium" | "low";
  meal: Meal | null;
  estimatedMacros: EstimatedMacros;
};

const MEAL_VALUES = Object.values(Meal);
const CONFIDENCE_VALUES = ["high", "medium", "low"] as const;

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "The food item name" },
      grams: { type: Type.NUMBER, description: "Estimated quantity in grams" },
      confidence: {
        type: Type.STRING,
        enum: [...CONFIDENCE_VALUES],
        description:
          "Confidence in this item's identification and portion estimate",
      },
      meal: {
        type: Type.STRING,
        enum: MEAL_VALUES,
        nullable: true,
        description: "The meal this item was eaten at, if stated or implied",
      },
      estimatedMacros: {
        type: Type.OBJECT,
        description:
          "Best estimate of the macros for the estimated portion size (not per 100g), using standard Indian nutritional references",
        properties: {
          calories: { type: Type.NUMBER, description: "Estimated calories (kcal) for the portion" },
          protein: { type: Type.NUMBER, description: "Estimated protein in grams for the portion" },
          carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams for the portion" },
          fat: { type: Type.NUMBER, description: "Estimated fat in grams for the portion" },
        },
        required: ["calories", "protein", "carbs", "fat"],
      },
    },
    required: ["name", "grams", "confidence", "estimatedMacros"],
  },
};

// Shared framing so both the text and photo prompts interpret ambiguous or
// generic terms the same way (e.g. "dal" as cooked dal, not dry lentils).
const INDIAN_FOOD_CONTEXT =
  "The user is most likely logging Indian home-cooked food. Interpret " +
  'ambiguous or generic terms accordingly: "dal" means cooked dal (not dry, ' +
  'raw lentils), "rice" means cooked white rice, "roti" means a standard ' +
  'homemade wheat roti, "sabzi" means a mixed vegetable curry, "curd" or ' +
  '"dahi" means plain yogurt, and so on.';

// Anchors portion estimates to real serving conventions instead of letting
// the model guess grams freely.
const SERVING_SIZE_REFERENCE =
  "Standard Indian serving-size reference — anchor your estimates to these " +
  "rather than guessing freely, and only deviate when the description or " +
  'photo clearly implies a different size (e.g. "large roti", "half a bowl"):\n' +
  "- 1 roti / chapati = ~40g\n" +
  "- 1 katori dal (cooked) = ~150g\n" +
  "- 1 katori rice (cooked) = ~150g\n" +
  "- 1 glass milk = ~200ml\n" +
  "- 1 egg = ~50g\n" +
  "- 1 paratha = ~60g\n" +
  "- 1 dosa = ~80g\n" +
  "- 1 idli = ~40g\n" +
  "- 1 puri = ~25g\n" +
  "- 1 glass lassi = ~200ml\n" +
  "- 1 glass chaas = ~200ml\n" +
  "- 1 cup chai = ~150ml\n" +
  "- 1 samosa = ~50g\n" +
  "- 1 vada = ~50g";

const OUTPUT_FORMAT_INSTRUCTION =
  "Respond with structured JSON only, matching the response schema exactly " +
  "— no prose, no explanations, no markdown, nothing outside the JSON " +
  "array. For every item, include the food name, the estimated quantity in " +
  'grams, and a confidence level ("high", "medium", or "low") reflecting ' +
  "how sure you are about both the identification and the portion estimate. " +
  "For each food item, also provide your best estimate of the macros " +
  "(calories, protein in grams, carbs in grams, fat in grams) for the " +
  "estimated portion size. Use standard Indian nutritional references.";

async function generateParsedItems(
  label: string,
  contents: PartUnion[],
  opts: RunGeminiCallOptions,
): Promise<ParsedMealItem[]> {
  const response = await runGeminiCall(
    label,
    "gemini-flash-latest",
    ({ model, signal }) =>
      getGenAIClient().models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          abortSignal: signal,
        },
      }),
    opts,
  );

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array.");
  }

  return parsed
    .filter(
      (item): item is { name: string; grams: number; meal?: unknown; confidence?: unknown; estimatedMacros?: unknown } =>
        typeof (item as ParsedMealItem)?.name === "string" &&
        typeof (item as ParsedMealItem)?.grams === "number" &&
        (item as ParsedMealItem).grams > 0,
    )
    .map((item) => ({
      name: item.name.trim(),
      grams: Math.round(item.grams),
      confidence: (CONFIDENCE_VALUES as readonly string[]).includes(item.confidence as string)
        ? (item.confidence as ParsedMealItem["confidence"])
        : "medium",
      meal: MEAL_VALUES.includes(item.meal as Meal) ? (item.meal as Meal) : null,
      estimatedMacros: normalizeMacros(item.estimatedMacros),
    }));
}

function normalizeMacros(value: unknown): EstimatedMacros {
  const raw = (value ?? {}) as Record<string, unknown>;
  const clamp = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0);
  return {
    calories: clamp(raw.calories),
    protein: clamp(raw.protein),
    carbs: clamp(raw.carbs),
    fat: clamp(raw.fat),
  };
}

export async function parseMealDescription(
  description: string,
  opts: RunGeminiCallOptions = {},
): Promise<ParsedMealItem[]> {
  return generateParsedItems("meal-text", [
    {
      text:
        `${INDIAN_FOOD_CONTEXT}\n\n` +
        "Parse the following meal description into a list of distinct food " +
        "items, each with an estimated quantity in grams.\n\n" +
        `${SERVING_SIZE_REFERENCE}\n\n` +
        "If the text says or implies which meal an item was eaten at " +
        '(e.g. "for breakfast", "at dinner", "mid-morning snack"), set its meal to ' +
        "BREAKFAST, LUNCH, DINNER, or SNACKS accordingly; otherwise omit meal. " +
        "Combine duplicate mentions of the same food into one entry only if they " +
        "belong to the same meal (or neither mentions a meal) — keep separate " +
        "entries for the same food eaten at different meals.\n\n" +
        `${OUTPUT_FORMAT_INSTRUCTION}\n\n` +
        `Meal description: "${description}"`,
    },
  ], opts);
}

export async function parseMealImage(
  base64Data: string,
  mimeType: string,
  opts: RunGeminiCallOptions = {},
): Promise<ParsedMealItem[]> {
  return generateParsedItems("meal-photo", [
    {
      text:
        `${INDIAN_FOOD_CONTEXT}\n\n` +
        "Identify each distinct food item visible in this photo of a meal, and " +
        "estimate how much of each is on the plate in grams, based on what's " +
        "visible (portion relative to the plate/bowl, apparent thickness/count, " +
        "etc).\n\n" +
        `${SERVING_SIZE_REFERENCE}\n\n` +
        "Indian thalis and plates often contain several small, distinct " +
        "portions (e.g. a roti, a katori of dal, a katori of sabzi, rice, " +
        "salad, pickle, papad) — identify each visible item separately rather " +
        "than describing the whole plate as one dish. Err on the side of " +
        "listing more items rather than fewer: the user can easily remove an " +
        "item that was detected incorrectly, but can't add one that was " +
        "missed entirely.\n\n" +
        `${OUTPUT_FORMAT_INSTRUCTION}\n\n` +
        "These are visual estimates from a photo, so approximate is fine. If " +
        "the photo doesn't contain any food, return an empty array.",
    },
    { inlineData: { data: base64Data, mimeType } },
  ], opts);
}
