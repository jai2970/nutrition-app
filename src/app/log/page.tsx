import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getTodayRange } from "@/lib/nutrition";
import { Meal } from "@/generated/prisma/enums";
import FoodLogClient from "./FoodLogClient";
import { deleteFoodEntry } from "./actions";

const MEAL_ORDER: Meal[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
const MEAL_LABELS: Record<Meal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACKS: "Snacks",
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
      <h1 className="text-2xl font-semibold mb-1">Food log</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Search for a food, enter how much you ate, and add it to today&apos;s log.
      </p>

      <FoodLogClient foods={foods} />

      <h2 className="text-lg font-semibold mt-10 mb-4">Today</h2>

      <div className="flex flex-col gap-6">
        {MEAL_ORDER.map((meal) => {
          const entries = entriesByMeal[meal];
          const mealCalories = entries.reduce(
            (sum, e) => sum + (e.foodItem.caloriesPer100g * e.grams) / 100,
            0,
          );

          return (
            <div key={meal}>
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="font-medium">{MEAL_LABELS[meal]}</h3>
                {entries.length > 0 && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {Math.round(mealCalories)} kcal
                  </span>
                )}
              </div>

              {entries.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Nothing logged yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 text-sm rounded-lg bg-black/[.03] dark:bg-white/[.06] px-3 py-2"
                    >
                      <span>
                        {entry.foodItem.name}{" "}
                        <span className="text-zinc-500 dark:text-zinc-400">
                          ({Math.round(entry.grams)}g)
                        </span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {Math.round((entry.foodItem.caloriesPer100g * entry.grams) / 100)}{" "}
                          kcal
                        </span>
                        <form action={deleteFoodEntry}>
                          <input type="hidden" name="entryId" value={entry.id} />
                          <button
                            type="submit"
                            className="text-zinc-500 dark:text-zinc-400 hover:opacity-70"
                            aria-label={`Remove ${entry.foodItem.name}`}
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
