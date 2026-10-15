"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { animate, m, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import CountUp from "./CountUp";

// The ring is drawn so that everything that moves is a *transform*: a pale
// track, plus two half-discs that rotate to reveal the filled arc, plus two
// round end-caps (so the ends stay rounded like a stroke-linecap). No
// stroke-dashoffset / width / height is animated, which keeps it on the
// compositor and cheap on low-end phones. All sizes are fractions of --s.
//
// Geometry matches the old SVG ring: 220-unit box, 14 stroke, radius 101.
const S = "var(--s)";
const THICK = 14 / 220;
const MID = 101 / 220;
const CAP_TOP = 0.5 - MID - THICK / 2;
// Past 180° the two half-discs meet at 6 o'clock. The left one reaches 1px
// across the join so no anti-aliasing seam shows. It is invisible (opacity 0)
// until the sweep passes 180°, so the overlap can't show up as a hairline
// below the halfway mark.
const OVERLAP = "1px";

const px = (k: number) => `calc(${S} * ${k.toFixed(5)})`;

// Cuts the annulus (ring) out of the square layers underneath.
const RING_MASK =
  "radial-gradient(circle closest-side, transparent 85.2%, #000 85.8%, #000 97.8%, transparent 98.4%)";

const GRADIENT = "linear-gradient(45deg, var(--macro-protein), var(--macro-protein-glow))";

// The fill colour: the coral gradient, crossfading to green once the goal is
// reached. Kept in screen orientation (callers counter-rotate it).
function Paint({ reached }: { reached: boolean }) {
  return (
    <>
      <span
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: GRADIENT, opacity: reached ? 0 : 1 }}
      />
      <span
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "var(--success)", opacity: reached ? 1 : 0 }}
      />
    </>
  );
}

function Cap({ reached, counter }: { reached: boolean; counter?: MotionValue<number> | number }) {
  return (
    <span
      className="absolute overflow-hidden rounded-full"
      style={{ width: px(THICK), height: px(THICK), left: px(0.5 - THICK / 2), top: px(CAP_TOP) }}
    >
      <m.span
        className="absolute"
        style={{
          width: S,
          height: S,
          left: px(THICK / 2 - 0.5),
          top: px(MID + THICK / 2 - 0.5),
          rotate: counter,
        }}
      >
        <Paint reached={reached} />
      </m.span>
    </span>
  );
}

const BURST_COLORS = ["var(--success)", "var(--macro-protein)", "var(--macro-protein-glow)", "var(--success)"];
// Fan of particles over the top half of the ring, where the arc closes.
const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = (-170 + (160 / 13) * i) * (Math.PI / 180);
  const dist = i % 2 === 0 ? 62 : 42;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, color: BURST_COLORS[i % 4], size: i % 3 === 0 ? 7 : 5 };
});

