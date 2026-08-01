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
} from "@/lib/nutrition";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (
    user.age == null ||
    user.sex == null ||
    user.heightCm == null ||
    user.weightKg == null ||
    user.activityLevel == null ||
    user.goal == null
  ) {
    return (
      <div className="w-full max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Finish setting up your profile to see your BMI, calorie goal, and macro
          targets.
        </p>
        <Link
          href="/profile"
          className="inline-block rounded-full bg-foreground text-background font-medium h-11 leading-[2.75rem] px-6 hover:opacity-90 transition-opacity"
        >
          Complete profile
        </Link>
      </div>
    );
  }

  const bmi = calculateBMI(user.weightKg, user.heightCm);
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
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {"Today's progress toward your goals."}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="BMI" value={bmi.toFixed(1)} subtext={bmiCategory(bmi)} />
        <StatCard
          label="Calories today"
          value={`${Math.round(consumed.calories)}`}
          subtext={`of ${Math.round(calorieGoal)} kcal goal`}
        />
      </div>

      <h2 className="text-lg font-semibold mb-4">Macros</h2>
      <div className="flex flex-col gap-5">
        <MacroBar
          label="Protein"
          consumedG={consumed.protein}
          targetG={macroTargets.proteinG}
        />
        <MacroBar label="Carbs" consumedG={consumed.carbs} targetG={macroTargets.carbsG} />
        <MacroBar label="Fat" consumedG={consumed.fat} targetG={macroTargets.fatG} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] p-5">
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{label}</div>
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{subtext}</div>
    </div>
  );
}

function MacroBar({
  label,
  consumedG,
  targetG,
}: {
  label: string;
  consumedG: number;
  targetG: number;
}) {
  const pct = targetG > 0 ? Math.min((consumedG / targetG) * 100, 100) : 0;
  const over = consumedG > targetG;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {Math.round(consumedG)}g / {Math.round(targetG)}g
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-black/[.06] dark:bg-white/[.1] overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] ${
            over ? "bg-red-500" : "bg-foreground"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
