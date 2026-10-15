import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  calculateBMI,
  bmiCategory,
  getGreetingIST,
  isProfileComplete,
} from "@/lib/nutrition";
import {
  calculateTargets,
  getTodaysConsumedMacros,
  getWeeklyHistory,
  toHistoryEntry,
} from "@/lib/daily-summary";
import { getInsight } from "@/lib/insight";
import { Meal } from "@/generated/prisma/enums";
import ProteinHero from "./ProteinHero";
import WeekStrip from "./WeekStrip";
import Greeting from "./Greeting";
import ProfileUpdatedToast from "./ProfileUpdatedToast";
import { getBmiZoneColor } from "@/app/BmiScale";
import WeeklyTrends from "./WeeklyTrends";
import LogMealCard from "@/app/log/LogMealCard";
import MealEntryList from "@/app/log/MealEntryList";
import DietAdvisorChat from "./DietAdvisorChat";

export const metadata: Metadata = { title: "Today" };

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
  const { calorieGoal, macroTargets } = calculateTargets(user);

  const [foods, { entries: todaysEntries, consumed }, weekHistory] = await Promise.all([
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    getTodaysConsumedMacros(user.id),
    getWeeklyHistory(user.id),
  ]);

  const weeklyTrends = weekHistory.map((d) => ({ date: d.weekday, ...d.totals }));
  const todaysRows = todaysEntries.map(toHistoryEntry);
  const insight = getInsight({
    protein: consumed.protein,
    proteinTarget: macroTargets.proteinG,
    calories: consumed.calories,
    calorieGoal,
    diet: user.dietType,
  });

  const rowsByMeal = MEAL_ORDER.reduce(
    (acc, meal) => {
      acc[meal] = todaysRows.filter((r) => r.meal === meal);
      return acc;
    },
    {} as Record<Meal, typeof todaysRows>,
  );

  return (
    <>
      <div className="w-full max-w-5xl mx-auto px-6 py-8 sm:py-12">
        {updated === "1" && <ProfileUpdatedToast />}

        <div className="grid grid-cols-1 gap-8 lg:gap-12 lg:grid-cols-2 items-start">
          <div className="flex flex-col gap-8 lg:sticky lg:top-8">
            <Greeting name={user.name} initialGreeting={getGreetingIST()} />
            <ProteinHero
              protein={{ consumed: consumed.protein, target: macroTargets.proteinG }}
              calories={{ consumed: consumed.calories, goal: calorieGoal }}
              carbs={{ consumed: consumed.carbs, target: macroTargets.carbsG }}
              fat={{ consumed: consumed.fat, target: macroTargets.fatG }}
              insight={insight}
            />
            <WeekStrip days={weekHistory} proteinTargetG={macroTargets.proteinG} />
          </div>

          <div className="flex flex-col gap-10">
            <section aria-labelledby="today-heading">
              <div className="flex items-baseline justify-between mb-4">
                <h2 id="today-heading" className="font-heading text-[22px] leading-7 font-semibold">
                  Today
                </h2>
                <span className="text-xs text-muted">Protein · kcal</span>
              </div>

              <div className="flex flex-col gap-6">
                {MEAL_ORDER.map((meal) => {
                  const rows = rowsByMeal[meal];
                  const mealProtein = rows.reduce((sum, r) => sum + r.protein, 0);
                  const mealCalories = rows.reduce((sum, r) => sum + r.calories, 0);

                  return (
                    <div key={meal}>
                      <h3 className="flex items-baseline justify-between text-xs font-semibold tracking-[0.06em] uppercase text-muted mb-2">
                        <span>{MEAL_LABELS[meal]}</span>
                        {rows.length > 0 && (
                          <span className="normal-case tracking-normal font-medium tabular-nums">
                            {Math.round(mealProtein)}g · {Math.round(mealCalories)} kcal
                          </span>
                        )}
                      </h3>

                      {rows.length === 0 ? (
                        <a
                          href="#log-a-meal"
                          className="flex items-center min-h-12 rounded-2xl border border-dashed border-border px-4 text-sm text-muted hover:border-primary hover:text-primary-ink transition-colors"
                        >
                          {MEAL_EMPTY_COPY[meal]}
                        </a>
                      ) : (
                        <MealEntryList entries={rows} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="log-a-meal" className="scroll-mt-6">
              <h2 className="font-heading text-[22px] leading-7 font-semibold mb-4">Log a meal</h2>
              <LogMealCard foods={foods} />
            </section>

            <details className="group rounded-[20px] border border-border bg-surface shadow-card">
              <summary className="flex items-center justify-between cursor-pointer list-none min-h-14 px-5 sm:px-6 text-sm font-semibold">
                Weekly trends
                <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">
                  ▾
                </span>
              </summary>
              <div className="px-1 pb-2">
                <WeeklyTrends data={weeklyTrends} proteinTargetG={macroTargets.proteinG} />
              </div>
            </details>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4">
              <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">BMI</span>
              <span className="text-sm font-semibold" style={{ color: getBmiZoneColor(category) }}>
                {bmi.toFixed(1)} — {category}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DietAdvisorChat />
    </>
  );
}
