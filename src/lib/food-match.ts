import { getGenAIClient, runGeminiCall } from "@/lib/genai-client";

export type FoodMatchCandidate = {
  name: string;
  localNames: string | null;
  caloriesPer100g: number;
  foodGroup?: string | null;
  ifctCode?: string | null;
};

// --- Raw vs cooked ----------------------------------------------------------
// IFCT values are for the raw / dry ingredient. A cooked bowl of dal is about
// 2.5x water, so applying 330 kcal/100g to "150 g dal" nearly triples the
// calories. Meal parsing assumes cooked food (see INDIAN_FOOD_CONTEXT in
// gemini.ts), so a raw pulse or grain must not be used for a cooked portion.
const RAW_STAPLE_GROUPS = new Set(["Grain Legumes", "Cereals and Millets"]);
// Cereal products that are used as-is (flour, flakes, puffs) or whose cooked
// form is a different dish; they are not "raw grain that gets cooked".
const NOT_A_COOKED_GRAIN = /flour|atta|flakes|puffed|semolina|vermicelli|tender/i;

export function isRawStaple(food: { name: string; foodGroup?: string | null; ifctCode?: string | null }): boolean {
  if (!food.ifctCode || !food.foodGroup || !RAW_STAPLE_GROUPS.has(food.foodGroup)) return false;
  if (food.foodGroup === "Cereals and Millets" && NOT_A_COOKED_GRAIN.test(food.name)) return false;
  return true;
}

/** True when the user explicitly means the uncooked ingredient ("raw rice", "dry rajma", "atta"). */
export function mentionsUncooked(detectedItem: string): boolean {
  return /\b(raw|dry|dried|uncooked|soaked|sprouted|sprouts|flour|atta|maida|powder)\b/i.test(detectedItem);
}

/**
 * Chooses between the semantic match and the old matcher's match, never
 * returning a raw pulse/grain for a cooked portion. A skipped raw match falls
 * through to the other matcher, and finally to null (AI-estimated macros).
 */
export function pickFood<T extends { name: string; foodGroup?: string | null; ifctCode?: string | null }>(
  detectedItem: string,
  semantic: T | null,
  old: T | null,
): { food: T | null; used: "new" | "old" | "none"; skippedRaw: boolean } {
  const allowRaw = mentionsUncooked(detectedItem);
  let skippedRaw = false;
  const usable = (f: T | null): f is T => {
    if (!f) return false;
    if (!allowRaw && isRawStaple(f)) {
      skippedRaw = true;
      return false;
    }
    return true;
  };
  if (usable(semantic)) return { food: semantic, used: "new", skippedRaw };
  if (usable(old)) return { food: old, used: "old", skippedRaw };
  return { food: null, used: "none", skippedRaw };
}

export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pulls out parenthetical asides in a food name (e.g. "Curd (dahi)", "Toor dal
 * (arhar)") as extra alias text. These are common regional/Hindi names for the
 * same dish, so they should be matchable even though normalizeFoodName strips
 * parens from the primary comparison string.
 */
function extractParenAliases(name: string): string {
  const aliases = [...name.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  return aliases.join(" ");
}

/**
 * Scores candidates by normalized word overlap plus a substring bonus, since
 * parsed names from the model rarely match FoodItem.name exactly (e.g. "roti"
 * vs "Roti (whole wheat)"). Below ~0.5 the match is too weak to trust.
 */
export function findBestFoodMatch<T extends { name: string; aliases: string[] }>(
  query: string,
  foods: T[],
): T | null {
  const normalizedQuery = normalizeFoodName(query);
  if (!normalizedQuery) return null;

  const queryWords = new Set(normalizedQuery.split(" ").filter(Boolean));

  let best: T | null = null;
  let bestScore = 0;

  for (const food of foods) {
    const normalizedName = normalizeFoodName(food.name);

    if (normalizedName === normalizedQuery) {
      return food;
    }

    // Each alias (a parenthetical aside in the name, e.g. "raw" in "Paneer
    // (raw)", plus any explicit FoodItem.aliases like "dahi" or "chawal") is
    // trusted only when every word in the query is covered by that single
    // alias — not via loose word-bag overlap against the primary name, and
    // not by merging all aliases into one bag either. Aliases are often one
    // short word, and folding them into general overlap scoring let an
    // unrelated longer query that merely contains the same word ("raw
    // onion") falsely win a match against "Paneer (raw)".
    const candidateAliases = [extractParenAliases(food.name), ...food.aliases];
    for (const rawAlias of candidateAliases) {
      const normalizedAlias = normalizeFoodName(rawAlias);
      if (!normalizedAlias) continue;
      const aliasWords = new Set(normalizedAlias.split(" ").filter(Boolean));
      const queryCoveredByAlias = [...queryWords].every((w) => aliasWords.has(w));
      if (queryCoveredByAlias) {
        return food;
      }
    }

    const nameWords = new Set(normalizedName.split(" ").filter(Boolean));
    let overlap = 0;
    for (const word of queryWords) {
      if (nameWords.has(word)) overlap++;
    }

    let score = overlap;
    if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
      score += 1;
    }

    const denom = Math.max(queryWords.size, nameWords.size, 1);
    const normalizedScore = score / denom;

    if (normalizedScore > bestScore) {
      bestScore = normalizedScore;
      best = food;
    }
  }

  return bestScore >= 0.5 ? best : null;
}

// --- LLM picker over semantic-search candidates ---------------------------

const MATCH_MODEL = "gemini-flash-latest";

/**
 * Asks Gemini Flash which candidate (from searchFoods) is the closest match
 * to what the user ate. Returns the winning food, or null when none fits (or
 * the call fails) so the caller can fall back to AI-estimated macros.
 */
export async function matchFood<T extends FoodMatchCandidate>(
  detectedItem: string,
  candidates: T[],
  opts: { deadlineAt?: number } = {},
): Promise<T | null> {
  if (candidates.length === 0) return null;

  const list = candidates
    .map((c, i) => {
      const also = c.localNames ? ` (also called: ${c.localNames.slice(0, 120)})` : "";
      const raw = isRawStaple(c) ? " [RAW ingredient, not cooked]" : "";
      return `${i + 1}. ${c.name}${raw}${also} — ${Math.round(c.caloriesPer100g)} kcal/100g`;
    })
    .join("\n");

  const prompt = `The user has: "${detectedItem}". Which of these ${candidates.length} foods is the closest match? Some entries are raw, uncooked ingredients (e.g. dry dal or flour) with much higher calories per 100g than the cooked dish a person actually eats — do not pick a raw ingredient for a cooked dish. Reply with just the number 1-${candidates.length}, or 0 if none fit well.

${list}`;

  try {
    const response = await runGeminiCall(
      "food-match",
      MATCH_MODEL,
      ({ model, signal }) =>
        getGenAIClient().models.generateContent({
          model,
          contents: [{ text: prompt }],
          config: { temperature: 0, abortSignal: signal },
        }),
      opts,
    );
    const digits = response.text?.match(/\d+/)?.[0];
    const choice = digits === undefined ? NaN : parseInt(digits, 10);
    if (!Number.isInteger(choice) || choice < 1 || choice > candidates.length) return null;
    return candidates[choice - 1];
  } catch (err) {
    console.warn("[food-match] Gemini picker failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
