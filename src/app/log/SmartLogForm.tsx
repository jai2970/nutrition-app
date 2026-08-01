"use client";

import { useState } from "react";
import {
  parseMealText,
  logParsedItems,
  type MatchedItem,
  type UnmatchedItem,
} from "./smartLogActions";
import { Meal } from "@/generated/prisma/enums";

type FoodOption = {
  id: string;
  name: string;
  servingSizeG: number;
  servingLabel: string;
  caloriesPer100g: number;
};

// Meal is always concrete in row state (never null) — a parsed item with no
// detected meal falls back to Breakfast, editable per row from there.
type MatchedRow = Omit<MatchedItem, "meal"> & { key: string; meal: Meal };

const MEAL_LABELS: Record<Meal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACKS: "Snacks",
};

export default function SmartLogForm({
  onSearchManually,
}: {
  foods: FoodOption[];
  onSearchManually: (name: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  async function handleParse() {
    setError(null);
    setSuccessMessage(null);
    setIsParsing(true);
    try {
      const result = await parseMealText(description);
      if (result.status === "error") {
        setError(result.message);
        setMatchedRows([]);
        setUnmatched([]);
        setHasParsed(false);
      } else {
        setMatchedRows(
          result.matched.map((item, i) => ({
            ...item,
            meal: item.meal ?? "BREAKFAST",
            key: `${item.food.id}-${i}`,
          })),
        );
        setUnmatched(result.unmatched);
        setHasParsed(true);
      }
    } catch {
      setError("Something went wrong parsing that. Please try again.");
    } finally {
      setIsParsing(false);
    }
  }

  function updateGrams(key: string, grams: number) {
    setMatchedRows((rows) => rows.map((r) => (r.key === key ? { ...r, grams } : r)));
  }

  function updateMeal(key: string, meal: Meal) {
    setMatchedRows((rows) => rows.map((r) => (r.key === key ? { ...r, meal } : r)));
  }

  function removeRow(key: string) {
    setMatchedRows((rows) => rows.filter((r) => r.key !== key));
  }

  async function handleAdd() {
    if (matchedRows.length === 0) return;
    setError(null);
    setIsAdding(true);
    try {
      const result = await logParsedItems(
        matchedRows.map((r) => ({ foodItemId: r.food.id, grams: r.grams, meal: r.meal })),
      );
      if (result.status === "error") {
        setError(result.message);
      } else {
        setSuccessMessage(
          `Added ${result.count} item${result.count === 1 ? "" : "s"} to your log.`,
        );
        setDescription("");
        setMatchedRows([]);
        setUnmatched([]);
        setHasParsed(false);
      }
    } catch {
      setError("Something went wrong adding those items. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold mb-1">Describe your meal</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          e.g. &ldquo;2 rotis, dal, and a bowl of curd&rdquo; — AI will estimate
          quantities and match them to known foods.
        </p>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2 text-sm bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg px-4 py-2 text-sm bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
          {successMessage}
        </div>
      )}

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What did you eat?"
        rows={2}
        className="input resize-none"
      />

      <button
        type="button"
        onClick={handleParse}
        disabled={isParsing || !description.trim()}
        className="self-start rounded-full bg-foreground text-background font-medium h-10 px-5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isParsing ? "Parsing..." : "Parse with AI"}
      </button>

      {hasParsed && (
        <div className="flex flex-col gap-4 border-t border-black/[.08] dark:border-white/[.145] pt-4">
          {matchedRows.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Matched items
              </span>
              {matchedRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center gap-3 rounded-lg bg-black/[.03] dark:bg-white/[.06] px-3 py-2"
                >
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{row.food.name}</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">
                      from &ldquo;{row.parsedName}&rdquo; · {row.food.servingLabel}
                    </div>
                  </div>
                  <select
                    value={row.meal}
                    onChange={(e) => updateMeal(row.key, e.target.value as Meal)}
                    className="input w-28 text-sm"
                  >
                    {Object.entries(MEAL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={row.grams}
                    onChange={(e) => updateGrams(row.key, Number(e.target.value))}
                    className="input w-20 text-sm"
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 w-16 text-right">
                    {Math.round((row.food.caloriesPer100g * row.grams) / 100)} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-zinc-500 dark:text-zinc-400 hover:opacity-70 text-sm"
                    aria-label={`Remove ${row.food.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {unmatched.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Couldn&apos;t match
              </span>
              {unmatched.map((item, i) => (
                <div
                  key={`${item.parsedName}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm"
                >
                  <span>
                    {item.parsedName}{" "}
                    <span className="text-zinc-500 dark:text-zinc-400">
                      (~{item.grams}g) — not found in the food database
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onSearchManually(item.parsedName)}
                    className="whitespace-nowrap text-amber-700 dark:text-amber-400 hover:opacity-70 font-medium"
                  >
                    Search manually
                  </button>
                </div>
              ))}
            </div>
          )}

          {matchedRows.length > 0 && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className="self-start rounded-full bg-foreground text-background font-medium h-11 px-6 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isAdding
                ? "Adding..."
                : `Add ${matchedRows.length} item${matchedRows.length === 1 ? "" : "s"} to log`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
