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
import AddEntryForm from "./AddEntryForm";

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

type Tab = "describe" | "photo" | "manual";

const TABS: { key: Tab; label: string }[] = [
  { key: "photo", label: "Photo" },
  { key: "describe", label: "Describe" },
];

const MEAL_LABELS: Record<Meal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACKS: "Snacks",
};

const REMOVE_BUTTON =
  "inline-flex items-center justify-center h-6 w-6 rounded-full text-muted hover:bg-primary-soft hover:text-primary-ink active:scale-90 transition-all shrink-0";

const PRIMARY_BUTTON =
  "self-start rounded-full bg-primary text-background font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100";

export default function LogMealCard({ foods }: { foods: FoodOption[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("photo");
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
  const [searchSeed, setSearchSeed] = useState<{ name: string; ts: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchSeedCounter = useRef(0);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    describe: null,
    photo: null,
    manual: null,
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const isParsing = isParsingText || isParsingPhoto;

  useEffect(() => {
    function updateIndicator() {
      const el = tabRefs.current[activeTab];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeTab]);

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

  function handleSearchManually(name: string) {
    searchSeedCounter.current += 1;
    setActiveTab("manual");
    setSearchSeed({ name, ts: searchSeedCounter.current });
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
    <div className="rounded-[20px] border border-border bg-surface shadow-card p-5 flex flex-col gap-4">
      <div className="relative flex gap-1 border-b border-border -mb-px">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-2 sm:px-3.5 py-2 text-xs sm:text-sm -mb-px transition-colors whitespace-nowrap ${
                active ? "text-foreground font-semibold" : "text-muted font-medium hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        <span
          className="absolute bottom-0 h-0.5 transition-[left,width] duration-200 ease-out"
          style={{ left: indicator.left, width: indicator.width, background: "var(--primary)" }}
        />
      </div>

      {(error || successMessage) && (
        <div
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={
            error
              ? { background: "var(--primary-soft)", color: "var(--primary-ink)" }
              : { background: "var(--success-soft)", color: "var(--success-ink)" }
          }
        >
          {error ?? successMessage}
        </div>
      )}

      {activeTab === "photo" && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <ol className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-muted">
            {[
              "Snap a photo of your meal",
              "AI identifies what's on your plate",
              "Review and confirm the macros",
            ].map((step, i, arr) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary-soft text-primary-ink text-[10px] font-semibold shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < arr.length - 1 && <span className="hidden sm:inline text-border">→</span>}
              </li>
            ))}
          </ol>

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
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              isDraggingOver
                ? "border-primary bg-primary-soft scale-[1.01]"
                : "border-border hover:border-primary/50"
            }`}
          >
            {photoPreviewUrl ? (
              <div key={photoPreviewUrl} className="flex items-center gap-3 animate-scale-in">
                {/* eslint-disable-next-line @next/next/no-img-element -- client-side preview of a locally selected file, not a static asset */}
                <img
                  src={photoPreviewUrl}
                  alt="Selected meal"
                  className="h-20 w-20 rounded-lg object-cover border border-border"
                />
                <div className="flex flex-col items-start gap-1 text-sm">
                  <span>{photoFile?.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearPhoto();
                    }}
                    className="text-muted hover:text-primary-ink"
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
                  className="h-7 w-7 text-muted"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="text-sm text-muted">
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
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />

          <p className="text-xs text-muted">
            Quantities are estimated from the photo — adjust if needed.
          </p>

          <button
            type="button"
            onClick={handleParsePhoto}
            disabled={isParsing || !photoFile}
            className={`${PRIMARY_BUTTON} h-10 px-5 text-sm`}
          >
            {isParsingPhoto ? "Identifying..." : "Let's calculate your macros"}
          </button>
        </div>
      )}

      {activeTab === "describe" && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Describe your meal</span>
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
            className={`${PRIMARY_BUTTON} h-10 px-5 text-sm`}
          >
            {isParsingText ? "Parsing..." : "Let's calculate your macros"}
          </button>
        </div>
      )}

      {activeTab === "manual" && (
        <div className="animate-fade-in">
          <AddEntryForm foods={foods} searchSeed={searchSeed} />
        </div>
      )}

      {hasParsed && (
        <div className="flex flex-col gap-4 border-t border-border pt-4 animate-fade-in">
          {matchedRows.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">Matched items</span>
              {matchedRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{row.food.name}</div>
                    <div className="text-muted text-xs">
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
                  <span className="text-xs text-muted w-16 text-right tabular-nums">
                    {Math.round((row.food.caloriesPer100g * row.grams) / 100)} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className={REMOVE_BUTTON}
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
              <span className="text-sm font-medium text-muted">Couldn&apos;t match</span>
              {unmatched.map((item, i) => (
                <div
                  key={`${item.parsedName}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--macro-carbs-soft)" }}
                >
                  <span>
                    {item.parsedName}{" "}
                    <span className="text-muted">
                      (~{item.grams}g) — not found in the food database
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSearchManually(item.parsedName)}
                    className="whitespace-nowrap font-medium hover:opacity-70"
                    style={{ color: "var(--macro-carbs-ink)" }}
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
              className={`${PRIMARY_BUTTON} h-11 px-6`}
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
