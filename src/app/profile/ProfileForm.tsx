"use client";

import Notice from "@/app/Notice";
import { useState } from "react";
import { useActionState } from "react";
import { updateProfile } from "./actions";
import type { ProfileFormState } from "./saveProfile";
import type { User } from "@/generated/prisma/client";
import HeightInput from "./HeightInput";

const initialState: ProfileFormState = { status: "idle" };

// This form is only ever shown to a returning user editing an
// already-complete profile — first-time onboarding uses OnboardingWizard
// instead, which is why there's no "first completion" branch here: saving
// an already-complete profile always redirects (see updateProfile).
export default function ProfileForm({ user }: { user: User }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [heightCm, setHeightCm] = useState(user.heightCm != null ? String(user.heightCm) : "");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "error" && <Notice tone="error">{state.message}</Notice>}

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

      <HeightInput initialCm={user.heightCm} onChange={setHeightCm} />
      <input type="hidden" name="heightCm" value={heightCm} />

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
