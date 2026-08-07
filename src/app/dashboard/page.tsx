import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  calculateBMI,
  bmiCategory,
  calculateBMR,
  calculateTDEE,
  calculateCalorieGoal,
  calculateMacroTargets,
  getTodayRange,
  isProfileComplete,
} from "@/lib/nutrition";
import MacroPlate from "./MacroPlate";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!isProfileComplete(user)) {
    return (
      <div className="w-full max-w-xl mx-auto px-6 py-12">
        <h1 className="font-heading text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-sm text-muted mb-6">
          Finish setting up your profile to see your BMI, calorie goal, and macro
          targets.
        </p>
        <Link
          href="/profile"
          className="inline-block rounded-full bg-primary text-background font-medium h-11 leading-[2.75rem] px-6 hover:opacity-90 transition-opacity"
        >
          Complete profile
        </Link>
      </div>
    );
  }

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

  const todaysEntries = await prisma.foodEntry.findMany({
    where: {
      userId: user.id,
      consumedAt: { gte: start, lt: end },
    },
    include: { foodItem: true },
  });

  const consumed = todaysEntries.reduce(
    (acc, entry) => {
      const factor = entry.grams / 100;
      acc.calories += entry.foodItem.caloriesPer100g * factor;
      acc.protein += entry.foodItem.proteinPer100g * factor;
      acc.carbs += entry.foodItem.carbsPer100g * factor;
      acc.fat += entry.foodItem.fatPer100g * factor;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-heading text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="font-heading italic text-muted mb-8">
        Today&apos;s progress toward your goals.
      </p>

      <div className="flex flex-col sm:flex-row gap-6 items-stretch sm:items-start">
        <div className="rounded-xl border border-border bg-surface p-6 sm:flex-1">
          <MacroPlate
            calories={{ consumed: consumed.calories, goal: calorieGoal }}
            protein={{ consumed: consumed.protein, target: macroTargets.proteinG }}
            carbs={{ consumed: consumed.carbs, target: macroTargets.carbsG }}
            fat={{ consumed: consumed.fat, target: macroTargets.fatG }}
          />
        </div>

        <div className="rounded-xl bg-stat-surface p-6 sm:w-48 shrink-0 flex flex-col">
          <span className="text-sm text-muted mb-1">BMI</span>
          <span className="font-heading text-3xl font-semibold">{bmi.toFixed(1)}</span>
          <span
            className={`text-sm mt-1 ${category === "Normal" ? "font-medium" : "text-muted"}`}
            style={category === "Normal" ? { color: "var(--success)" } : undefined}
          >
            {category}
          </span>
        </div>
      </div>
    </div>
  );
}
