"use client";

import { useSyncExternalStore } from "react";
import { LayoutGroup, m } from "motion/react";
import MealEntryList from "@/app/log/MealEntryList";
import type { HistoryEntry } from "@/lib/daily-summary";
import CountUp from "./CountUp";

const noopSubscribe = () => () => {};

export type MealGroup = {
  meal: string;
  label: string;
  emptyCopy: string;
  rows: HistoryEntry[];
};

// Today's meals, grouped. Wrapped in a LayoutGroup so that when a row is
// added or removed the meal groups below glide to their new position
// instead of jumping (Motion animates this with transforms only).
export default function TodayLog({ groups }: { groups: MealGroup[] }) {
  // Lists that exist on first load don't animate in (the page entrance handles
  // that); a list that appears later — e.g. you add the first dinner item —
  // should animate its row in.
  // (false while server-rendering / hydrating, true on later client renders.)
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-6">
        {groups.map((group) => {
          const protein = group.rows.reduce((sum, r) => sum + r.protein, 0);
          const calories = group.rows.reduce((sum, r) => sum + r.calories, 0);

          return (
            <m.div key={group.meal} layout="position">
              <h3 className="flex items-baseline justify-between text-xs font-semibold tracking-[0.06em] uppercase text-muted mb-2">
                <span>{group.label}</span>
                {group.rows.length > 0 && (
                  <span className="normal-case tracking-normal font-medium tabular-nums">
                    <CountUp value={protein} />g · <CountUp value={calories} /> kcal
                  </span>
                )}
              </h3>

              {group.rows.length === 0 ? (
                <a
                  href="#log-a-meal"
                  className="flex items-center min-h-12 rounded-2xl border border-dashed border-border px-4 text-sm text-muted hover:border-primary hover:text-primary-ink transition-colors"
                >
                  {group.emptyCopy}
                </a>
              ) : (
                <MealEntryList entries={group.rows} animateFirstRows={ready} />
              )}
            </m.div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
