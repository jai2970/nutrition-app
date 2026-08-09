// Shared between the post-onboarding welcome screen and the dashboard BMI
// card, per the design ask to reuse one component rather than two copies.
// Plain (no "use client") since it's static markup with no interactivity —
// safe to render from either a Server or Client Component.

type Zone = { label: string; color: string; widthPct: number };

// Visual scale spans 15–40 BMI; zone boundaries (18.5/25/30) are the
// standard WHO cutoffs also used by bmiCategory() in lib/nutrition.ts.
const SCALE_MIN = 15;
const SCALE_MAX = 40;

const ZONES: Zone[] = [
  { label: "Underweight", color: "var(--bmi-underweight)", widthPct: 14 },
  { label: "Normal", color: "var(--bmi-normal)", widthPct: 26 },
  { label: "Overweight", color: "var(--bmi-overweight)", widthPct: 20 },
  { label: "Obese", color: "var(--bmi-obese)", widthPct: 40 },
];

export function getBmiZoneColor(category: string): string {
  return ZONES.find((z) => z.label === category)?.color ?? "var(--foreground)";
}

export default function BmiScale({ bmi, compact = false }: { bmi: number; compact?: boolean }) {
  const pct = Math.min(Math.max((bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN), 0), 1) * 100;

  return (
    <div className="w-full" style={{ paddingTop: compact ? 8 : 24 }}>
      <div className="relative">
        {/* Marker — a small triangle plus (non-compact) the exact BMI value,
            positioned along the bar at this user's percentile. */}
        <div
          className="absolute bottom-full flex flex-col items-center"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          {!compact && (
            <span className="text-xs font-semibold whitespace-nowrap mb-0.5">
              {bmi.toFixed(1)}
            </span>
          )}
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid var(--foreground)",
            }}
          />
        </div>

        <div className={`flex w-full overflow-hidden rounded-full ${compact ? "h-2" : "h-2.5"}`}>
          {ZONES.map((z) => (
            <div key={z.label} style={{ width: `${z.widthPct}%`, background: z.color }} />
          ))}
        </div>

        {!compact && (
          <div className="hidden sm:flex w-full mt-1.5">
            {ZONES.map((z) => (
              <div
                key={z.label}
                style={{ width: `${z.widthPct}%` }}
                className="text-center text-[10px] text-muted px-0.5 truncate"
              >
                {z.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
