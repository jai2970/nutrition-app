import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const foods = [
  { name: "Roti (whole wheat)", caloriesPer100g: 297, proteinPer100g: 11, carbsPer100g: 46, fatPer100g: 7.4, servingSizeG: 40, servingLabel: "1 medium roti (~40g)" },
  { name: "Naan", caloriesPer100g: 310, proteinPer100g: 9, carbsPer100g: 50, fatPer100g: 8, servingSizeG: 90, servingLabel: "1 piece (~90g)" },
  { name: "Paratha (plain)", caloriesPer100g: 260, proteinPer100g: 6.5, carbsPer100g: 36, fatPer100g: 10, servingSizeG: 60, servingLabel: "1 piece (~60g)" },
  { name: "Steamed rice", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, servingSizeG: 150, servingLabel: "1 cup cooked (~150g)" },
  { name: "Brown rice", caloriesPer100g: 123, proteinPer100g: 2.7, carbsPer100g: 25.6, fatPer100g: 1, servingSizeG: 150, servingLabel: "1 cup cooked (~150g)" },
  { name: "Jeera rice", caloriesPer100g: 175, proteinPer100g: 3.2, carbsPer100g: 30, fatPer100g: 5, servingSizeG: 150, servingLabel: "1 cup (~150g)" },
  { name: "Moong dal", caloriesPer100g: 105, proteinPer100g: 7, carbsPer100g: 19, fatPer100g: 0.4, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Toor dal (arhar)", caloriesPer100g: 120, proteinPer100g: 7, carbsPer100g: 20, fatPer100g: 1.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Chana dal", caloriesPer100g: 164, proteinPer100g: 8.9, carbsPer100g: 27, fatPer100g: 2.6, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Masoor dal", caloriesPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Urad dal", caloriesPer100g: 147, proteinPer100g: 9.6, carbsPer100g: 25, fatPer100g: 0.6, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Rajma (kidney bean curry)", caloriesPer100g: 140, proteinPer100g: 8, carbsPer100g: 20, fatPer100g: 3.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Chole (chickpea curry)", caloriesPer100g: 164, proteinPer100g: 8, carbsPer100g: 21, fatPer100g: 5.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Paneer (raw)", caloriesPer100g: 265, proteinPer100g: 18, carbsPer100g: 3.4, fatPer100g: 20, servingSizeG: 100, servingLabel: "100g cube" },
  { name: "Paneer butter masala", caloriesPer100g: 220, proteinPer100g: 10, carbsPer100g: 8, fatPer100g: 16, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Palak paneer", caloriesPer100g: 180, proteinPer100g: 9, carbsPer100g: 7, fatPer100g: 13, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Matar paneer", caloriesPer100g: 170, proteinPer100g: 8.5, carbsPer100g: 9, fatPer100g: 11, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Aloo gobi", caloriesPer100g: 110, proteinPer100g: 2.5, carbsPer100g: 14, fatPer100g: 5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Bhindi masala", caloriesPer100g: 100, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 6.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Baingan bharta", caloriesPer100g: 95, proteinPer100g: 2, carbsPer100g: 10, fatPer100g: 5.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Aloo matar", caloriesPer100g: 120, proteinPer100g: 3.5, carbsPer100g: 15, fatPer100g: 5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Jeera aloo", caloriesPer100g: 150, proteinPer100g: 2.5, carbsPer100g: 20, fatPer100g: 7, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Mixed vegetable curry (sabzi)", caloriesPer100g: 90, proteinPer100g: 2.5, carbsPer100g: 10, fatPer100g: 4.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Curd (dahi)", caloriesPer100g: 60, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Buttermilk (chaas)", caloriesPer100g: 40, proteinPer100g: 1.5, carbsPer100g: 4, fatPer100g: 2, servingSizeG: 200, servingLabel: "1 glass (~200ml)" },
  { name: "Idli", caloriesPer100g: 130, proteinPer100g: 4, carbsPer100g: 26, fatPer100g: 0.7, servingSizeG: 80, servingLabel: "2 pieces (~80g)" },
  { name: "Dosa (plain)", caloriesPer100g: 168, proteinPer100g: 3.9, carbsPer100g: 28, fatPer100g: 4, servingSizeG: 90, servingLabel: "1 dosa (~90g)" },
  { name: "Masala dosa", caloriesPer100g: 200, proteinPer100g: 4.5, carbsPer100g: 30, fatPer100g: 7, servingSizeG: 150, servingLabel: "1 dosa (~150g)" },
  { name: "Sambar", caloriesPer100g: 80, proteinPer100g: 4, carbsPer100g: 12, fatPer100g: 2, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Upma", caloriesPer100g: 150, proteinPer100g: 3.5, carbsPer100g: 25, fatPer100g: 4.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Poha", caloriesPer100g: 130, proteinPer100g: 2.5, carbsPer100g: 24, fatPer100g: 3.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Khichdi", caloriesPer100g: 120, proteinPer100g: 4, carbsPer100g: 20, fatPer100g: 3, servingSizeG: 200, servingLabel: "1 bowl (~200g)" },
  { name: "Chicken curry", caloriesPer100g: 180, proteinPer100g: 15, carbsPer100g: 5, fatPer100g: 11, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Chicken tikka", caloriesPer100g: 190, proteinPer100g: 24, carbsPer100g: 3, fatPer100g: 9, servingSizeG: 100, servingLabel: "4-5 pieces (~100g)" },
  { name: "Butter chicken", caloriesPer100g: 250, proteinPer100g: 16, carbsPer100g: 7, fatPer100g: 18, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Egg (boiled)", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, servingSizeG: 50, servingLabel: "1 egg (~50g)" },
  { name: "Egg curry", caloriesPer100g: 145, proteinPer100g: 9, carbsPer100g: 5, fatPer100g: 10, servingSizeG: 200, servingLabel: "2 eggs in curry (~200g)" },
  { name: "Omelette", caloriesPer100g: 154, proteinPer100g: 10.9, carbsPer100g: 1.6, fatPer100g: 11.7, servingSizeG: 120, servingLabel: "1 omelette, 2 eggs (~120g)" },
  { name: "Fish curry", caloriesPer100g: 140, proteinPer100g: 16, carbsPer100g: 4, fatPer100g: 7, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Fried fish", caloriesPer100g: 210, proteinPer100g: 20, carbsPer100g: 6, fatPer100g: 12, servingSizeG: 100, servingLabel: "1 piece (~100g)" },
  { name: "Vegetable biryani", caloriesPer100g: 160, proteinPer100g: 3.5, carbsPer100g: 25, fatPer100g: 5.5, servingSizeG: 250, servingLabel: "1 plate (~250g)" },
  { name: "Chicken biryani", caloriesPer100g: 190, proteinPer100g: 9, carbsPer100g: 24, fatPer100g: 6.5, servingSizeG: 250, servingLabel: "1 plate (~250g)" },
  { name: "Raita", caloriesPer100g: 65, proteinPer100g: 2.8, carbsPer100g: 5, fatPer100g: 3.8, servingSizeG: 100, servingLabel: "1 bowl (~100g)" },
  { name: "Papad (roasted)", caloriesPer100g: 330, proteinPer100g: 20, carbsPer100g: 55, fatPer100g: 3, servingSizeG: 10, servingLabel: "1 piece (~10g)" },
  { name: "Pickle (achar)", caloriesPer100g: 250, proteinPer100g: 1.5, carbsPer100g: 15, fatPer100g: 20, servingSizeG: 15, servingLabel: "1 tbsp (~15g)" },
  { name: "Ghee", caloriesPer100g: 900, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, servingSizeG: 5, servingLabel: "1 tsp (~5g)" },
  { name: "Butter", caloriesPer100g: 717, proteinPer100g: 0.9, carbsPer100g: 0.1, fatPer100g: 81, servingSizeG: 5, servingLabel: "1 tsp (~5g)" },
  { name: "Milk (whole)", caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, servingSizeG: 200, servingLabel: "1 glass (~200ml)" },
  { name: "Roasted chana", caloriesPer100g: 364, proteinPer100g: 19, carbsPer100g: 61, fatPer100g: 6, servingSizeG: 30, servingLabel: "1 handful (~30g)" },
  { name: "Peanuts (roasted)", caloriesPer100g: 567, proteinPer100g: 26, carbsPer100g: 16, fatPer100g: 49, servingSizeG: 30, servingLabel: "1 handful (~30g)" },
  { name: "Banana", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, servingSizeG: 120, servingLabel: "1 medium (~120g)" },
  { name: "Apple", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, servingSizeG: 150, servingLabel: "1 medium (~150g)" },
  { name: "Samosa", caloriesPer100g: 260, proteinPer100g: 4, carbsPer100g: 30, fatPer100g: 14, servingSizeG: 60, servingLabel: "1 piece (~60g)" },
  { name: "Pakora (vegetable fritters)", caloriesPer100g: 280, proteinPer100g: 6, carbsPer100g: 25, fatPer100g: 18, servingSizeG: 80, servingLabel: "4-5 pieces (~80g)" },
  { name: "Masala chai", caloriesPer100g: 55, proteinPer100g: 1.5, carbsPer100g: 8, fatPer100g: 1.8, servingSizeG: 150, servingLabel: "1 cup (~150ml)" },
  { name: "Filter coffee", caloriesPer100g: 50, proteinPer100g: 1.3, carbsPer100g: 7, fatPer100g: 1.5, servingSizeG: 150, servingLabel: "1 cup (~150ml)" },
  { name: "Sprouts salad", caloriesPer100g: 105, proteinPer100g: 7, carbsPer100g: 19, fatPer100g: 0.5, servingSizeG: 100, servingLabel: "1 bowl (~100g)" },
] as const;

async function main() {
  for (const food of foods) {
    await prisma.foodItem.upsert({
      where: { name: food.name },
      update: food,
      create: food,
    });
  }
  console.log(`Seeded ${foods.length} food items.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
