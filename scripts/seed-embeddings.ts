import "dotenv/config";
import { writeFileSync } from "fs";
import path from "path";
import { NUTRITION_KNOWLEDGE } from "../src/data/nutrition-knowledge";
import { getEmbedding } from "../src/lib/embeddings";

const OUTPUT_PATH = path.join(__dirname, "../src/data/nutrition-embeddings.json");

async function main() {
  const results: { id: string; embedding: number[] }[] = [];

  for (const chunk of NUTRITION_KNOWLEDGE) {
    const embedding = await getEmbedding(chunk.content);
    results.push({ id: chunk.id, embedding });
    process.stdout.write(`Embedded ${chunk.id}\n`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results));

  const avgDimension = Math.round(
    results.reduce((sum, r) => sum + r.embedding.length, 0) / results.length,
  );
  console.log(`\nEmbedded ${results.length} chunks, average embedding dimension: ${avgDimension}`);
}

main().catch((err) => {
  console.error("Failed to seed embeddings:", err);
  process.exit(1);
});
