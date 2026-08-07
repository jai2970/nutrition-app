import type { ActivityLevel, Goal, Sex } from "@/generated/prisma/enums";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
};

// Standard ~0.5kg/week deficit or surplus.
const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  LOSE: -500,
  MAINTAIN: 0,
  GAIN: 500,
};

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const { weightKg, heightCm, age, sex } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "MALE" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateCalorieGoal(tdee: number, goal: Goal): number {
  return tdee + GOAL_CALORIE_ADJUSTMENT[goal];
}

export function calculateMacroTargets(weightKg: number, calorieGoal: number) {
  const proteinG = weightKg * 1.6;
  const proteinCal = proteinG * 4;
  const fatCal = calorieGoal * 0.25;
  const fatG = fatCal / 9;
  const carbsCal = Math.max(calorieGoal - proteinCal - fatCal, 0);
  const carbsG = carbsCal / 4;
  return { proteinG, fatG, carbsG };
}

type ProfileFields = {
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
};

type CompleteProfileFields = {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
};

export function isProfileComplete<T extends ProfileFields>(
  user: T,
): user is T & CompleteProfileFields {
  return (
    user.age != null &&
    user.sex != null &&
    user.heightCm != null &&
    user.weightKg != null &&
    user.activityLevel != null &&
    user.goal != null
  );
}

export function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
