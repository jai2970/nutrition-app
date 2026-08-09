import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Macro values are per 100g. Simple single-ingredient/prep items (rice,
// dals, fruits, milk, egg) are close to IFCT (Indian Food Composition
// Tables) values. Composite dishes IFCT doesn't tabulate directly (biryani,
// samosa, pav bhaji, keema, etc.) are reasonable composite estimates based
// on their typical ingredients and preparation — not literal IFCT lookups.
const foods = [
  // Breads
  { name: "Roti (whole wheat)", aliases: ["chapati", "phulka"], caloriesPer100g: 297, proteinPer100g: 11, carbsPer100g: 46, fatPer100g: 7.4, servingSizeG: 40, servingLabel: "1 medium roti (~40g)" },
  { name: "Naan", aliases: [], caloriesPer100g: 310, proteinPer100g: 9, carbsPer100g: 50, fatPer100g: 8, servingSizeG: 90, servingLabel: "1 piece (~90g)" },
  { name: "Paratha (plain)", aliases: [], caloriesPer100g: 260, proteinPer100g: 6.5, carbsPer100g: 36, fatPer100g: 10, servingSizeG: 60, servingLabel: "1 piece (~60g)" },
  { name: "Puri", aliases: [], caloriesPer100g: 379, proteinPer100g: 6.5, carbsPer100g: 40, fatPer100g: 20, servingSizeG: 25, servingLabel: "1 piece (~25g)" },
  { name: "Uttapam", aliases: [], caloriesPer100g: 150, proteinPer100g: 4, carbsPer100g: 26, fatPer100g: 3.5, servingSizeG: 100, servingLabel: "1 uttapam (~100g)" },

  // Rice dishes
  { name: "Steamed rice", aliases: ["chawal"], caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, servingSizeG: 150, servingLabel: "1 cup cooked (~150g)" },
  { name: "Brown rice", aliases: [], caloriesPer100g: 123, proteinPer100g: 2.7, carbsPer100g: 25.6, fatPer100g: 1, servingSizeG: 150, servingLabel: "1 cup cooked (~150g)" },
  { name: "Jeera rice", aliases: [], caloriesPer100g: 175, proteinPer100g: 3.2, carbsPer100g: 30, fatPer100g: 5, servingSizeG: 150, servingLabel: "1 cup (~150g)" },
  { name: "Vegetable pulao", aliases: ["pulao"], caloriesPer100g: 150, proteinPer100g: 3, carbsPer100g: 27, fatPer100g: 3.5, servingSizeG: 200, servingLabel: "1 plate (~200g)" },
  { name: "Khichdi", aliases: [], caloriesPer100g: 120, proteinPer100g: 4, carbsPer100g: 20, fatPer100g: 3, servingSizeG: 200, servingLabel: "1 bowl (~200g)" },
  { name: "Upma", aliases: [], caloriesPer100g: 150, proteinPer100g: 3.5, carbsPer100g: 25, fatPer100g: 4.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Poha", aliases: [], caloriesPer100g: 130, proteinPer100g: 2.5, carbsPer100g: 24, fatPer100g: 3.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Vegetable biryani", aliases: [], caloriesPer100g: 160, proteinPer100g: 3.5, carbsPer100g: 25, fatPer100g: 5.5, servingSizeG: 250, servingLabel: "1 plate (~250g)" },
  { name: "Chicken biryani", aliases: [], caloriesPer100g: 190, proteinPer100g: 9, carbsPer100g: 24, fatPer100g: 6.5, servingSizeG: 250, servingLabel: "1 plate (~250g)" },

  // Dals/legumes
  { name: "Moong dal", aliases: ["moong"], caloriesPer100g: 105, proteinPer100g: 7, carbsPer100g: 19, fatPer100g: 0.4, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Toor dal (arhar)", aliases: ["toor", "arhar"], caloriesPer100g: 120, proteinPer100g: 7, carbsPer100g: 20, fatPer100g: 1.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Chana dal", aliases: [], caloriesPer100g: 164, proteinPer100g: 8.9, carbsPer100g: 27, fatPer100g: 2.6, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Masoor dal", aliases: ["masoor"], caloriesPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Urad dal", aliases: [], caloriesPer100g: 147, proteinPer100g: 9.6, carbsPer100g: 25, fatPer100g: 0.6, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Rajma (kidney bean curry)", aliases: ["rajma"], caloriesPer100g: 140, proteinPer100g: 8, carbsPer100g: 20, fatPer100g: 3.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Chole (chickpea curry)", aliases: ["chana"], caloriesPer100g: 164, proteinPer100g: 8, carbsPer100g: 21, fatPer100g: 5.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },

  // Paneer
  { name: "Paneer (raw)", aliases: ["paneer"], caloriesPer100g: 265, proteinPer100g: 18, carbsPer100g: 3.4, fatPer100g: 20, servingSizeG: 100, servingLabel: "100g cube" },
  { name: "Paneer butter masala", aliases: [], caloriesPer100g: 220, proteinPer100g: 10, carbsPer100g: 8, fatPer100g: 16, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Palak paneer", aliases: ["palak"], caloriesPer100g: 180, proteinPer100g: 9, carbsPer100g: 7, fatPer100g: 13, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Matar paneer", aliases: [], caloriesPer100g: 170, proteinPer100g: 8.5, carbsPer100g: 9, fatPer100g: 11, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },

  // Vegetables
  { name: "Aloo gobi", aliases: ["gobhi"], caloriesPer100g: 110, proteinPer100g: 2.5, carbsPer100g: 14, fatPer100g: 5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Aloo sabzi (dry potato curry)", aliases: ["aloo"], caloriesPer100g: 130, proteinPer100g: 2.2, carbsPer100g: 18, fatPer100g: 5.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Bhindi masala", aliases: ["okra"], caloriesPer100g: 100, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 6.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Baingan bharta", aliases: ["eggplant", "brinjal"], caloriesPer100g: 95, proteinPer100g: 2, carbsPer100g: 10, fatPer100g: 5.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Aloo matar", aliases: [], caloriesPer100g: 120, proteinPer100g: 3.5, carbsPer100g: 15, fatPer100g: 5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Jeera aloo", aliases: [], caloriesPer100g: 150, proteinPer100g: 2.5, carbsPer100g: 20, fatPer100g: 7, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Mixed vegetable curry (sabzi)", aliases: [], caloriesPer100g: 90, proteinPer100g: 2.5, carbsPer100g: 10, fatPer100g: 4.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Lauki sabzi (bottle gourd curry)", aliases: ["lauki", "bottle gourd"], caloriesPer100g: 55, proteinPer100g: 1.5, carbsPer100g: 6, fatPer100g: 2.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Tinda sabzi", aliases: ["tinda"], caloriesPer100g: 50, proteinPer100g: 1.5, carbsPer100g: 5.5, fatPer100g: 2.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Karela sabzi (bitter gourd)", aliases: ["karela", "bitter gourd"], caloriesPer100g: 90, proteinPer100g: 2, carbsPer100g: 8, fatPer100g: 6, servingSizeG: 100, servingLabel: "1 bowl (~100g)" },
  { name: "Shimla mirch sabzi (capsicum)", aliases: ["shimla mirch", "capsicum", "bell pepper"], caloriesPer100g: 70, proteinPer100g: 1.5, carbsPer100g: 7, fatPer100g: 4.5, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },

  // South Indian breakfast
  { name: "Idli", aliases: [], caloriesPer100g: 130, proteinPer100g: 4, carbsPer100g: 26, fatPer100g: 0.7, servingSizeG: 80, servingLabel: "2 pieces (~80g)" },
  { name: "Dosa (plain)", aliases: [], caloriesPer100g: 168, proteinPer100g: 3.9, carbsPer100g: 28, fatPer100g: 4, servingSizeG: 90, servingLabel: "1 dosa (~90g)" },
  { name: "Masala dosa", aliases: [], caloriesPer100g: 200, proteinPer100g: 4.5, carbsPer100g: 30, fatPer100g: 7, servingSizeG: 150, servingLabel: "1 dosa (~150g)" },
  { name: "Sambar", aliases: [], caloriesPer100g: 80, proteinPer100g: 4, carbsPer100g: 12, fatPer100g: 2, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },

  // Non-veg
  { name: "Chicken curry", aliases: ["murgh", "murgi"], caloriesPer100g: 180, proteinPer100g: 15, carbsPer100g: 5, fatPer100g: 11, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Chicken tikka", aliases: [], caloriesPer100g: 190, proteinPer100g: 24, carbsPer100g: 3, fatPer100g: 9, servingSizeG: 100, servingLabel: "4-5 pieces (~100g)" },
  { name: "Tandoori chicken", aliases: [], caloriesPer100g: 180, proteinPer100g: 26, carbsPer100g: 2, fatPer100g: 8, servingSizeG: 150, servingLabel: "2 pieces (~150g)" },
  { name: "Butter chicken", aliases: [], caloriesPer100g: 250, proteinPer100g: 16, carbsPer100g: 7, fatPer100g: 18, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Keema (minced meat curry)", aliases: [], caloriesPer100g: 220, proteinPer100g: 18, carbsPer100g: 5, fatPer100g: 15, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Mutton curry (gosht)", aliases: ["gosht", "mutton"], caloriesPer100g: 215, proteinPer100g: 17, carbsPer100g: 4, fatPer100g: 15, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Egg (boiled)", aliases: ["anda"], caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, servingSizeG: 50, servingLabel: "1 egg (~50g)" },
  { name: "Egg curry", aliases: [], caloriesPer100g: 145, proteinPer100g: 9, carbsPer100g: 5, fatPer100g: 10, servingSizeG: 200, servingLabel: "2 eggs in curry (~200g)" },
  { name: "Omelette", aliases: [], caloriesPer100g: 154, proteinPer100g: 10.9, carbsPer100g: 1.6, fatPer100g: 11.7, servingSizeG: 120, servingLabel: "1 omelette, 2 eggs (~120g)" },
  { name: "Fish curry", aliases: [], caloriesPer100g: 140, proteinPer100g: 16, carbsPer100g: 4, fatPer100g: 7, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Fried fish", aliases: [], caloriesPer100g: 210, proteinPer100g: 20, carbsPer100g: 6, fatPer100g: 12, servingSizeG: 100, servingLabel: "1 piece (~100g)" },

  // Dairy & condiments
  { name: "Curd (dahi)", aliases: ["dahi"], caloriesPer100g: 60, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Buttermilk (chaas)", aliases: ["chaas", "mattha"], caloriesPer100g: 40, proteinPer100g: 1.5, carbsPer100g: 4, fatPer100g: 2, servingSizeG: 200, servingLabel: "1 glass (~200ml)" },
  { name: "Lassi (sweet)", aliases: ["lassi"], caloriesPer100g: 110, proteinPer100g: 3, carbsPer100g: 15, fatPer100g: 4, servingSizeG: 200, servingLabel: "1 glass (~200ml)" },
  { name: "Kheer", aliases: [], caloriesPer100g: 130, proteinPer100g: 3.5, carbsPer100g: 20, fatPer100g: 4, servingSizeG: 150, servingLabel: "1 bowl (~150g)" },
  { name: "Raita", aliases: [], caloriesPer100g: 65, proteinPer100g: 2.8, carbsPer100g: 5, fatPer100g: 3.8, servingSizeG: 100, servingLabel: "1 bowl (~100g)" },
  { name: "Milk (whole)", aliases: [], caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, servingSizeG: 200, servingLabel: "1 glass (~200ml)" },
  { name: "Papad (roasted)", aliases: [], caloriesPer100g: 330, proteinPer100g: 20, carbsPer100g: 55, fatPer100g: 3, servingSizeG: 10, servingLabel: "1 piece (~10g)" },
  { name: "Pickle (achar)", aliases: [], caloriesPer100g: 250, proteinPer100g: 1.5, carbsPer100g: 15, fatPer100g: 20, servingSizeG: 15, servingLabel: "1 tbsp (~15g)" },
  { name: "Ghee", aliases: [], caloriesPer100g: 900, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, servingSizeG: 5, servingLabel: "1 tsp (~5g)" },
  { name: "Butter", aliases: [], caloriesPer100g: 717, proteinPer100g: 0.9, carbsPer100g: 0.1, fatPer100g: 81, servingSizeG: 5, servingLabel: "1 tsp (~5g)" },

  // Snacks
  { name: "Samosa", aliases: [], caloriesPer100g: 260, proteinPer100g: 4, carbsPer100g: 30, fatPer100g: 14, servingSizeG: 60, servingLabel: "1 piece (~60g)" },
  { name: "Pakora (vegetable fritters)", aliases: [], caloriesPer100g: 280, proteinPer100g: 6, carbsPer100g: 25, fatPer100g: 18, servingSizeG: 80, servingLabel: "4-5 pieces (~80g)" },
  { name: "Vada (medu vada)", aliases: ["vada"], caloriesPer100g: 190, proteinPer100g: 8, carbsPer100g: 18, fatPer100g: 10, servingSizeG: 50, servingLabel: "1 piece (~50g)" },
  { name: "Bhel puri", aliases: [], caloriesPer100g: 150, proteinPer100g: 3.5, carbsPer100g: 28, fatPer100g: 3, servingSizeG: 150, servingLabel: "1 plate (~150g)" },
  { name: "Pav bhaji", aliases: [], caloriesPer100g: 180, proteinPer100g: 4, carbsPer100g: 22, fatPer100g: 8, servingSizeG: 250, servingLabel: "1 plate with pav (~250g)" },
  { name: "Roasted chana", aliases: [], caloriesPer100g: 364, proteinPer100g: 19, carbsPer100g: 61, fatPer100g: 6, servingSizeG: 30, servingLabel: "1 handful (~30g)" },
  { name: "Peanuts (roasted)", aliases: [], caloriesPer100g: 567, proteinPer100g: 26, carbsPer100g: 16, fatPer100g: 49, servingSizeG: 30, servingLabel: "1 handful (~30g)" },
  { name: "Sprouts salad", aliases: [], caloriesPer100g: 105, proteinPer100g: 7, carbsPer100g: 19, fatPer100g: 0.5, servingSizeG: 100, servingLabel: "1 bowl (~100g)" },

  // Fruits
  { name: "Banana", aliases: [], caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, servingSizeG: 120, servingLabel: "1 medium (~120g)" },
  { name: "Apple", aliases: [], caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, servingSizeG: 150, servingLabel: "1 medium (~150g)" },
  { name: "Mango", aliases: ["aam"], caloriesPer100g: 60, proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, servingSizeG: 150, servingLabel: "1 medium (~150g)" },
  { name: "Papaya", aliases: ["papita"], caloriesPer100g: 43, proteinPer100g: 0.5, carbsPer100g: 11, fatPer100g: 0.3, servingSizeG: 150, servingLabel: "1 cup cubed (~150g)" },
  { name: "Guava", aliases: ["amrud"], caloriesPer100g: 68, proteinPer100g: 2.6, carbsPer100g: 14, fatPer100g: 1, servingSizeG: 100, servingLabel: "1 medium (~100g)" },
  { name: "Chikoo (sapota)", aliases: ["chikoo", "sapota"], caloriesPer100g: 83, proteinPer100g: 0.4, carbsPer100g: 20, fatPer100g: 1.1, servingSizeG: 100, servingLabel: "1 medium (~100g)" },

  // Beverages
  { name: "Masala chai", aliases: ["chai", "tea"], caloriesPer100g: 55, proteinPer100g: 1.5, carbsPer100g: 8, fatPer100g: 1.8, servingSizeG: 150, servingLabel: "1 cup (~150ml)" },
  { name: "Filter coffee", aliases: ["coffee"], caloriesPer100g: 50, proteinPer100g: 1.3, carbsPer100g: 7, fatPer100g: 1.5, servingSizeG: 150, servingLabel: "1 cup (~150ml)" },
  { name: "Black coffee", aliases: [], caloriesPer100g: 2, proteinPer100g: 0.1, carbsPer100g: 0.3, fatPer100g: 0, servingSizeG: 150, servingLabel: "1 cup (~150ml)" },
  { name: "Nimbu pani (lemonade)", aliases: ["nimbu pani", "lemonade"], caloriesPer100g: 35, proteinPer100g: 0, carbsPer100g: 9, fatPer100g: 0, servingSizeG: 200, servingLabel: "1 glass (~200ml)" },
];

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
