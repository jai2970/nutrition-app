import CountUp from "./CountUp";
import ProteinRing from "./ProteinRing";
import InsightLine from "./InsightLine";
import type { Insight } from "@/lib/insight";

type Macro = { consumed: number; target: number };

export default function ProteinHero({
  protein,
  calories,
  carbs,
  fat,
  insight,
}: {
  protein: Macro;
  calories: { consumed: number; goal: number };
  carbs: Macro;
  fat: Macro;
  insight: Insight;
}) {
  const kcalPct = calories.goal > 0 ? Math.min(calories.consumed / calories.goal, 1) : 0;
  const kcalOver = calories.consumed > calories.goal;

  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-card p-6 sm:p-8">
      <div className="flex flex-col items-center">
        <ProteinRing consumed={protein.consumed} target={protein.target} />
        <InsightLine insight={insight} />
      </div>

      <div className="mt-6 rounded-2xl bg-background px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">Calories</span>
          <span className={`tabular-nums ${kcalOver ? "text-over font-semibold" : "text-muted"}`}>
            <span className={kcalOver ? "" : "text-foreground font-semibold"}>
              <CountUp value={calories.consumed} />
            </span>{" "}
            / {Math.round(calories.goal).toLocaleString("en-US")} kcal
          </span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="bar-fill-x h-full w-full rounded-full"
            style={{
              transform: `translateX(${(kcalPct - 1) * 100}%)`,
              background: kcalOver ? "var(--over)" : "var(--foreground)",
            }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        <Chip label="Carbs" macro={carbs} color="var(--macro-carbs)" ink="var(--macro-carbs-ink)" />
        <Chip label="Fat" macro={fat} color="var(--macro-fat)" ink="var(--macro-fat-ink)" />
      </div>

      <a
        href="#log-a-meal"
        className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary text-white font-semibold h-12 px-6 hover:opacity-90 active:scale-[0.97] transition-all"
      >
        Log a meal <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}

function Chip({
  label,
  macro,
  color,
  ink,
}: {
  label: string;
  macro: Macro;
  color: string;
  ink: string;
}) {
  const over = macro.consumed > macro.target;
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border px-3.5 h-11 text-sm">
      <span className="flex items-center gap-2 font-medium">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: over ? ink : color }} />
        {label}
      </span>
      <span className="tabular-nums text-muted" style={over ? { color: ink, fontWeight: 600 } : undefined}>
        {Math.round(macro.consumed)}
        <span className="text-muted font-normal">/{Math.round(macro.target)}g</span>
      </span>
    </div>
  );
}
