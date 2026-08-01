/*
  Warnings:

  - Added the required column `servingLabel` to the `FoodItem` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FoodItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "caloriesPer100g" REAL NOT NULL,
    "proteinPer100g" REAL NOT NULL,
    "carbsPer100g" REAL NOT NULL,
    "fatPer100g" REAL NOT NULL,
    "servingSizeG" REAL NOT NULL DEFAULT 100,
    "servingLabel" TEXT NOT NULL
);
INSERT INTO "new_FoodItem" ("caloriesPer100g", "carbsPer100g", "fatPer100g", "id", "name", "proteinPer100g", "servingSizeG") SELECT "caloriesPer100g", "carbsPer100g", "fatPer100g", "id", "name", "proteinPer100g", "servingSizeG" FROM "FoodItem";
DROP TABLE "FoodItem";
ALTER TABLE "new_FoodItem" RENAME TO "FoodItem";
CREATE UNIQUE INDEX "FoodItem_name_key" ON "FoodItem"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