export default function ProteinRing({ consumed, target }: { consumed: number; target: number }) {
  const reduce = useReducedMotion();
  const pct = target > 0 ? consumed / target : 0;
  const reached = pct >= 1;
  const targetDeg = Math.min(pct, 1) * 360;

  // Reduced motion: no animated values at all. The angle is rendered as plain
  // static numbers instead (Motion's derived values don't recompute for a
  // value that is set outside an animation, which would leave the ring empty).
  const fixed = Math.min(360, Math.max(0, targetDeg));
  const fixedRight = Math.min(fixed, 180);
  const fixedLeft = Math.max(fixed - 180, 0);

  // theta is the animated sweep angle in degrees (a spring, so it can
  // overshoot slightly before settling). Everything else derives from it.
  const theta = useMotionValue(0);
  const sweep = useTransform(theta, (v) => Math.min(360, Math.max(0, v)));
  const rightDeg = useTransform(sweep, (v) => Math.min(v, 180));
  const rightInv = useTransform(rightDeg, (v) => -v);
  const leftDeg = useTransform(sweep, (v) => Math.max(v - 180, 0));
  const leftInv = useTransform(leftDeg, (v) => -v);
  const sweepInv = useTransform(sweep, (v) => -v);
  const fillOpacity = useTransform(sweep, [0, 2], [0, 1]);
  const leftOpacity = useTransform(leftDeg, [0, 0.4], [0, 1]);

  const firstRun = useRef(true);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(theta, targetDeg, {
      type: "spring",
      stiffness: 110,
      damping: 14,
      delay: firstRun.current ? 0.25 : 0,
    });
    firstRun.current = false;
    return () => controls.stop();
  }, [targetDeg, reduce, theta]);

  // Burst + pop only when the goal is crossed *during this visit* — never on
  // page load, even if the goal was already met.
  const [burst, setBurst] = useState(0);
  const wasReached = useRef(reached);
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reached && !wasReached.current && !reduce) {
      setBurst((n) => n + 1);
      if (popRef.current) {
        animate(popRef.current, { scale: [1, 1.06, 1] }, { duration: 0.55, delay: 0.4, ease: "easeOut" });
      }
    }
    wasReached.current = reached;
  }, [reached, reduce]);

  return (
    <div className="relative [--s:220px] sm:[--s:260px]" style={{ width: S, height: S } as CSSProperties}>
      <div ref={popRef} className="absolute inset-0">
        {/* Decorative — the numbers below carry the same information as text. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden"
          style={{ maskImage: RING_MASK, WebkitMaskImage: RING_MASK }}
        >
          <span className="absolute inset-0" style={{ background: "var(--macro-protein-soft)" }} />

          <m.div className="absolute inset-0" style={{ opacity: reduce ? Math.min(1, fixed / 2) : fillOpacity }}>
            {/* 0°–180°: right half window, sweeping half-disc */}
            <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 50%)" }}>
              <m.div className="absolute inset-0" style={{ rotate: reduce ? fixedRight : rightDeg }}>
                <div className="absolute inset-0" style={{ clipPath: "inset(0 50% 0 0)" }}>
                  <m.div className="absolute inset-0" style={{ rotate: reduce ? -fixedRight : rightInv }}>
                    <Paint reached={reached} />
                  </m.div>
                </div>
              </m.div>
            </div>

            {/* 180°–360°: left half window */}
            <m.div className="absolute inset-0" style={{ opacity: reduce ? (fixedLeft > 0 ? 1 : 0) : leftOpacity, clipPath: `inset(0 calc(50% - ${OVERLAP}) 0 0)` }}>
              <m.div className="absolute inset-0" style={{ rotate: reduce ? fixedLeft : leftDeg }}>
                <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 calc(50% - ${OVERLAP}))` }}>
                  <m.div className="absolute inset-0" style={{ rotate: reduce ? -fixedLeft : leftInv }}>
                    <Paint reached={reached} />
                  </m.div>
                </div>
              </m.div>
            </m.div>

            <Cap reached={reached} />
            <m.div className="absolute inset-0" style={{ rotate: reduce ? fixed : sweep }}>
              <Cap reached={reached} counter={reduce ? -fixed : sweepInv} />
            </m.div>
          </m.div>
        </div>
      </div>

      {burst > 0 && !reduce && (
        <span key={burst} aria-hidden="true" className="pointer-events-none absolute left-1/2" style={{ top: px(0.5 - MID) }}>
          {BURST.map((p, i) => (
            <m.span
              key={i}
              className="absolute rounded-full"
              style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, background: p.color }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
              animate={{ x: p.dx, y: p.dy, opacity: [0, 1, 1, 0], scale: 0.35 }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                ease: [0.2, 0.8, 0.2, 1],
                // Invisible until launch, fully visible for the first half of the flight, then fade.
                opacity: { duration: 0.8, delay: 0.4, times: [0, 0.02, 0.5, 1], ease: "linear" },
              }}
            />
          ))}
        </span>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase mb-1">Protein</span>
        <span
          className="font-heading text-[56px] leading-[60px] font-semibold tabular-nums"
          aria-label={`${Math.round(consumed)} grams of protein`}
        >
          <CountUp value={consumed} />
          <span className="text-2xl text-muted font-medium">g</span>
        </span>
        <span className="text-sm text-muted tabular-nums mt-1">of {Math.round(target)}g</span>
      </div>
    </div>
  );
}
