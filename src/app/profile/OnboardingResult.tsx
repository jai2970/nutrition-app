import Link from "next/link";
import BmiScale, { getBmiZoneColor } from "@/app/BmiScale";
import { bmiInterpretation } from "@/lib/nutrition";
import type { ProfileFormState } from "./saveProfile";

// The post-onboarding "welcome moment" — shown once, right after whichever
// flow (wizard or, historically, the plain form) completes a profile for
// the first time. Plain presentational component, no hooks of its own.
export default function OnboardingResult({ state }: { state: ProfileFormState }) {
  const bmi = state.bmi ?? 0;
  const category = state.bmiCategory ?? "";
  const zoneColor = getBmiZoneColor(category);

  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-card p-6 sm:p-8 flex flex-col gap-7 animate-fade-in">
      <div className="text-center">
        <p className="text-sm text-muted mb-1">Your BMI</p>
        <p className="font-heading text-5xl sm:text-6xl font-bold leading-none mb-2">
          {bmi.toFixed(1)}
        </p>
        <p className="text-base font-semibold" style={{ color: zoneColor }}>
          {category}
        </p>
      </div>

      <BmiScale bmi={bmi} />

      <p className="text-center text-sm text-muted -mt-2">{bmiInterpretation(category)}</p>

      <div className="border-t border-border pt-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase mb-3">
          Based on your profile, here&apos;s what we recommend daily
        </p>
        <div className="grid grid-cols-2 gap-3">
          <MacroStat label="Calories" value={Math.round(state.calorieGoal ?? 0)} unit="kcal" />
          <MacroStat
            label="Protein"
            value={Math.round(state.proteinG ?? 0)}
            unit="g"
            color="var(--macro-protein)"
          />
          <MacroStat
            label="Carbs"
            value={Math.round(state.carbsG ?? 0)}
            unit="g"
            color="var(--macro-carbs)"
          />
          <MacroStat
            label="Fat"
            value={Math.round(state.fatG ?? 0)}
            unit="g"
            color="var(--macro-fat)"
          />
        </div>
      </div>

      <Link
        href="/dashboard"
        className="self-center rounded-full bg-primary text-background font-semibold h-12 px-8 inline-flex items-center justify-center hover:opacity-90 active:scale-[0.97] transition-all"
      >
        Start tracking your meals
      </Link>
    </div>
  );
}

function MacroStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {color && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />}
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="font-heading text-lg font-semibold tabular-nums">
        {value}
        <span className="text-xs font-normal text-muted ml-0.5">{unit}</span>
      </p>
    </div>
  );
}
