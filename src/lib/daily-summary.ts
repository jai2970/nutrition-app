import { prisma } from "@/lib/prisma";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieGoal,
  calculateMacroTargets,
  getTodayRange,
} from "@/lib/nutrition";
import type { ActivityLevel, Goal, Sex } from "@/generated/prisma/enums";

type CompleteProfile = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
};

export type ConsumedMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type EntryLike = {
  grams: number;
  foodItem: {
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  } | null;
  customCalories: number | null;
  customProtein: number | null;
  customCarbs: number | null;
  customFat: number | null;
};

// Shared by the dashboard (rendering today's totals) and the diet advisor
// (grounding its answers in what the user has actually eaten today) — each
// FoodEntry is either matched to a FoodItem (scaled by grams/100) or an
// AI-estimated custom entry (already totals for the whole logged portion).
export function sumConsumedMacros(entries: EntryLike[]): ConsumedMacros {
  return entries.reduce(
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
}

export function calculateTargets(user: CompleteProfile) {
  const bmr = calculateBMR({
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    age: user.age,
    sex: user.sex,
  });
  const tdee = calculateTDEE(bmr, user.activityLevel);
  const calorieGoal = calculateCalorieGoal(tdee, user.goal);
  const macroTargets = calculateMacroTargets(user.weightKg, calorieGoal);
  return { calorieGoal, macroTargets };
}

export async function getTodaysConsumedMacros(userId: string) {
  const { start, end } = getTodayRange();
  const entries = await prisma.foodEntry.findMany({
    where: { userId, consumedAt: { gte: start, lt: end } },
    include: { foodItem: true },
    orderBy: { consumedAt: "asc" },
  });
  return { entries, consumed: sumConsumedMacros(entries) };
}

export type DailyMacroTrend = ConsumedMacros & { date: string };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Last 7 days including today, oldest first — every day gets an entry (0s
// for days with no logged meals) so the trends chart always has a fixed
// 7-point x-axis rather than gaps.
export async function getWeeklyMacroTrends(userId: string): Promise<DailyMacroTrend[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rangeStart = new Date(todayStart);
  rangeStart.setDate(rangeStart.getDate() - 6);

  const rangeEnd = new Date(todayStart);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const entries = await prisma.foodEntry.findMany({
    where: { userId, consumedAt: { gte: rangeStart, lt: rangeEnd } },
    include: { foodItem: true },
  });

  const dayKeys: number[] = [];
  const entriesByDay = new Map<number, typeof entries>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = d.getTime();
    dayKeys.push(key);
    entriesByDay.set(key, []);
  }

  for (const entry of entries) {
    const d = new Date(entry.consumedAt);
    d.setHours(0, 0, 0, 0);
    entriesByDay.get(d.getTime())?.push(entry);
  }

  return dayKeys.map((key) => ({
    date: DAY_LABELS[new Date(key).getDay()],
    ...sumConsumedMacros(entriesByDay.get(key) ?? []),
  }));
}
