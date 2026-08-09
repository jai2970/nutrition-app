-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
