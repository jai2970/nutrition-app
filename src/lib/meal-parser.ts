import type { ParsedMealItem } from "@/lib/gemini";
import { parseMealDescription as parseWithGemini, parseMealImage as parseImageWithGemini } from "@/lib/gemini";
import { parseMealDescriptionClaude, parseMealImageClaude } from "@/lib/claude";

// Which AI reads the meal. Claude (Haiku) is tried first when ANTHROPIC_API_KEY
// is set; Gemini is the fallback when GEMINI_API_KEY is set. If Claude is
// down, rate-limited, or can't read the file (e.g. HEIC), the meal still gets
// parsed by the other provider. With only one key set, that one is used.
type Provider<T> = { name: string; run: () => Promise<T> };

async function runProviders<T>(providers: Provider<T>[]): Promise<T> {
  if (providers.length === 0) {
    throw new Error("NO_AI_KEY");
  }
  let firstError: unknown;
  for (const provider of providers) {
    try {
      return await provider.run();
    } catch (err) {
      console.error(`Meal parsing with ${provider.name} failed:`, err);
      firstError ??= err;
    }
  }
  // Report the primary provider's failure — it's the one to fix.
  throw firstError;
}

const hasClaude = () => !!process.env.ANTHROPIC_API_KEY;
const hasGemini = () => !!process.env.GEMINI_API_KEY;

export function parseMealText(description: string): Promise<ParsedMealItem[]> {
  const providers: Provider<ParsedMealItem[]>[] = [];
  if (hasClaude()) providers.push({ name: "Claude", run: () => parseMealDescriptionClaude(description) });
  if (hasGemini()) providers.push({ name: "Gemini", run: () => parseWithGemini(description) });
  return runProviders(providers);
}

export function parseMealPhoto(base64Data: string, mimeType: string): Promise<ParsedMealItem[]> {
  const providers: Provider<ParsedMealItem[]>[] = [];
  if (hasClaude()) providers.push({ name: "Claude", run: () => parseMealImageClaude(base64Data, mimeType) });
  if (hasGemini()) providers.push({ name: "Gemini", run: () => parseImageWithGemini(base64Data, mimeType) });
  return runProviders(providers);
}
