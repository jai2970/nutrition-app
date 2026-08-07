"use client";

import { useEffect, useRef, useState } from "react";
import { deleteFoodEntry } from "./actions";

type Entry = {
  id: string;
  grams: number;
  foodItem: { name: string; caloriesPer100g: number };
};

export default function MealEntryList({ entries }: { entries: Entry[] }) {
  const knownIds = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(entries.map((e) => e.id));
    const previouslyKnown = knownIds.current;
    knownIds.current = currentIds;

    // Skip the very first mount — only highlight entries that appear on a
    // later update (i.e. were just added), not the page's existing history.
    if (previouslyKnown === null) return;

    const newlyAdded = [...currentIds].filter((id) => !previouslyKnown.has(id));
    if (newlyAdded.length > 0) {
      setFreshIds(new Set(newlyAdded));
      const timer = setTimeout(() => setFreshIds(new Set()), 1000);
      return () => clearTimeout(timer);
    }
  }, [entries]);

  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={`group flex items-center justify-between gap-3 py-3 px-1 -mx-1 border-b border-border rounded transition-colors duration-700 ${
            freshIds.has(entry.id) ? "bg-success-soft" : ""
          }`}
        >
          <div className="flex flex-col">
            <span className="text-sm">{entry.foodItem.name}</span>
            <span className="text-xs text-muted">{Math.round(entry.grams)}g</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted tabular-nums">
              {Math.round((entry.foodItem.caloriesPer100g * entry.grams) / 100)} kcal
            </span>
            <form action={deleteFoodEntry}>
              <input type="hidden" name="entryId" value={entry.id} />
              <button
                type="submit"
                className="inline-flex items-center justify-center h-6 w-6 rounded-full text-muted hover:bg-primary-soft hover:text-primary-ink active:scale-90 transition-all opacity-100 sm:opacity-40 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                aria-label={`Remove ${entry.foodItem.name}`}
              >
                ✕
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
