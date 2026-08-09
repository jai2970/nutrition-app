import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  calculateBMI,
  bmiCategory,
  calculateBMR,
  calculateTDEE,
  calculateCalorieGoal,
  calculateMacroTargets,
  getGreetingIST,
  getTodayRange,
  isProfileComplete,
} from "@/lib/nutrition";
import { Meal } from "@/generated/prisma/enums";
import MacroPlate from "./MacroPlate";
import Greeting from "./Greeting";
import ProfileUpdatedToast from "./ProfileUpdatedToast";
import BmiScale, { getBmiZoneColor } from "@/app/BmiScale";
import LogMealCard from "@/app/log/LogMealCard";
import MealEntryList from "@/app/log/MealEntryList";

// Nothing here touches a Next.js "dynamic API" (cookies/headers/searchParams),
// so without this Next would statically prerender the page at build time —
// freezing the time-of-day greeting and the getTodayRange() day boundary at
// whatever they were during the last deploy.
export const dynamic = "force-dynamic";

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

function entryCalories(entry: {
  grams: number;
  foodItem: { caloriesPer100g: number } | null;
  customCalories: number | null;
}): number {
  return entry.foodItem
    ? (entry.foodItem.caloriesPer100g * entry.grams) / 100
    : (entry.customCalories ?? 0);
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  // proxy.ts already redirects signed-out visitors before they reach this
  // page — this is a defense-in-depth check for the Server Component itself.
  if (!user) {
    redirect("/login");
  }

  if (!isProfileComplete(user)) {
    redirect("/profile");
  }

  const { updated } = await searchParams;

  const bmi = calculateBMI(user.weightKg, user.heightCm);
  const category = bmiCategory(bmi);
  const bmr = calculateBMR({
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    age: user.age,
    sex: user.sex,
  });
  const tdee = calculateTDEE(bmr, user.activityLevel);
  const calorieGoal = calculateCalorieGoal(tdee, user.goal);
  const macroTargets = calculateMacroTargets(user.weightKg, calorieGoal);

  const { start, end } = getTodayRange();

  const [foods, todaysEntries] = await Promise.all([
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    prisma.foodEntry.findMany({
      where: { userId: user.id, consumedAt: { gte: start, lt: end } },
      include: { foodItem: true },
      orderBy: { consumedAt: "asc" },
    }),
  ]);

  const consumed = todaysEntries.reduce(
    (acc, entry) => {
      if (entry.foodItem) {
        const factor = entry.grams / 100;
        acc.calories += entry.foodItem.caloriesPer100g * factor;
        acc.protein += entry.foodItem.proteinPer100g * factor;
        acc.carbs += entry.foodItem.carbsPer100g * factor;
        acc.fat += entry.foodItem.fatPer100g * factor;
      } else {
        acc.calories += entry.customCalories ?? 0;
        acc.protein += entry.customProtein ?? 0;
        acc.carbs += entry.customCarbs ?? 0;
        acc.fat += entry.customFat ?? 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const entriesByMeal = MEAL_ORDER.reduce(
    (acc, meal) => {
      acc[meal] = todaysEntries.filter((e) => e.meal === meal);
      return acc;
    },
    {} as Record<Meal, typeof todaysEntries>,
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8 sm:py-12">
      {updated === "1" && <ProfileUpdatedToast />}

      <div className="relative mb-6">
        <div className="rounded-[20px] shadow-card bg-hero text-hero-foreground px-6 sm:px-8 pt-8 pb-20">
          <Greeting name={user.name} initialGreeting={getGreetingIST()} />
          <p className="text-hero-muted mb-6">
            You&apos;re at {Math.round(consumed.calories).toLocaleString()} of{" "}
            {Math.round(calorieGoal).toLocaleString()} kcal today
          </p>
          <a
            href="#log-a-meal"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-background font-semibold h-11 px-5 hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Log a meal <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className="relative -mt-14 mx-2 sm:mx-4 rounded-[20px] bg-surface border border-border shadow-card p-6">
          <MacroPlate
            calories={{ consumed: consumed.calories, goal: calorieGoal }}
            protein={{ consumed: consumed.protein, target: macroTargets.proteinG }}
            carbs={{ consumed: consumed.carbs, target: macroTargets.carbsG }}
            fat={{ consumed: consumed.fat, target: macroTargets.fatG }}
          />
        </div>
      </div>

      <div className="mx-2 sm:mx-4 mb-10 rounded-[20px] border border-border bg-surface shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">BMI</span>
          <span className="text-sm font-semibold" style={{ color: getBmiZoneColor(category) }}>
            {bmi.toFixed(1)} — {category}
          </span>
        </div>
        <BmiScale bmi={bmi} compact />
      </div>

      <section id="log-a-meal" className="scroll-mt-6">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase mb-3">
          Log a meal
        </h2>
        <LogMealCard foods={foods} />
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase mb-4">
          Today
        </h2>

        <div className="flex flex-col gap-7">
          {MEAL_ORDER.map((meal) => {
            const entries = entriesByMeal[meal];
            const mealCalories = entries.reduce((sum, e) => sum + entryCalories(e), 0);

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
                      foodItem: e.foodItem
                        ? { name: e.foodItem.name, caloriesPer100g: e.foodItem.caloriesPer100g }
                        : null,
                      customFoodName: e.customFoodName,
                      customCalories: e.customCalories,
                    }))}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
