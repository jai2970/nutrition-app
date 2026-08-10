import { NUTRITION_KNOWLEDGE, type KnowledgeChunk } from "@/data/nutrition-knowledge";
import nutritionEmbeddings from "@/data/nutrition-embeddings.json";
import { getEmbedding, cosineSimilarity } from "@/lib/embeddings";
import { getGenAIClient } from "@/lib/genai-client";
import type { DietType, Goal } from "@/generated/prisma/enums";

const embeddingById = new Map<string, number[]>(
  (nutritionEmbeddings as { id: string; embedding: number[] }[]).map((e) => [e.id, e.embedding]),
);

const TOP_K = 5;
// Below this similarity, a chunk is more likely noise than genuinely
// relevant — better to tell the model (and the user) nothing was found
// than to stuff in a low-relevance chunk it might try to force an answer
// from. Calibrated empirically against gemini-embedding-001's similarity
// distribution for this corpus: genuinely relevant questions score
// 0.55-0.78 against their best-matching chunk, while fully unrelated
// questions ("what's the capital of France") top out around 0.44-0.46 —
// 0.5 sits cleanly between the two.
const MIN_SIMILARITY = 0.5;

export async function retrieveRelevantChunks(question: string): Promise<KnowledgeChunk[]> {
  const queryEmbedding = await getEmbedding(question);

  const scored = NUTRITION_KNOWLEDGE.map((chunk) => {
    const embedding = embeddingById.get(chunk.id);
    if (!embedding) return null;
    return { chunk, score: cosineSimilarity(queryEmbedding, embedding) };
  }).filter((entry): entry is { chunk: KnowledgeChunk; score: number } => entry !== null);

  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((entry) => entry.score >= MIN_SIMILARITY)
    .slice(0, TOP_K)
    .map((entry) => entry.chunk);
}

export type DietAdvisorAnswer = {
  answer: string;
  sources: string[];
};

const GENERATION_MODEL = "gemini-flash-latest";

const SYSTEM_INSTRUCTIONS = `You are a nutrition advisor for Indian diets, built into a meal-tracking app. First classify the user's message, then respond exactly per its case:

CASE A — Greeting or off-topic (hi, hello, how are you, weather, anything not about diet/nutrition/food/health):
Reply with exactly one short sentence: "I'm your nutrition advisor — ask me about your diet, protein sources, or meal planning!" Do not mention their profile, targets, or intake. Do not answer the off-topic question itself.

CASE B — A real nutrition question, but the "Context from verified nutritional sources" section below is empty:
Reply with exactly one short sentence: "I don't have verified information on that topic. Try asking about protein sources, Indian diet tips, or meal planning." Do not mention their profile, targets, or intake.

CASE C — A real nutrition question with relevant context provided:
Answer in 2-3 sentences maximum — no paragraphs, no filler, no restating the question. Base every factual claim only on the provided context, never invented. Only bring up the user's daily targets or today's logged intake if the question is directly about their own progress (e.g. "am I getting enough protein" → yes, mention it; "is ghee healthy" → no, don't). Never open with "So far today, you have logged..." unless they specifically asked about their own intake. If they did ask about their own intake and nothing is logged yet today, say that first, briefly.

Be decisive about which case applies — most short or vague messages ("hi", "thanks", "ok") are Case A, not Case C.`;

export async function answerDietQuestion(params: {
  question: string;
  goal: Goal;
  dietType: DietType | null;
  calorieGoal: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  todaysCalories: number;
  todaysProteinG: number;
  todaysCarbsG: number;
  todaysFatG: number;
  relevantChunks: KnowledgeChunk[];
}): Promise<DietAdvisorAnswer> {
  const {
    question,
    goal,
    dietType,
    calorieGoal,
    proteinTargetG,
    carbsTargetG,
    fatTargetG,
    todaysCalories,
    todaysProteinG,
    todaysCarbsG,
    todaysFatG,
    relevantChunks,
  } = params;

  const hasLoggedMealsToday = todaysCalories > 0 || todaysProteinG > 0 || todaysCarbsG > 0 || todaysFatG > 0;

  const contextBlock = relevantChunks.length
    ? relevantChunks.map((c) => `- ${c.content} (Source: ${c.source})`).join("\n")
    : "(No sufficiently relevant knowledge base entries were found for this question.)";

  const prompt = `${SYSTEM_INSTRUCTIONS}

User profile:
- Goal: ${goal}
- Diet type: ${dietType ?? "Not specified"}
- Daily targets: ${Math.round(calorieGoal)} kcal, ${Math.round(proteinTargetG)}g protein, ${Math.round(carbsTargetG)}g carbs, ${Math.round(fatTargetG)}g fat

Today's logged intake: ${
    hasLoggedMealsToday
      ? `${Math.round(todaysCalories)} kcal, ${Math.round(todaysProteinG)}g protein, ${Math.round(todaysCarbsG)}g carbs, ${Math.round(todaysFatG)}g fat`
      : "No meals logged yet today."
  }

Context from verified nutritional sources:
${contextBlock}

User question: ${question}`;

  const ai = getGenAIClient();
  const response = await ai.models.generateContent({
    model: GENERATION_MODEL,
    contents: [{ text: prompt }],
  });

  const answer = response.text?.trim();
  if (!answer) {
    throw new Error("Gemini returned an empty response.");
  }

  const sources = [...new Set(relevantChunks.map((c) => c.source))];

  return { answer, sources };
}
