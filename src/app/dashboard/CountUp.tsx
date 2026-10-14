"use client";

import { useEffect, useRef, useState } from "react";

// Animates a number toward its new value (400ms ease-out). First paint shows
// the final value so the server and client markup match; later changes —
// i.e. after logging or deleting a meal — count up/down. Honours
// prefers-reduced-motion by jumping straight to the target.
export default function CountUp({ value, duration = 400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const start = current.current;
    const delta = value - start;
    if (delta === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const span = reduce ? 0 : duration;
    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const p = span === 0 ? 1 : Math.min((now - t0) / span, 1);
      const v = start + delta * (1 - Math.pow(1 - p, 3));
      current.current = v;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{Math.round(display).toLocaleString("en-US")}</>;
}
