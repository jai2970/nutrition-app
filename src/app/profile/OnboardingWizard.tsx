"use client";

import Notice from "@/app/Notice";
import { useState } from "react";
import type { ProfileFormState } from "./saveProfile";
import { ActivityLevel, DietType, Goal, Sex } from "@/generated/prisma/enums";
import HeightInput from "./HeightInput";
import OnboardingResult from "./OnboardingResult";
import { calculateBMI, bmiCategory } from "@/lib/nutrition";
import { getBmiZoneColor } from "@/app/BmiScale";

type Step = 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 5;
const AUTO_ADVANCE_MS = 300;

export default function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const [goal, setGoal] = useState<Goal | null>(null);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  const [result, setResult] = useState<ProfileFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function goTo(next: Step, dir: "forward" | "back") {
    setDirection(dir);
    setStep(next);
  }

  function goBack() {
    if (step > 1) goTo((step - 1) as Step, "back");
  }

  function selectGoal(value: Goal) {
    setGoal(value);
    setTimeout(() => goTo(2, "forward"), AUTO_ADVANCE_MS);
  }

  function selectActivity(value: ActivityLevel) {
    setActivityLevel(value);
    setTimeout(() => goTo(5, "forward"), AUTO_ADVANCE_MS);
  }

  async function selectDietType(value: DietType) {
    setIsSaving(true);

    const formData = new FormData();
    formData.set("name", "");
    formData.set("age", age);
    formData.set("sex", sex ?? "");
    formData.set("heightCm", heightCm);
    formData.set("weightKg", weightKg);
    formData.set("activityLevel", activityLevel ?? "");
    formData.set("dietType", value);
    formData.set("goal", goal ?? "");

    let res: ProfileFormState;
    try {
      const response = await fetch("/api/complete-onboarding", { method: "POST", body: formData });
      res = await response.json();
    } catch {
      res = {
        status: "error",
        message: "We couldn't save your profile. Check your connection and try again.",
      };
    }
    setIsSaving(false);
    setResult(res);
  }

  if (result?.status === "success" && result.isFirstCompletion) {
    return (
      <div className="w-full max-w-[480px] mx-auto px-6 py-8">
        <OnboardingResult state={result} />
      </div>
    );
  }

  const canContinueStep2 =
    age.trim() !== "" && Number(age) >= 1 && Number(age) <= 120 && sex !== null && heightCm !== "";

  const weightNum = Number(weightKg);
  const canContinueStep3 = weightKg !== "" && weightNum >= 20 && weightNum <= 400;
  const previewBmi =
    canContinueStep3 && heightCm !== "" ? calculateBMI(weightNum, Number(heightCm)) : null;

  return (
    <div className="w-full max-w-[480px] mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="shrink-0 -ml-1 p-1 text-muted hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <div className="w-5 shrink-0" aria-hidden="true" />
        )}
        <div className="h-[3px] flex-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {result?.status === "error" && <Notice tone="error">{result.message}</Notice>}

      <div key={step} className={direction === "forward" ? "wizard-step-forward" : "wizard-step-back"}>
        {step === 1 && <StepGoal value={goal} onSelect={selectGoal} />}
        {step === 2 && (
          <StepBody
            age={age}
            onAgeChange={setAge}
            sex={sex}
            onSexChange={setSex}
            heightCm={heightCm}
            onHeightChange={setHeightCm}
            canContinue={canContinueStep2}
            onContinue={() => goTo(3, "forward")}
          />
        )}
        {step === 3 && (
          <StepWeight
            weightKg={weightKg}
            onWeightChange={setWeightKg}
            bmi={previewBmi}
            canContinue={canContinueStep3}
            onContinue={() => goTo(4, "forward")}
          />
        )}
        {step === 4 && <StepLifestyle value={activityLevel} onSelect={selectActivity} />}
        {step === 5 && <StepDiet onSelect={selectDietType} isSaving={isSaving} />}
      </div>
    </div>
  );
}

function StepGoal({ value, onSelect }: { value: Goal | null; onSelect: (g: Goal) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold">What&apos;s your goal?</h1>
      <div className="flex flex-col gap-3">
        <SelectableCard
          selected={value === "LOSE"}
          onClick={() => onSelect("LOSE")}
          icon={<TrendIcon direction="down" />}
          label="Lose weight"
        />
        <SelectableCard
          selected={value === "MAINTAIN"}
          onClick={() => onSelect("MAINTAIN")}
          icon={<TrendIcon direction="flat" />}
          label="Maintain weight"
        />
        <SelectableCard
          selected={value === "GAIN"}
          onClick={() => onSelect("GAIN")}
          icon={<TrendIcon direction="up" />}
          label="Gain muscle"
        />
      </div>
    </div>
  );
}

