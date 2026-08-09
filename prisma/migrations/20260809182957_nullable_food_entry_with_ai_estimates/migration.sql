-- DropForeignKey
ALTER TABLE "FoodEntry" DROP CONSTRAINT "FoodEntry_foodItemId_fkey";

-- AlterTable
ALTER TABLE "FoodEntry" ADD COLUMN     "customCalories" DOUBLE PRECISION,
ADD COLUMN     "customCarbs" DOUBLE PRECISION,
ADD COLUMN     "customFat" DOUBLE PRECISION,
ADD COLUMN     "customFoodName" TEXT,
ADD COLUMN     "customProtein" DOUBLE PRECISION,
ALTER COLUMN "foodItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
