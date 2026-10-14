import { prisma } from "@/lib/prisma";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieGoal,
  calculateMacroTargets,
  getTodayRange,
} from "@/lib/nutrition";
import type { ActivityLevel, Goal, Meal, Sex } from "@/generated/prisma/enums";

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

export type HistoryEntry = {
  id: string;
  name: string;
  isEstimate: boolean;
  grams: number;
  meal: Meal;
  consumedAt: string;
  calories: number;
  protein: number;
};

export type DayHistory = {
  dateKey: string;
  weekday: string;
  dayNum: number;
  label: string;
  isToday: boolean;
  totals: ConsumedMacros;
  entries: HistoryEntry[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type EntryRow = Omit<EntryLike, "foodItem"> & {
  id: string;
  meal: Meal;
  consumedAt: Date;
  customFoodName: string | null;
  foodItem: (NonNullable<EntryLike["foodItem"]> & { name: string }) | null;
};

export function toHistoryEntry(entry: EntryRow): HistoryEntry {
  const macros = sumConsumedMacros([entry]);
  return {
    id: entry.id,
    name: entry.foodItem?.name ?? entry.customFoodName ?? "Unknown food",
    isEstimate: !entry.foodItem,
    grams: entry.grams,
    meal: entry.meal,
    consumedAt: entry.consumedAt.toISOString(),
    calories: macros.calories,
    protein: macros.protein,
  };
}

// Last 7 days including today, oldest first — every day gets an entry (empty
// for days with no logged meals) so the week strip always has seven tiles.
// Feeds both the strip (with tap-to-open day detail) and the trends chart.
export async function getWeeklyHistory(userId: string): Promise<DayHistory[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rangeStart = new Date(todayStart);
  rangeStart.setDate(rangeStart.getDate() - 6);

  const rangeEnd = new Date(todayStart);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const entries = await prisma.foodEntry.findMany({
    where: { userId, consumedAt: { gte: rangeStart, lt: rangeEnd } },
    include: { foodItem: true },
    orderBy: { consumedAt: "asc" },
  });

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    days.push({ date: d, entries: [] as typeof entries });
  }

  for (const entry of entries) {
    const d = new Date(entry.consumedAt);
    d.setHours(0, 0, 0, 0);
    days.find((day) => day.date.getTime() === d.getTime())?.entries.push(entry);
  }

  return days.map(({ date, entries: dayEntries }) => {
    const weekday = DAY_LABELS[date.getDay()];
    return {
      dateKey: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      weekday,
      dayNum: date.getDate(),
      label: `${weekday} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`,
      isToday: date.getTime() === todayStart.getTime(),
      totals: sumConsumedMacros(dayEntries),
      entries: dayEntries.map(toHistoryEntry),
    };
  });
}
