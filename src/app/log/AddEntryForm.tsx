"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { addFoodEntry, type LogFormState } from "./actions";
import { Meal } from "@/generated/prisma/enums";

type FoodOption = {
  id: string;
  name: string;
  servingSizeG: number;
  servingLabel: string;
  caloriesPer100g: number;
};

const initialState: LogFormState = { status: "idle" };

const MEAL_LABELS: Record<Meal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACKS: "Snacks",
};

export default function AddEntryForm({
  foods,
  searchSeed,
}: {
  foods: FoodOption[];
  searchSeed?: { name: string; ts: number } | null;
}) {
  const [state, formAction, pending] = useActionState(addFoodEntry, initialState);
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodOption | null>(null);
  const [grams, setGrams] = useState<number | "">("");
  const [meal, setMeal] = useState<Meal>("BREAKFAST");
  const formRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset the form once an in-flight submission resolves to success. Comparing
  // against the previous status during render (rather than in a useEffect) avoids
  // an extra cascading render pass just to clear fields.
  const [lastHandledStatus, setLastHandledStatus] = useState(state.status);
  if (state.status !== lastHandledStatus) {
    setLastHandledStatus(state.status);
    if (state.status === "success") {
      setQuery("");
      setSelectedFood(null);
      setGrams("");
      setMeal("BREAKFAST");
    }
  }

  // Same idea for an incoming "search manually" handoff from SmartLogForm: apply
  // the new query during render, keyed off searchSeed.ts so a repeat click on the
  // same food still re-triggers it.
  const [lastHandledSeedTs, setLastHandledSeedTs] = useState(searchSeed?.ts);
  if (searchSeed && searchSeed.ts !== lastHandledSeedTs) {
    setLastHandledSeedTs(searchSeed.ts);
    setSelectedFood(null);
    setQuery(searchSeed.name);
  }

  const suggestions = useMemo(() => {
    if (!query.trim() || selectedFood) return [];
    const q = query.trim().toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, selectedFood, foods]);

  // Scrolling/focusing is an imperative side effect on the DOM, so it stays in a
  // real effect rather than the render-time state adjustment above.
  useEffect(() => {
    if (!searchSeed) return;
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchSeed?.ts]);

  function selectFood(food: FoodOption) {
    setSelectedFood(food);
    setQuery(food.name);
    setGrams(food.servingSizeG);
  }

  function clearSelection() {
    setSelectedFood(null);
    setQuery("");
    setGrams("");
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
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

      <input type="hidden" name="foodItemId" value={selectedFood?.id ?? ""} />

      <div className="relative">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Search food
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedFood) setSelectedFood(null);
            }}
            placeholder="e.g. roti, dal, paneer..."
            className="input"
            autoComplete="off"
          />
        </label>

        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-black/[.08] dark:border-white/[.145] bg-background shadow-lg max-h-64 overflow-y-auto">
            {suggestions.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => selectFood(food)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.08] flex justify-between gap-3"
                >
                  <span>{food.name}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {food.servingLabel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedFood && (
        <div className="flex items-center justify-between rounded-lg bg-black/[.03] dark:bg-white/[.06] px-3 py-2 text-sm">
          <span>
            Selected: <span className="font-medium">{selectedFood.name}</span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              ({selectedFood.servingLabel})
            </span>
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-zinc-500 dark:text-zinc-400 hover:opacity-70"
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Quantity (grams)
          </span>
          <input
            type="number"
            name="grams"
            min={1}
            step="1"
            value={grams}
            onChange={(e) =>
              setGrams(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Meal</span>
          <select
            name="meal"
            value={meal}
            onChange={(e) => setMeal(e.target.value as Meal)}
            className="input"
          >
            {Object.entries(MEAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending || !selectedFood}
        className="rounded-full bg-foreground text-background font-medium h-11 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add to log"}
      </button>
    </form>
  );
}
