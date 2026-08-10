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
