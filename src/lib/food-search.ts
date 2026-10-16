import { Prisma } from "@/generated/prisma/client";
import type { FoodItem } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getFoodEmbedding, toVectorLiteral } from "@/lib/embeddings";

async function vectorSearch(query: string, limit: number): Promise<FoodItem[]> {
  const embedding = await getFoodEmbedding(query, "query");
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM "FoodItem"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
    LIMIT ${limit}
  `);
  return fetchInOrder(rows.map((r) => r.id));
}

async function textSearch(query: string, limit: number): Promise<FoodItem[]> {
  return prisma.foodItem.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { localNames: { contains: query, mode: "insensitive" } },
        { aliases: { has: query.toLowerCase() } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
  });
}

async function fetchInOrder(ids: string[]): Promise<FoodItem[]> {
  if (ids.length === 0) return [];
  const foods = await prisma.foodItem.findMany({ where: { id: { in: ids } } });
  const byId = new Map(foods.map((f) => [f.id, f]));
  return ids.map((id) => byId.get(id)).filter((f): f is FoodItem => !!f);
}

/**
 * Hybrid food lookup: pgvector cosine similarity on the Gemini embedding
 * plus a plain name / local-name text match. The two lists are interleaved
 * (semantic hit, text hit, ...) so both signals are represented, then
 * de-duplicated and cut to topK. If the embedding call (or the vector query)
 * fails, text search alone is returned.
 */
export async function searchFoods(query: string, topK = 5): Promise<FoodItem[]> {
  const q = query.trim();
  if (!q) return [];

  const [vector, text] = await Promise.all([
    vectorSearch(q, topK).catch((err) => {
      console.warn("[food-search] vector search failed, using text search only:", err instanceof Error ? err.message : err);
      return [] as FoodItem[];
    }),
    textSearch(q, topK),
  ]);

  const merged: FoodItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; merged.length < topK && (i < vector.length || i < text.length); i++) {
    for (const food of [vector[i], text[i]]) {
      if (food && !seen.has(food.id) && merged.length < topK) {
        seen.add(food.id);
        merged.push(food);
      }
    }
  }
  return merged;
}
