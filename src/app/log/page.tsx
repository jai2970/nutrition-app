import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getTodayRange } from "@/lib/nutrition";
import { Meal } from "@/generated/prisma/enums";
import LogMealCard from "./LogMealCard";
import MealEntryList from "./MealEntryList";

const MEAL_ORDER: Meal[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
const MEAL_LABELS: Record<Meal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACKS: "Snacks",
};
const MEAL_EMPTY_COPY: Record<Meal, string> = {
  BREAKFAST: "Start the day — log your first bite.",
  LUNCH: "What's for lunch?",
  DINNER: "Add dinner when you're ready.",
  SNACKS: "Snacks count too.",
};

export default async function FoodLogPage() {
  const user = await getCurrentUser();
  const { start, end } = getTodayRange();

  const [foods, todaysEntries] = await Promise.all([
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    prisma.foodEntry.findMany({
      where: { userId: user.id, consumedAt: { gte: start, lt: end } },
      include: { foodItem: true },
      orderBy: { consumedAt: "asc" },
    }),
  ]);

  const entriesByMeal = MEAL_ORDER.reduce(
    (acc, meal) => {
      acc[meal] = todaysEntries.filter((e) => e.meal === meal);
      return acc;
    },
    {} as Record<Meal, typeof todaysEntries>,
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-heading text-2xl font-semibold mb-1">Food log</h1>
      <p className="text-sm text-muted mb-8">
        Describe, photograph, or search for what you ate — add it to today&apos;s log.
      </p>

      <LogMealCard foods={foods} />

      <h2 className="font-heading text-xl font-semibold mt-12 mb-5">Today</h2>

      <div className="flex flex-col gap-7">
        {MEAL_ORDER.map((meal) => {
          const entries = entriesByMeal[meal];
          const mealCalories = entries.reduce(
            (sum, e) => sum + (e.foodItem.caloriesPer100g * e.grams) / 100,
            0,
          );

          return (
            <div key={meal}>
              <h3 className="text-sm font-semibold mb-2">
                {MEAL_LABELS[meal]}
                {entries.length > 0 && ` · ${Math.round(mealCalories)} kcal`}
              </h3>

              {entries.length === 0 ? (
                <p className="text-sm text-muted italic">{MEAL_EMPTY_COPY[meal]}</p>
              ) : (
                <MealEntryList
                  entries={entries.map((e) => ({
                    id: e.id,
                    grams: e.grams,
                    foodItem: {
                      name: e.foodItem.name,
                      caloriesPer100g: e.foodItem.caloriesPer100g,
                    },
                  }))}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
