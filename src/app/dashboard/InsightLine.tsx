"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import type { Insight } from "@/lib/insight";

const TONE_STYLE: Record<Insight["tone"], string> = {
  empty: "text-foreground",
  gap: "text-foreground",
  done: "text-success-ink",
  over: "text-over",
};

// The one-line insight under the ring. When logging changes it, the old line
// fades out and the new one fades in (instead of swapping abruptly). The
// first render is not animated, and reduced motion shows plain text.
export default function InsightLine({ insight }: { insight: Insight }) {
  const reduce = useReducedMotion();
  return (
    <div aria-live="polite" className="mt-6 max-w-[34ch] text-center">
      <AnimatePresence mode="wait" initial={false}>
        <m.p
          key={insight.text}
          className={`text-base leading-6 font-medium ${TONE_STYLE[insight.tone]}`}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
        >
          {insight.text}
        </m.p>
      </AnimatePresence>
    </div>
  );
}
