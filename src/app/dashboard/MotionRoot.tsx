"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./motionFeatures").then((mod) => mod.default);

// One place that configures Motion for the Today page:
// - LazyMotion (strict): components use the tiny `m.*` primitives and the
//   animation engine is fetched after first paint.
// - reducedMotion="user": when the device asks for reduced motion, Motion
//   skips transform and layout animations. Components below also check
//   useReducedMotion() so opacity animations and effects switch off too.
export default function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
