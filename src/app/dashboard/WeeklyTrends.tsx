"use client";

import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { DailyMacroTrend } from "@/lib/daily-summary";

export default function WeeklyTrends({
  data,
  proteinTargetG,
}: {
  data: DailyMacroTrend[];
  proteinTargetG: number;
}) {
  const daysWithData = data.filter((d) => d.calories > 0).length;

  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">This week</h2>
        {daysWithData >= 2 && (
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />
              Protein
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--macro-carbs)" }} />
              Carbs
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="10" height="2" viewBox="0 0 10 2" aria-hidden="true">
                <line x1="0" y1="1" x2="10" y2="1" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="2.5 2" />
              </svg>
              Target
            </span>
          </div>
        )}
      </div>

      {daysWithData < 2 ? (
        <p className="text-sm text-muted py-8 text-center">
          Log a few days of meals to see your trends
        </p>
      ) : (
        <div className="h-52 -mx-2 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                width={32}
              />
              <Tooltip
                cursor={{ fill: "var(--primary-soft)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="protein" name="Protein (g)" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar
                dataKey="carbs"
                name="Carbs (g)"
                fill="var(--macro-carbs)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              {/* No inline label here — Recharts assigns bars and reference
                  lines to internal z-index layers independent of JSX order,
                  so a label at the target's height can end up visually
                  painted over by a tall bar on whichever day is closest to
                  target. The legend above names it instead, which has no
                  such collision risk. */}
              <ReferenceLine y={proteinTargetG} stroke="var(--primary)" strokeDasharray="4 4" strokeOpacity={0.7} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
