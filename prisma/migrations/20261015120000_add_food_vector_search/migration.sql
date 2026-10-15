-- Semantic food search: pgvector + IFCT metadata columns on FoodItem.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "FoodItem"
  ADD COLUMN "ifctCode" TEXT,
  ADD COLUMN "scientificName" TEXT,
  ADD COLUMN "foodGroup" TEXT,
  ADD COLUMN "diet" TEXT,
  ADD COLUMN "localNames" TEXT,
  ADD COLUMN "fibrePer100g" DOUBLE PRECISION,
  ADD COLUMN "embedding" vector(768);

CREATE UNIQUE INDEX "FoodItem_ifctCode_key" ON "FoodItem"("ifctCode");

-- No vector index on purpose: at ~600 rows an exact scan is a fraction of a
-- millisecond, and an index on an Unsupported column would show up as drift
-- in every future `prisma migrate dev`.
