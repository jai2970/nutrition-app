import Anthropic from "@anthropic-ai/sdk";
import { buildDescriptionPrompt, buildImagePrompt, normalizeParsedItems, type ParsedMealItem } from "@/lib/gemini";

// Claude Haiku is the small, fast, low-cost model — plenty for turning a
// meal description or photo into foods + macros. Override with ANTHROPIC_MODEL
// (e.g. "claude-sonnet-5-5") without a code change if you ever want more.
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  // Reads ANTHROPIC_API_KEY from the environment. Retries 429/5xx/network
  // errors once; the timeout keeps a slow call inside the serverless limit.
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}

// Structured outputs need an object at the root, so the list lives under
// `items`. `meal` is a plain enum (UNSPECIFIED = not stated) to keep the
// schema simple.
const MEAL_ENUM = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS", "UNSPECIFIED"];
const MACRO = { type: "number" } as const;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          meal: { type: "string", enum: MEAL_ENUM },
          estimatedMacros: {
            type: "object",
            properties: { calories: MACRO, protein: MACRO, carbs: MACRO, fat: MACRO },
            required: ["calories", "protein", "carbs", "fat"],
            additionalProperties: false,
          },
        },
        required: ["name", "grams", "confidence", "meal", "estimatedMacros"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

const OUTPUT_INSTRUCTION =
  "Return the result as the structured JSON object: an `items` list where every item has " +
  "the food name, the estimated quantity in grams, a confidence level (high, medium or low) " +
  "reflecting how sure you are about both the identification and the portion, the meal it " +
  "was eaten at (BREAKFAST, LUNCH, DINNER, SNACKS, or UNSPECIFIED when not stated), and your " +
  "best estimate of the macros (calories, protein g, carbs g, fat g) for that estimated " +
  "portion, using standard Indian nutritional references.";

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

async function generate(content: Anthropic.MessageParam["content"]): Promise<ParsedMealItem[]> {
  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    // Low effort: this is extraction, not reasoning — keeps it fast and cheap.
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude declined to answer.");
  if (response.stop_reason === "max_tokens") throw new Error("Claude's answer was cut off.");

  const block = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) throw new Error("Claude returned an empty response.");

  const parsed = JSON.parse(block.text) as { items?: unknown };
  const items = Array.isArray(parsed.items)
    ? parsed.items.map((it) => ({
        ...(it as object),
        meal: (it as { meal?: string }).meal === "UNSPECIFIED" ? null : (it as { meal?: string }).meal,
      }))
    : null;
  return normalizeParsedItems(items);
}

export async function parseMealDescriptionClaude(description: string): Promise<ParsedMealItem[]> {
  return generate([{ type: "text", text: buildDescriptionPrompt(description, OUTPUT_INSTRUCTION) }]);
}

export async function parseMealImageClaude(base64Data: string, mimeType: string): Promise<ParsedMealItem[]> {
  if (!(SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    // e.g. HEIC — Claude can't read it. The router falls back to the next provider.
    throw new Error(`Claude doesn't support ${mimeType} images.`);
  }
  return generate([
    { type: "image", source: { type: "base64", media_type: mimeType as SupportedImageType, data: base64Data } },
    { type: "text", text: buildImagePrompt(OUTPUT_INSTRUCTION) },
  ]);
}
