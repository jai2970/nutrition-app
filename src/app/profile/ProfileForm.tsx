"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";
import type { User } from "@/generated/prisma/client";

const initialState: ProfileFormState = { status: "idle" };

export default function ProfileForm({ user }: { user: User }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status !== "idle" && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            state.status === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          {state.message}
        </div>
      )}

      <Field label="Name">
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

        <Field label="Height (cm)">
          <input
            type="number"
            name="heightCm"
            min={50}
            max={272}
            step="0.1"
            required
            defaultValue={user.heightCm ?? ""}
            className="input"
          />
        </Field>

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
      </div>

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
        className="mt-2 rounded-full bg-foreground text-background font-medium h-11 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
