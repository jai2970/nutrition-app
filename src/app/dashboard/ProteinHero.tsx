import CountUp from "./CountUp";
import type { Insight } from "@/lib/insight";

type Macro = { consumed: number; target: number };

const SIZE = 220;
const STROKE = 14;
const R = (SIZE - STROKE) / 2 - 2;
const C = 2 * Math.PI * R;

const INSIGHT_STYLE: Record<Insight["tone"], string> = {
  empty: "text-foreground",
  gap: "text-foreground",
  done: "text-success-ink",
  over: "text-over",
};

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
  const pct = protein.target > 0 ? protein.consumed / protein.target : 0;
  const reached = pct >= 1;
  const offset = C * (1 - Math.min(pct, 1));
  const kcalPct = calories.goal > 0 ? Math.min(calories.consumed / calories.goal, 1) : 0;
  const kcalOver = calories.consumed > calories.goal;

  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-card p-6 sm:p-8">
      <div className="flex flex-col items-center">
        <div className="relative w-[220px] h-[220px] sm:w-[260px] sm:h-[260px]">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width="100%"
            height="100%"
            className="-rotate-90"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="protein-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--macro-protein)" />
                <stop offset="100%" stopColor="var(--macro-protein-glow)" />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="var(--macro-protein-soft)"
              strokeWidth={STROKE}
            />
            {pct > 0 && (
              <circle
                className="ring-progress"
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={reached ? "var(--success)" : "url(#protein-ring)"}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                style={{ "--ring-c": C } as React.CSSProperties}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase mb-1">
              Protein
            </span>
            <span
              className="font-heading text-[56px] leading-[60px] font-semibold tabular-nums"
              aria-label={`${Math.round(protein.consumed)} grams of protein`}
            >
              <CountUp value={protein.consumed} />
              <span className="text-2xl text-muted font-medium">g</span>
            </span>
            <span className="text-sm text-muted tabular-nums mt-1">
              of {Math.round(protein.target)}g
            </span>
          </div>
        </div>

        <p
          className={`mt-6 text-base leading-6 text-center max-w-[34ch] font-medium ${INSIGHT_STYLE[insight.tone]}`}
        >
          {insight.text}
        </p>
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
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${kcalPct * 100}%`,
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
