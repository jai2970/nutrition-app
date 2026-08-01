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
export function findBestFoodMatch<T extends { name: string }>(
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
    const normalizedAlias = normalizeFoodName(extractParenAliases(food.name));
    const searchableText = [normalizedName, normalizedAlias].filter(Boolean).join(" ");

    if (normalizedName === normalizedQuery || normalizedAlias === normalizedQuery) {
      return food;
    }

    const nameWords = new Set(searchableText.split(" ").filter(Boolean));
    let overlap = 0;
    for (const word of queryWords) {
      if (nameWords.has(word)) overlap++;
    }

    let score = overlap;
    if (searchableText.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
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
