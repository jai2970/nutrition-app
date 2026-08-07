/**
 * Polar/arc helpers for the dashboard's macro "plate ring" — a donut divided
 * into three wedges (protein/carbs/fat), each filling clockwise as its macro
 * target is hit. Angle 0 is the top of the circle, increasing clockwise.
 */

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Path for a filled donut segment between two radii, from angle a0 to a1 (a1 > a0, span < 180°). */
export function donutSegmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  a0: number,
  a1: number,
): string {
  const p1 = polarToCartesian(cx, cy, outerR, a0);
  const p2 = polarToCartesian(cx, cy, outerR, a1);
  const p3 = polarToCartesian(cx, cy, innerR, a1);
  const p4 = polarToCartesian(cx, cy, innerR, a0);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 0 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 0 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

/** Path for a simple stroked arc at a single radius, from angle a0 to a1 (span < 180°). */
export function arcStrokePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p1 = polarToCartesian(cx, cy, r, a0);
  const p2 = polarToCartesian(cx, cy, r, a1);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}
