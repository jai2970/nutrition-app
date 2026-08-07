import { donutSegmentPath, arcStrokePath } from "@/lib/plate-ring";

type MacroTarget = { consumed: number; target: number };

const CX = 120;
const CY = 120;
const OUTER_R = 100;
const INNER_R = 64;
const OVERFLOW_R = 114;
const GAP_DEG = 4;
const SECTOR_DEG = 120;

const WEDGES: {
  key: "protein" | "carbs" | "fat";
  label: string;
  fill: string;
  soft: string;
  ink: string;
}[] = [
  { key: "protein", label: "Protein", fill: "var(--macro-protein)", soft: "var(--macro-protein-soft)", ink: "var(--macro-protein-ink)" },
  { key: "carbs", label: "Carbs", fill: "var(--macro-carbs)", soft: "var(--macro-carbs-soft)", ink: "var(--macro-carbs-ink)" },
  { key: "fat", label: "Fat", fill: "var(--macro-fat)", soft: "var(--macro-fat-soft)", ink: "var(--macro-fat-ink)" },
];

export default function MacroPlate({
  calories,
  protein,
  carbs,
  fat,
}: {
  calories: { consumed: number; goal: number };
  protein: MacroTarget;
  carbs: MacroTarget;
  fat: MacroTarget;
}) {
  const data: Record<"protein" | "carbs" | "fat", MacroTarget> = { protein, carbs, fat };

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
      <div className="relative shrink-0" style={{ width: 220, height: 220 }}>
        {/* Decorative — the legend list below carries the same numbers as real text. */}
        <svg viewBox="0 0 240 240" width="100%" height="100%" aria-hidden="true">
          {WEDGES.map((wedge, i) => {
            const { consumed, target } = data[wedge.key];
            const pct = target > 0 ? consumed / target : 0;
            const isOver = pct > 1;
            const sectorStart = i * SECTOR_DEG;
            const sectorEnd = sectorStart + SECTOR_DEG;
            const wedgeStart = sectorStart + GAP_DEG / 2;
            const wedgeEnd = sectorEnd - GAP_DEG / 2;
            const wedgeSpan = wedgeEnd - wedgeStart;
            const filledEnd = wedgeStart + wedgeSpan * Math.min(pct, 1);

            return (
              <g key={wedge.key}>
                {/* Pale base — the whole wedge, empty-plate tint */}
                <path
                  d={donutSegmentPath(CX, CY, INNER_R, OUTER_R, wedgeStart, wedgeEnd)}
                  fill={wedge.soft}
                />
                {/* Filled portion — deepens to the "ink" shade once over target */}
                {pct > 0 && (
                  <path
                    className="plate-arc-fill"
                    d={donutSegmentPath(CX, CY, INNER_R, OUTER_R, wedgeStart, filledEnd)}
                    fill={isOver ? wedge.ink : wedge.fill}
                  />
                )}
                {/* Overflow marker — a distinct outer ring segment, only when over target */}
                {isOver && (
                  <path
                    className="animate-fade-in"
                    d={arcStrokePath(CX, CY, OVERFLOW_R, wedgeStart, wedgeEnd)}
                    fill="none"
                    stroke={wedge.ink}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
          <span className="font-heading text-3xl font-semibold leading-none">
            {Math.round(calories.consumed)}
          </span>
          <span className="text-xs text-muted mt-1">of {Math.round(calories.goal)} kcal</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[200px]">
        {WEDGES.map((wedge) => {
          const { consumed, target } = data[wedge.key];
          const overBy = Math.round(consumed - target);
          const isOver = overBy > 0;

          return (
            <div key={wedge.key} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded-sm shrink-0"
                  style={{ background: isOver ? wedge.ink : wedge.fill }}
                />
                <span className="font-medium">{wedge.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted tabular-nums">
                  {Math.round(consumed)}g / {Math.round(target)}g
                </span>
                {isOver && (
                  <span
                    className="animate-scale-in text-xs font-semibold rounded-full px-2 py-0.5 shrink-0"
                    style={{ background: wedge.soft, color: wedge.ink }}
                  >
                    +{overBy}g over
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
