"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  parseMealText,
  parseMealPhoto,
  logParsedItems,
  logCustomEntry,
  type MatchedItem,
  type UnmatchedItem,
  type ParseMealResult,
} from "./smartLogActions";
import { Meal } from "@/generated/prisma/enums";
import AddEntryForm from "./AddEntryForm";
import { useToast } from "@/app/Toaster";
import { shrinkImage } from "@/lib/resize-image";

// Largest photo we'll send as-is when the browser can't shrink it (matches
// the server-side cap in smartLogActions).
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

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
type UnmatchedRow = Omit<UnmatchedItem, "meal"> & { key: string; meal: Meal };

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
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const toast = useToast();
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<UnmatchedRow[]>([]);
  const [addingUnmatchedKeys, setAddingUnmatchedKeys] = useState<Set<string>>(new Set());
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
      // The "manual" search view has no tab of its own, so hide the underline.
      setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth } : { left: 0, width: 0 });
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
      toast.error(result.message);
      setMatchedRows([]);
      setUnmatchedRows([]);
      setHasParsed(false);
    } else {
      setMatchedRows(
        result.matched.map((item, i) => ({
          ...item,
          meal: item.meal ?? "BREAKFAST",
          key: `${item.food.id}-${i}`,
        })),
      );
      setUnmatchedRows(
        result.unmatched.map((item, i) => ({
          ...item,
          meal: item.meal ?? "BREAKFAST",
          key: `unmatched-${i}-${item.parsedName}`,
        })),
      );
      setHasParsed(true);
    }
  }

  async function handleParseText() {
    setIsParsingText(true);
    try {
      applyResult(await parseMealText(description));
    } catch (err) {
      console.error("Failed to parse meal text:", err);
      toast.error("Something went wrong understanding that meal. Please try again.");
    } finally {
      setIsParsingText(false);
    }
  }

  async function setPhotoFromFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    // Shrink big phone photos in the browser first so the upload is small
    // and fast. If the browser can't decode the image (some HEIC files),
    // fall back to the original only when it's small enough to send.
    setIsPreparingPhoto(true);
    let prepared = file;
    try {
      prepared = await shrinkImage(file);
    } catch (err) {
      console.error("Couldn't shrink photo:", err);
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error("We couldn't read that photo. Try a different one, or a JPEG or PNG.");
        setIsPreparingPhoto(false);
        return;
      }
    }
    setIsPreparingPhoto(false);

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(prepared);
    setPhotoPreviewUrl(URL.createObjectURL(prepared));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    void setPhotoFromFile(e.target.files?.[0] ?? null);
    // Let the same file be picked again after "Remove photo".
    e.target.value = "";
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
    void setPhotoFromFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleParsePhoto() {
    if (!photoFile) return;
    setIsParsingPhoto(true);
    try {
      const formData = new FormData();
      formData.set("photo", photoFile);
      applyResult(await parseMealPhoto(formData));
    } catch (err) {
      console.error("Failed to parse meal photo:", err);
      toast.error(
        err instanceof Error && err.message.includes("Body exceeded")
          ? "That photo is too large. Try a smaller image."
          : "We couldn't read that photo. Please try again, or describe the meal instead.",
      );
    } finally {
      setIsParsingPhoto(false);
    }
  }

  function resetInputs() {
    setDescription("");
    clearPhoto();
    setMatchedRows([]);
    setUnmatchedRows([]);
    setHasParsed(false);
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

  function updateUnmatchedMeal(key: string, meal: Meal) {
    setUnmatchedRows((rows) => rows.map((r) => (r.key === key ? { ...r, meal } : r)));
  }

  function removeUnmatchedRow(key: string) {
    setUnmatchedRows((rows) => rows.filter((r) => r.key !== key));
  }

  async function handleAddUnmatched(row: UnmatchedRow) {
    setAddingUnmatchedKeys((keys) => new Set(keys).add(row.key));
    try {
      const result = await logCustomEntry({
        name: row.parsedName,
        grams: row.grams,
        meal: row.meal,
        macros: row.estimatedMacros,
      });
      if (result.status === "error") {
        toast.error(result.message);
      } else {
        removeUnmatchedRow(row.key);
        toast.success(`Added ${row.parsedName} to your log.`);
        // That was the last thing left to review: tidy up the whole panel.
        if (matchedRows.length === 0 && unmatchedRows.length === 1) resetInputs();
      }
    } catch {
      toast.error("Something went wrong adding that item. Please try again.");
    } finally {
      setAddingUnmatchedKeys((keys) => {
        const next = new Set(keys);
        next.delete(row.key);
        return next;
      });
    }
  }

  async function handleAdd() {
    if (matchedRows.length === 0) return;
    setIsAdding(true);
    try {
      const result = await logParsedItems(
        matchedRows.map((r) => ({ foodItemId: r.food.id, grams: r.grams, meal: r.meal })),
      );
      if (result.status === "error") {
        toast.error(result.message);
      } else {
        const leftToReview = unmatchedRows.length;
        toast.success(
          `Added ${result.count} item${result.count === 1 ? "" : "s"} to your log.` +
            (leftToReview > 0
              ? ` ${leftToReview} more ${leftToReview === 1 ? "item needs" : "items need"} your review.`
              : ""),
        );
        setMatchedRows([]);
        // Keep any AI-estimated items still waiting for a decision on screen
        // instead of silently discarding them.
        if (leftToReview === 0) resetInputs();
      }
    } catch {
      toast.error("Something went wrong adding those items. Please try again.");
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
          className="absolute bottom-0 left-0 h-0.5 w-px origin-left transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{
            // A 1px bar stretched with scaleX and slid with translateX, so the
            // underline animates with transforms only (not left/width).
            transform: `translateX(${indicator.left}px) scaleX(${indicator.width})`,
            background: "var(--primary)",
          }}
        />
      </div>

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
            disabled={isParsing || isPreparingPhoto || !photoFile}
            className={`${PRIMARY_BUTTON} h-10 px-5 text-sm`}
          >
            {isParsingPhoto
              ? "Identifying..."
              : isPreparingPhoto
                ? "Preparing photo..."
                : "Let's calculate your macros"}
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
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium">{row.food.name}</div>
                      <div className="text-muted text-xs">
                        from &ldquo;{row.parsedName}&rdquo; · {row.food.servingLabel}
                      </div>
                    </div>
                    <span className="whitespace-nowrap pt-0.5 text-xs text-muted tabular-nums">
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
                  <div className="flex items-center gap-2">
                    <select
                      value={row.meal}
                      onChange={(e) => updateMeal(row.key, e.target.value as Meal)}
                      aria-label={`Meal for ${row.food.name}`}
                      className="input min-w-0 flex-1 text-sm"
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
                      aria-label={`Grams of ${row.food.name}`}
                      className="input w-20 shrink-0 text-sm"
                    />
                    <span className="text-xs text-muted">g</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unmatchedRows.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted">Not in our database yet</span>
              {unmatchedRows.map((row) => (
                <UnmatchedFoodCard
                  key={row.key}
                  row={row}
                  isAdding={addingUnmatchedKeys.has(row.key)}
                  onMealChange={(meal) => updateUnmatchedMeal(row.key, meal)}
                  onAddAnyway={() => handleAddUnmatched(row)}
                  onSearchManually={() => handleSearchManually(row.parsedName)}
                />
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

type Confidence = UnmatchedRow["confidence"];

// High/medium confidence get a filled "Add anyway" button — the AI is
// probably right, so accepting its estimate should feel like the default
// path. Low confidence swaps to an outline button and adds a caution note,
// nudging the user to double-check rather than tap through on autopilot.
const CONFIDENCE_META: Record<
  Confidence,
  {
    label: string;
    badgeStyle: CSSProperties;
    cardBorderColor?: string;
    note?: string;
    addButtonVariant: "primary" | "outline";
  }
> = {
  high: {
    label: "High confidence",
    badgeStyle: { background: "var(--success-soft)", color: "var(--success-ink)" },
    addButtonVariant: "primary",
  },
  medium: {
    label: "Medium confidence",
    badgeStyle: { background: "var(--primary-soft)", color: "var(--primary-ink)" },
    addButtonVariant: "primary",
  },
  low: {
    label: "Low confidence",
    badgeStyle: { background: "var(--macro-carbs-soft)", color: "var(--macro-carbs-ink)" },
    cardBorderColor: "var(--macro-carbs)",
    note: "AI isn't very confident about this one — double-check before adding.",
    addButtonVariant: "outline",
  },
};

function UnmatchedFoodCard({
  row,
  isAdding,
  onMealChange,
  onAddAnyway,
  onSearchManually,
}: {
  row: UnmatchedRow;
  isAdding: boolean;
  onMealChange: (meal: Meal) => void;
  onAddAnyway: () => void;
  onSearchManually: () => void;
}) {
  const meta = CONFIDENCE_META[row.confidence];
  const { calories, protein, carbs, fat } = row.estimatedMacros;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3"
      style={{ borderColor: meta.cardBorderColor ?? "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm">{row.parsedName}</span>
            <span
              className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}
            >
              AI estimate
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full"
              style={meta.badgeStyle}
            >
              {meta.label}
            </span>
          </div>
          <span className="text-xs text-muted">
            ~{row.grams}g · {Math.round(calories)} kcal · {protein}g protein · {carbs}g carbs ·{" "}
            {fat}g fat
          </span>
          {meta.note && (
            <span className="text-xs" style={{ color: "var(--macro-carbs-ink)" }}>
              {meta.note}
            </span>
          )}
        </div>
        <select
          value={row.meal}
          onChange={(e) => onMealChange(e.target.value as Meal)}
          className="input w-28 text-sm shrink-0"
        >
          {Object.entries(MEAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onAddAnyway}
          disabled={isAdding}
          className={
            meta.addButtonVariant === "primary"
              ? `${PRIMARY_BUTTON} h-9 px-4 text-sm whitespace-nowrap`
              : "self-start whitespace-nowrap rounded-full border font-medium h-9 px-4 text-sm hover:bg-primary-soft active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100"
          }
          style={
            meta.addButtonVariant === "outline"
              ? { borderColor: "var(--macro-carbs)", color: "var(--macro-carbs-ink)" }
              : undefined
          }
        >
          {isAdding ? "Adding..." : "Add anyway"}
        </button>
        <button
          type="button"
          onClick={onSearchManually}
          className="text-sm font-medium text-muted hover:text-foreground whitespace-nowrap"
        >
          Search manually
        </button>
      </div>
    </div>
  );
}
