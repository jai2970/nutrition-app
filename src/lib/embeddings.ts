import { getGenAIClient } from "@/lib/genai-client";

// text-embedding-004 (the model named in the original spec) has been
// superseded and isn't available for this API key/version — this project's
// GEMINI_API_KEY only has embedContent access to the newer
// gemini-embedding-001 family, confirmed via ai.models.list().
const EMBEDDING_MODEL = "gemini-embedding-001";

export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getGenAIClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Gemini returned no embedding values.");
  }
  return values;
}

// Food search uses 768-dim vectors (the pgvector column is vector(768)); the
// model's default is 3072, so the size is requested explicitly. Documents and
// queries use different task types, which Google recommends for retrieval.
export const FOOD_EMBEDDING_DIMENSIONS = 768;

export async function getFoodEmbedding(text: string, kind: "document" | "query"): Promise<number[]> {
  const ai = getGenAIClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: FOOD_EMBEDDING_DIMENSIONS,
      taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length !== FOOD_EMBEDDING_DIMENSIONS) {
    throw new Error(`Gemini returned ${values?.length ?? 0} embedding values, expected ${FOOD_EMBEDDING_DIMENSIONS}.`);
  }
  return values;
}

// pgvector's text input format: "[0.1,0.2,...]" (cast with ::vector in SQL).
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
