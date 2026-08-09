"use client";

import { useState } from "react";
import { cmToFeetInches, feetInchesToCm } from "@/lib/nutrition";

const FEET_OPTIONS = [3, 4, 5, 6, 7];
const INCH_OPTIONS = Array.from({ length: 12 }, (_, i) => i);

// Shared between the returning-user edit form and the onboarding wizard.
// Manages its own ft/in ⇄ cm toggle and conversion internally, only
// surfacing the resulting cm value (as a string) via onChange.
export default function HeightInput({
  initialCm,
  onChange,
}: {
  initialCm: number | null;
  onChange: (cm: string) => void;
}) {
  const [heightMode, setHeightMode] = useState<"ftin" | "cm">("ftin");
  const initialSplit = initialCm != null ? cmToFeetInches(initialCm) : null;
  const [feet, setFeet] = useState(initialSplit ? String(initialSplit.feet) : "");
  const [inches, setInches] = useState(initialSplit ? String(initialSplit.inches) : "");
  const [cmValue, setCmValue] = useState(initialCm != null ? String(initialCm) : "");

  function commitCm(next: string) {
    setCmValue(next);
    onChange(next);
  }

  function handleFeetChange(value: string) {
    setFeet(value);
    if (value !== "" && inches !== "") {
      commitCm(feetInchesToCm(Number(value), Number(inches)).toFixed(1));
    }
  }

  function handleInchesChange(value: string) {
    setInches(value);
    if (feet !== "" && value !== "") {
      commitCm(feetInchesToCm(Number(feet), Number(value)).toFixed(1));
    }
  }

  function handleCmChange(value: string) {
    commitCm(value);
    if (value !== "" && Number.isFinite(Number(value))) {
      const split = cmToFeetInches(Number(value));
      setFeet(String(split.feet));
      setInches(String(split.inches));
    }
  }

  return (
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
    </div>
  );
}
