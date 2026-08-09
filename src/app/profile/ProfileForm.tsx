"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { updateProfile, type ProfileFormState } from "./actions";
import type { User } from "@/generated/prisma/client";
import { bmiInterpretation, cmToFeetInches, feetInchesToCm } from "@/lib/nutrition";
import BmiScale, { getBmiZoneColor } from "@/app/BmiScale";

const initialState: ProfileFormState = { status: "idle" };

const FEET_OPTIONS = [3, 4, 5, 6, 7];
const INCH_OPTIONS = Array.from({ length: 12 }, (_, i) => i);

export default function ProfileForm({ user }: { user: User }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  const [heightMode, setHeightMode] = useState<"ftin" | "cm">("ftin");
  const initialSplit = user.heightCm != null ? cmToFeetInches(user.heightCm) : null;
  const [feet, setFeet] = useState(initialSplit ? String(initialSplit.feet) : "");
  const [inches, setInches] = useState(initialSplit ? String(initialSplit.inches) : "");
  const [cmValue, setCmValue] = useState(user.heightCm != null ? String(user.heightCm) : "");

  function handleFeetChange(value: string) {
    setFeet(value);
    if (value !== "" && inches !== "") {
      setCmValue(feetInchesToCm(Number(value), Number(inches)).toFixed(1));
    }
  }

  function handleInchesChange(value: string) {
    setInches(value);
    if (feet !== "" && value !== "") {
      setCmValue(feetInchesToCm(Number(feet), Number(value)).toFixed(1));
    }
  }

  function handleCmChange(value: string) {
    setCmValue(value);
    if (value !== "" && Number.isFinite(Number(value))) {
      const split = cmToFeetInches(Number(value));
      setFeet(String(split.feet));
      setInches(String(split.inches));
    }
  }

  if (state.status === "success" && state.isFirstCompletion) {
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          className="self-center sm:self-start rounded-full bg-primary text-background font-semibold h-12 px-8 inline-flex items-center justify-center hover:opacity-90 active:scale-[0.97] transition-all"
        >
          Start tracking your meals
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status !== "idle" && (
        <div
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={
            state.status === "success"
              ? { background: "var(--success-soft)", color: "var(--success-ink)" }
              : { background: "var(--primary-soft)", color: "var(--primary-ink)" }
          }
        >
          {state.message}
        </div>
      )}

      <Field label="Name (optional)">
        <input
          type="text"
          name="name"
          defaultValue={user.name ?? ""}
          placeholder="Your name"
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Age">
          <input
            type="number"
            name="age"
            min={1}
            max={120}
            required
            defaultValue={user.age ?? ""}
            className="input"
          />
        </Field>

        <Field label="Sex">
          <select name="sex" required defaultValue={user.sex ?? ""} className="input">
            <option value="" disabled>
              Select
            </option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-muted">Height</span>
          <div className="flex gap-0.5 rounded-full border border-border p-0.5">
            {(["ftin", "cm"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setHeightMode(mode)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  heightMode === mode
                    ? "bg-primary-soft text-primary-ink"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {mode === "ftin" ? "ft/in" : "cm"}
              </button>
            ))}
          </div>
        </div>

        {heightMode === "ftin" ? (
          <div className="flex gap-3">
            <select
              required
              value={feet}
              onChange={(e) => handleFeetChange(e.target.value)}
              className="input flex-1"
            >
              <option value="" disabled>
                Feet
              </option>
              {FEET_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f} ft
                </option>
              ))}
            </select>
            <select
              required
              value={inches}
              onChange={(e) => handleInchesChange(e.target.value)}
              className="input flex-1"
            >
              <option value="" disabled>
                Inches
              </option>
              {INCH_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i} in
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input
            type="number"
            required
            min={50}
            max={272}
            step="0.1"
            value={cmValue}
            onChange={(e) => handleCmChange(e.target.value)}
            placeholder="e.g. 172"
            className="input"
          />
        )}
        <input type="hidden" name="heightCm" value={cmValue} />
      </div>

      <Field label="Weight (kg)">
        <input
          type="number"
          name="weightKg"
          min={20}
          max={400}
          step="0.1"
          required
          defaultValue={user.weightKg ?? ""}
          className="input"
        />
      </Field>

      <Field label="Activity level">
        <select
          name="activityLevel"
          required
          defaultValue={user.activityLevel ?? ""}
          className="input"
        >
          <option value="" disabled>
            Select
          </option>
          <option value="SEDENTARY">Sedentary (little to no exercise)</option>
          <option value="LIGHT">Light (1-3 days/week)</option>
          <option value="MODERATE">Moderate (3-5 days/week)</option>
          <option value="ACTIVE">Active (6-7 days/week)</option>
        </select>
      </Field>

      <Field label="Diet type">
        <select name="dietType" required defaultValue={user.dietType ?? ""} className="input">
          <option value="" disabled>
            Select
          </option>
          <option value="VEGETARIAN">Vegetarian</option>
          <option value="NON_VEGETARIAN">Non-vegetarian</option>
          <option value="EGGETARIAN">Eggetarian</option>
        </select>
      </Field>

      <Field label="Goal">
        <select name="goal" required defaultValue={user.goal ?? ""} className="input">
          <option value="" disabled>
            Select
          </option>
          <option value="LOSE">Lose weight</option>
          <option value="MAINTAIN">Maintain weight</option>
          <option value="GAIN">Gain weight</option>
        </select>
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary text-background font-medium h-11 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Saving..." : "Let's calculate your macros"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted">{label}</span>
      {children}
    </label>
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
