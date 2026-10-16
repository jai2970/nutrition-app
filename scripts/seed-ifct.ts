// Loads the IFCT food list (scripts/ifct_foods.csv) into FoodItem and fills
// the pgvector embedding column. Local run only — never deployed:
//
//   npm run seed:ifct          (same as: npx tsx scripts/seed-ifct.ts)
//
// Safe to re-run: foods that already have an embedding are skipped. It also
// embeds the original hand-curated foods so they take part in semantic search.
import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getFoodEmbedding, toVectorLiteral } from "../src/lib/embeddings";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Free tier is ~100 requests/minute; 650 ms keeps us comfortably under.
const DELAY_MS = 650;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CsvRow = Record<string, string>;

// Minimal RFC 4180 parser (quoted fields, doubled quotes, newlines in quotes).
function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f !== "")) rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const num = (v: string, code: string, col: string): number => {
  const n = Number(v);
  if (v === "" || !Number.isFinite(n)) throw new Error(`Bad ${col} "${v}" for ${code}`);
  return n;
};

function embedText(f: { name: string; localNames?: string | null; foodGroup?: string | null; kcal: number; protein: number; carbs: number; fat: number }): string {
  const also = f.localNames ? ` Also called ${f.localNames}.` : "";
  const group = f.foodGroup ? ` Food group: ${f.foodGroup}.` : "";
  return `${f.name}.${also}${group} Per 100g: ${f.kcal}kcal, ${f.protein}g protein, ${f.carbs}g carbs, ${f.fat}g fat.`;
}

async function embeddedIds(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "FoodItem" WHERE embedding IS NOT NULL`;
  return new Set(rows.map((r) => r.id));
}

async function embedWithRetry(text: string): Promise<number[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getFoodEmbedding(text, "document");
    } catch (err) {
      if (attempt >= 4) throw err;
      const wait = 5000 * 2 ** attempt;
      console.warn(`  embed failed (${err instanceof Error ? err.message : err}); retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");

  const csv = parseCsv(readFileSync(path.join(__dirname, "ifct_foods.csv"), "utf8"));
  console.log(`Read ${csv.length} foods from CSV.`);

  // 1. Upsert rows (no Gemini calls yet).
  const usedNames = new Set<string>();
  let created = 0, updated = 0, linked = 0;
  for (const r of csv) {
    const code = r.code;
    let name = r.name;
    if (usedNames.has(name.toLowerCase())) name = `${name} (${code})`; // CSV has a few duplicate names
    usedNames.add(name.toLowerCase());

    const meta = {
      ifctCode: code,
      scientificName: r.scientific_name || null,
      foodGroup: r.food_group || null,
      diet: r.diet || null,
      localNames: r.local_names || null,
      fibrePer100g: num(r.fibre_g, code, "fibre_g"),
    };
    const macros = {
      caloriesPer100g: num(r.kcal_per_100g, code, "kcal_per_100g"),
      proteinPer100g: num(r.protein_g, code, "protein_g"),
      carbsPer100g: num(r.carbs_g, code, "carbs_g"),
      fatPer100g: num(r.fat_g, code, "fat_g"),
    };

    const byCode = await prisma.foodItem.findUnique({ where: { ifctCode: code } });
    if (byCode) {
      await prisma.foodItem.update({ where: { id: byCode.id }, data: { ...meta, ...macros } });
      updated++;
      continue;
    }
    // A hand-curated food with the same name keeps its own macros/serving
    // size; it just gains the IFCT metadata.
    const byName = await prisma.foodItem.findUnique({ where: { name } });
    if (byName) {
      await prisma.foodItem.update({ where: { id: byName.id }, data: meta });
      linked++;
    } else {
      await prisma.foodItem.create({
        data: { name, ...meta, ...macros, servingSizeG: 100, servingLabel: "100 g" },
      });
      created++;
    }
  }
  console.log(`Rows: ${created} created, ${updated} refreshed, ${linked} linked to existing foods.`);

  // 2. Embed everything that doesn't have a vector yet.
  const done = await embeddedIds();
  const foods = await prisma.foodItem.findMany({ orderBy: { name: "asc" } });
  const todo = foods.filter((f) => !done.has(f.id));
  console.log(`${done.size} already embedded, ${todo.length} to embed (~${Math.ceil((todo.length * DELAY_MS) / 60000)} min).`);

  let n = 0;
  for (const f of todo) {
    const text = embedText({
      name: f.name,
      localNames: f.localNames ?? f.aliases.join(", "),
      foodGroup: f.foodGroup,
      kcal: f.caloriesPer100g,
      protein: f.proteinPer100g,
      carbs: f.carbsPer100g,
      fat: f.fatPer100g,
    });
    const embedding = await embedWithRetry(text);
    await prisma.$executeRaw`UPDATE "FoodItem" SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${f.id}`;
    n++;
    if (n % 25 === 0 || n === todo.length) console.log(`  embedded ${n}/${todo.length}`);
    await sleep(DELAY_MS);
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
