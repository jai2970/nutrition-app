"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { animate, m, useDragControls, useMotionValue, useReducedMotion, type PanInfo } from "motion/react";
import type { DayHistory } from "@/lib/daily-summary";
import LocalTime from "./LocalTime";

const MEAL_LABEL = { BREAKFAST: "Breakfast", LUNCH: "Lunch", DINNER: "Dinner", SNACKS: "Snacks" };

function compactKcal(n: number) {
  const r = Math.round(n);
  return r >= 1000 ? `${(r / 1000).toFixed(1)}k` : String(r);
}

export default function WeekStrip({
  days,
  proteinTargetG,
}: {
  days: DayHistory[];
  proteinTargetG: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<DayHistory | null>(null);
  const reduce = useReducedMotion();
  const sheetY = useMotionValue(0);
  const dragControls = useDragControls();

  // Slide the sheet off the bottom, then actually close the <dialog>.
  function closeSheet() {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) return;
    if (reduce) {
      dialog.close();
      return;
    }
    animate(sheetY, dialog.offsetHeight + 40, { duration: 0.22, ease: [0.4, 0, 1, 1] }).then(() => dialog.close());
  }

  function handleSheetDragEnd(_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 500) {
      closeSheet();
    } else {
      animate(sheetY, 0, reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 });
    }
  }

  // The sheet follows the finger when pulled down from its header — phones
  // only (on larger screens it's a centred card, so there's nothing to drag).
  function startSheetDrag(event: ReactPointerEvent<HTMLElement>) {
    if (window.matchMedia("(max-width: 639px)").matches) dragControls.start(event);
  }

  return (
    <section aria-labelledby="week-heading">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="week-heading" className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
          Last 7 days
        </h2>
        <span className="text-xs text-muted">Protein · kcal</span>
      </div>

      <ul className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day, i) => {
          const pct = proteinTargetG > 0 ? day.totals.protein / proteinTargetG : 0;
          const hit = pct >= 1;
          const empty = day.totals.calories < 1;
          return (
            <li key={day.dateKey} className="animate-tile-in" style={{ animationDelay: `${i * 30}ms` }}>
              <button
                type="button"
                onClick={() => {
                  setSelected(day);
                  dialogRef.current?.showModal();
                }}
                aria-label={`${day.label}: ${Math.round(day.totals.protein)}g protein, ${Math.round(day.totals.calories)} kcal`}
                className={`w-full flex flex-col items-center gap-1.5 rounded-2xl border py-2.5 sm:py-3 bg-surface shadow-card active:scale-[0.97] transition-transform ${
                  day.isToday ? "border-primary" : "border-border"
                }`}
              >
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    day.isToday ? "text-primary-ink" : "text-muted"
                  }`}
                >
                  {day.weekday}
                </span>
                <span className="relative h-12 w-2 rounded-full bg-border overflow-hidden" aria-hidden="true">
                  {/* Slides up from below the track (transform only) so the bar grows in. */}
                  <span
                    className="bar-fill-y absolute inset-0 rounded-full"
                    style={{
                      transform: `translateY(${(1 - Math.min(pct, 1)) * 100}%)`,
                      background: hit ? "var(--success)" : "var(--macro-protein)",
                      animationDelay: `${180 + i * 30}ms`,
                    }}
                  />
                </span>
                <span className="text-[13px] font-semibold tabular-nums leading-none">
                  {empty ? "–" : `${Math.round(day.totals.protein)}g`}
                </span>
                <span className="text-[11px] text-muted tabular-nums leading-none">
                  {empty ? "" : compactKcal(day.totals.calories)}
                  {empty && " "}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <m.dialog
        ref={dialogRef}
        className="day-sheet"
        aria-label={selected ? `${selected.label} log` : "Day log"}
        style={{ y: sheetY }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        dragMomentum={false}
        onDragEnd={handleSheetDragEnd}
        onClose={() => sheetY.set(0)}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeSheet();
        }}
      >
        {selected && (
          <div className="p-6 pt-3 sm:pt-6">
            <div className="max-sm:touch-none max-sm:cursor-grab" onPointerDown={startSheetDrag}>
              <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-[22px] leading-7 font-semibold">{selected.label}</h3>
                <p className="text-sm text-muted tabular-nums mt-1">
                  <span className="text-foreground font-semibold">
                    {Math.round(selected.totals.protein)}g
                  </span>{" "}
                  protein ·{" "}
                  <span className="text-foreground font-semibold">
                    {Math.round(selected.totals.calories).toLocaleString("en-US")}
                  </span>{" "}
                  kcal
                </p>
              </div>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={closeSheet}
                aria-label="Close"
                className="h-11 w-11 -mr-2 -mt-2 inline-flex items-center justify-center rounded-full text-muted hover:bg-background"
              >
                ✕
              </button>
            </div>
            </div>

            {selected.entries.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">Nothing logged this day.</p>
            ) : (
              <ul className="mt-4 max-h-[50vh] overflow-y-auto divide-y divide-border">
                {selected.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{e.name}</p>
                      <p className="text-[13px] text-muted">
                        {MEAL_LABEL[e.meal]} · {Math.round(e.grams)}g · <LocalTime iso={e.consumedAt} />
                      </p>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <p className="font-semibold text-primary-ink">{Math.round(e.protein)}g</p>
                      <p className="text-[13px] text-muted">{Math.round(e.calories)} kcal</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </m.dialog>
    </section>
  );
}
