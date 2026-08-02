"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseMealText,
  parseMealPhoto,
  logParsedItems,
  type MatchedItem,
  type UnmatchedItem,
  type ParseMealResult,
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isParsingText, setIsParsingText] = useState(false);
  const [isParsingPhoto, setIsParsingPhoto] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isParsing = isParsingText || isParsingPhoto;

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  function applyResult(result: ParseMealResult) {
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
  }

  async function handleParseText() {
    setError(null);
    setSuccessMessage(null);
    setIsParsingText(true);
    try {
      applyResult(await parseMealText(description));
    } catch (err) {
      console.error("Failed to parse meal text:", err);
      setError("Something went wrong parsing that. Please try again.");
    } finally {
      setIsParsingText(false);
    }
  }

  function setPhotoFromFile(file: File | null) {
    if (file && !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoFromFile(e.target.files?.[0] ?? null);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDraggingOver) setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingOver(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    setPhotoFromFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleParsePhoto() {
    if (!photoFile) return;
    setError(null);
    setSuccessMessage(null);
    setIsParsingPhoto(true);
    try {
      const formData = new FormData();
      formData.set("photo", photoFile);
      applyResult(await parseMealPhoto(formData));
    } catch (err) {
      console.error("Failed to parse meal photo:", err);
      const message = err instanceof Error && err.message.includes("Body exceeded")
        ? "That photo is too large. Try a smaller image."
        : "Something went wrong reading that photo. Please try again.";
      setError(message);
    } finally {
      setIsParsingPhoto(false);
    }
  }

  function clearPhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        clearPhoto();
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
        <h2 className="font-semibold mb-1">Log a meal with AI</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Describe what you ate, or upload a photo — AI will estimate quantities and
          match them to known foods.
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

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Describe your meal
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 2 rotis, dal, and a bowl of curd"
          rows={2}
          className="input resize-none"
        />
      </label>

      <button
        type="button"
        onClick={handleParseText}
        disabled={isParsing || !description.trim()}
        className="self-start rounded-full bg-foreground text-background font-medium h-10 px-5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isParsingText ? "Parsing..." : "Parse with AI"}
      </button>

      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
        or
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
          Upload a photo of your meal
        </span>

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Drag a photo here, or click to browse"
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            isDraggingOver
              ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
              : "border-black/[.15] dark:border-white/[.2] hover:border-black/[.3] dark:hover:border-white/[.35]"
          }`}
        >
          {photoPreviewUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- client-side preview of a locally selected file, not a static asset */}
              <img
                src={photoPreviewUrl}
                alt="Selected meal"
                className="h-20 w-20 rounded-lg object-cover border border-black/[.08] dark:border-white/[.145]"
              />
              <div className="flex flex-col items-start gap-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{photoFile?.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearPhoto();
                  }}
                  className="text-zinc-500 dark:text-zinc-400 hover:opacity-70"
                >
                  Remove photo
                </button>
              </div>
            </div>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-7 w-7 text-zinc-400 dark:text-zinc-500"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Drag a photo here, or{" "}
                <span className="font-medium text-foreground">click to browse</span>
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Quantities are estimated from the photo — adjust if needed.
        </p>

        <button
          type="button"
          onClick={handleParsePhoto}
          disabled={isParsing || !photoFile}
          className="self-start rounded-full bg-foreground text-background font-medium h-10 px-5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isParsingPhoto ? "Identifying..." : "Identify food in photo"}
        </button>
      </div>

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