function StepBody({
  age,
  onAgeChange,
  sex,
  onSexChange,
  heightCm,
  onHeightChange,
  canContinue,
  onContinue,
}: {
  age: string;
  onAgeChange: (v: string) => void;
  sex: Sex | null;
  onSexChange: (v: Sex) => void;
  heightCm: string;
  onHeightChange: (v: string) => void;
  canContinue: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold">About you</h1>
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Age</span>
          <input
            type="number"
            min={1}
            max={120}
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            placeholder="e.g. 28"
            className="input"
            autoFocus
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Sex</span>
          <div className="grid grid-cols-2 gap-3">
            {(["MALE", "FEMALE"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSexChange(s)}
                className={`h-14 rounded-xl border text-base font-semibold transition-all ${
                  sex === s
                    ? "border-primary bg-primary-soft text-primary-ink"
                    : "border-border bg-surface text-foreground hover:border-primary/40"
                }`}
              >
                {s === "MALE" ? "Male" : "Female"}
              </button>
            ))}
          </div>
        </div>

        <HeightInput initialCm={heightCm !== "" ? Number(heightCm) : null} onChange={onHeightChange} />
      </div>

      <button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="rounded-full bg-primary text-background font-semibold h-12 hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:active:scale-100"
      >
        Continue
      </button>
    </div>
  );
}

function StepWeight({
  weightKg,
  onWeightChange,
  bmi,
  canContinue,
  onContinue,
}: {
  weightKg: string;
  onWeightChange: (v: string) => void;
  bmi: number | null;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const category = bmi != null ? bmiCategory(bmi) : null;
  const color = category ? getBmiZoneColor(category) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold">Current weight</h1>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted text-center">Weight (kg)</span>
          <input
            type="number"
            min={20}
            max={400}
            step="0.1"
            value={weightKg}
            onChange={(e) => onWeightChange(e.target.value)}
            placeholder="e.g. 68"
            className="input text-center font-heading text-3xl font-semibold h-16"
            autoFocus
          />
        </label>
        <p className="text-center text-sm h-5">
          {bmi != null && category && (
            <span className="animate-fade-in text-muted">
              BMI: <span className="font-semibold" style={{ color }}>{bmi.toFixed(1)} — {category}</span>
            </span>
          )}
        </p>
      </div>
      <button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="rounded-full bg-primary text-background font-semibold h-12 hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:active:scale-100"
      >
        Continue
      </button>
    </div>
  );
}

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "SEDENTARY", label: "Sedentary", description: "Little to no exercise" },
  { value: "LIGHT", label: "Lightly active", description: "1-3 days/week" },
  { value: "MODERATE", label: "Moderately active", description: "3-5 days/week" },
  { value: "ACTIVE", label: "Very active", description: "6-7 days/week" },
];

function StepLifestyle({
  value,
  onSelect,
}: {
  value: ActivityLevel | null;
  onSelect: (v: ActivityLevel) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold">Your lifestyle</h1>
      <div className="flex flex-col gap-3">
        {ACTIVITY_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.value}
            selected={value === opt.value}
            onClick={() => onSelect(opt.value)}
            label={opt.label}
            description={opt.description}
          />
        ))}
      </div>
    </div>
  );
}

function StepDiet({
  onSelect,
  isSaving,
}: {
  onSelect: (v: DietType) => void;
  isSaving: boolean;
}) {
  const [selected, setSelected] = useState<DietType | null>(null);

  function handleSelect(v: DietType) {
    setSelected(v);
    onSelect(v);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold">How do you eat?</h1>
      <div className="flex flex-col gap-3">
        <SelectableCard
          selected={selected === "VEGETARIAN"}
          onClick={() => handleSelect("VEGETARIAN")}
          icon={<span className="text-2xl">🌿</span>}
          label="Vegetarian"
          disabled={isSaving}
        />
        <SelectableCard
          selected={selected === "NON_VEGETARIAN"}
          onClick={() => handleSelect("NON_VEGETARIAN")}
          icon={<span className="text-2xl">🍗</span>}
          label="Non-vegetarian"
          disabled={isSaving}
        />
      </div>
      <p className="text-center text-sm text-muted h-5">{isSaving && "Saving..."}</p>
    </div>
  );
}

function SelectableCard({
  selected,
  onClick,
  icon,
  label,
  description,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-4 rounded-xl border p-5 min-h-[64px] text-left transition-all hover:shadow-md disabled:opacity-60 disabled:pointer-events-none ${
        selected
          ? "border-primary bg-primary-soft text-primary-ink"
          : "border-border bg-surface text-foreground hover:border-primary/40"
      }`}
    >
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex flex-col gap-0.5">
        <span className="text-lg font-semibold">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
    </button>
  );
}

function TrendIcon({ direction }: { direction: "down" | "flat" | "up" }) {
  const paths = {
    down: "M12 4v16M6 14l6 6 6-6",
    flat: "M4 12h16M14 6l6 6-6 6",
    up: "M12 20V4M6 10l6-6 6 6",
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d={paths[direction]} />
    </svg>
  );
}
