import type { DietType } from "@/generated/prisma/enums";

type Food = { name: string; serving: string; proteinG: number };

// Typical protein per common Indian serving — rough kitchen numbers, only
// used to rank suggestions against the remaining gap, never shown as values.
const VEG: Food[] = [
  { name: "paneer", serving: "100g", proteinG: 18 },
  { name: "soya chunks", serving: "30g dry", proteinG: 15 },
  { name: "dal", serving: "1 katori", proteinG: 9 },
  { name: "curd", serving: "1 bowl", proteinG: 8 },
  { name: "sprouts", serving: "1 cup", proteinG: 7 },
];
const EGG: Food[] = [
  { name: "eggs", serving: "2 eggs", proteinG: 12 },
  { name: "egg whites", serving: "3 whites", proteinG: 11 },
];
const NON_VEG: Food[] = [
  { name: "chicken breast", serving: "100g", proteinG: 31 },
  { name: "fish", serving: "100g", proteinG: 22 },
  ...EGG,
];

function pool(diet: DietType | null): Food[] {
  if (diet === "NON_VEGETARIAN") return [...NON_VEG, ...VEG];
  if (diet === "EGGETARIAN") return [...EGG, ...VEG];
  return VEG;
}

// Pick up to three foods that suit the size of the gap: big gaps lean on
// dense foods, small gaps on light everyday ones.
export function suggestProteinFoods(gapG: number, diet: DietType | null): string[] {
  const foods = pool(diet);
  const target = gapG >= 40 ? 24 : gapG >= 20 ? 15 : 8;
  return [...foods]
    .sort((a, b) => Math.abs(a.proteinG - target) - Math.abs(b.proteinG - target))
    .slice(0, 3)
    .map((f) => f.name);
}

function joinOr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

export type Insight = { tone: "empty" | "gap" | "done" | "over"; text: string };

export function getInsight({
  protein,
  proteinTarget,
  calories,
  calorieGoal,
  diet,
}: {
  protein: number;
  proteinTarget: number;
  calories: number;
  calorieGoal: number;
  diet: DietType | null;
}): Insight {
  const gap = Math.round(proteinTarget - protein);
  const kcalLeft = Math.round(calorieGoal - calories);

  if (calories < 1) {
    const foods = joinOr(suggestProteinFoods(gap, diet));
    return {
      tone: "empty",
      text: `Aim for ${Math.round(proteinTarget)}g protein today. ${capitalize(foods)} make an easy start.`,
    };
  }

  if (kcalLeft < -Math.max(100, calorieGoal * 0.05)) {
    return {
      tone: "over",
      text: `You're ${-kcalLeft} kcal over today. Keep the next meal light and protein-led.`,
    };
  }

  if (gap >= 5) {
    const foods = joinOr(suggestProteinFoods(gap, diet));
    const verb = gap > 45 ? "would get you most of the way" : "would close it";
    return {
      tone: "gap",
      text: `You're ${gap}g short on protein. ${capitalize(foods)} ${verb}.`,
    };
  }

  return {
    tone: "done",
    text:
      kcalLeft > 0
        ? `Protein target hit. ${kcalLeft} kcal left, so keep it light.`
        : "Protein target hit and calories on point. Nicely done.",
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
