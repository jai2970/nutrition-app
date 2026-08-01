-- AlterTable
ALTER TABLE "User" ADD COLUMN "activityLevel" TEXT;
ALTER TABLE "User" ADD COLUMN "age" INTEGER;
ALTER TABLE "User" ADD COLUMN "dietType" TEXT;
ALTER TABLE "User" ADD COLUMN "goal" TEXT;
ALTER TABLE "User" ADD COLUMN "heightCm" REAL;
ALTER TABLE "User" ADD COLUMN "sex" TEXT;
ALTER TABLE "User" ADD COLUMN "weightKg" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FoodEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "foodItemId" TEXT NOT NULL,
    "grams" REAL NOT NULL,
    "meal" TEXT NOT NULL DEFAULT 'BREAKFAST',
    "consumedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FoodEntry_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FoodEntry" ("consumedAt", "foodItemId", "grams", "id", "userId") SELECT "consumedAt", "foodItemId", "grams", "id", "userId" FROM "FoodEntry";
DROP TABLE "FoodEntry";
ALTER TABLE "new_FoodEntry" RENAME TO "FoodEntry";
CREATE TABLE "new_FoodItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "caloriesPer100g" REAL NOT NULL,
    "proteinPer100g" REAL NOT NULL,
    "carbsPer100g" REAL NOT NULL,
    "fatPer100g" REAL NOT NULL,
    "servingSizeG" REAL NOT NULL DEFAULT 100
);
INSERT INTO "new_FoodItem" ("caloriesPer100g", "carbsPer100g", "fatPer100g", "id", "name", "proteinPer100g") SELECT "caloriesPer100g", "carbsPer100g", "fatPer100g", "id", "name", "proteinPer100g" FROM "FoodItem";
DROP TABLE "FoodItem";
ALTER TABLE "new_FoodItem" RENAME TO "FoodItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
