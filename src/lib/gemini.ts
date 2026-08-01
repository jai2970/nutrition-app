import { GoogleGenAI, Type } from "@google/genai";
import { Meal } from "@/generated/prisma/enums";

export type ParsedMealItem = {
  name: string;
  grams: number;
  meal: Meal | null;
};

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const MEAL_VALUES = Object.values(Meal);

export async function parseMealDescription(description: string): Promise<ParsedMealItem[]> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents:
      "Parse the following meal description into a list of distinct food items, " +
      "each with an estimated quantity in grams. Use typical Indian home-cooking " +
      "serving sizes when the user gives counts or vague portions (e.g. one roti " +
      "is about 40g, one bowl of dal or curry is about 150g, one bowl of curd is " +
      "about 150g). If the text says or implies which meal an item was eaten at " +
      '(e.g. "for breakfast", "at dinner", "mid-morning snack"), set its meal to ' +
      "BREAKFAST, LUNCH, DINNER, or SNACKS accordingly; otherwise omit meal. " +
      "Combine duplicate mentions of the same food into one entry only if they " +
      "belong to the same meal (or neither mentions a meal) — keep separate " +
      "entries for the same food eaten at different meals.\n\n" +
      `Meal description: "${description}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The food item name" },
            grams: { type: Type.NUMBER, description: "Estimated quantity in grams" },
            meal: {
              type: Type.STRING,
              enum: MEAL_VALUES,
              nullable: true,
              description: "The meal this item was eaten at, if stated or implied",
            },
          },
          required: ["name", "grams"],
        },
      },
    },
  });

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
      (item): item is { name: string; grams: number; meal?: unknown } =>
        typeof (item as ParsedMealItem)?.name === "string" &&
        typeof (item as ParsedMealItem)?.grams === "number" &&
        (item as ParsedMealItem).grams > 0,
    )
    .map((item) => ({
      name: item.name.trim(),
      grams: Math.round(item.grams),
      meal: MEAL_VALUES.includes(item.meal as Meal) ? (item.meal as Meal) : null,
    }));
}
