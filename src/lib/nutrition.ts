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

// Encouraging, non-clinical framing for the onboarding/dashboard BMI copy —
// keyed off the same categories as bmiCategory() above.
export function bmiInterpretation(category: string): string {
  switch (category) {
    case "Underweight":
      return "Your BMI suggests you're underweight — let's focus on calorie-dense, protein-rich meals.";
    case "Overweight":
      return "Your BMI is in the overweight range — let's track your intake to find the right balance.";
    case "Obese":
      return "Your BMI is in a higher range — tracking your meals is a great first step toward a healthier balance.";
    default:
      return "You're in the healthy range.";
  }
}

// Most Indian users think in feet/inches rather than cm — these let the
// profile form accept either while the database keeps storing plain cm.
export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
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

export function getGreetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Server-rendered fallback for the initial paint, before the client can
// determine the visitor's actual local time — hardcoded to IST since the
// server's own clock (US-East on Vercel) has nothing to do with the
// visitor's timezone, and the target audience is India.
export function getGreetingIST(date: Date = new Date()): string {
  const istHour = new Date(date.getTime() + 5.5 * 60 * 60 * 1000).getUTCHours();
  return getGreetingForHour(istHour);
}

// KNOWN SIMPLIFICATION: day boundaries are hardcoded to IST (Asia/Kolkata,
// UTC+5:30, no DST) rather than stored per user. The server clock is UTC on
// Vercel, so without this "today" would roll over at 5:30 am IST. The target
// audience is India; supporting other timezones would mean a per-user
// timezone field (or the client sending its day range) and replacing this
// constant — every day-boundary calculation goes through istDayStart().
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

// The instant (as a Date) at which the IST calendar day containing `date`
// began, i.e. 00:00 IST.
export function istDayStart(date: Date = new Date()): Date {
  const istMs = date.getTime() + IST_OFFSET_MS;
  return new Date(Math.floor(istMs / DAY_MS) * DAY_MS - IST_OFFSET_MS);
}

export function getTodayRange(now: Date = new Date()) {
  const start = istDayStart(now);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}
