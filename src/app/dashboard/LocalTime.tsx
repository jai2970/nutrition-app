"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function format(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

// Renders a timestamp in the visitor's own timezone. The server has no idea
// what that is, so it renders nothing and the client fills it in right after
// hydration (same trick as Greeting) — no markup mismatch.
export default function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => format(iso),
    () => "",
  );
  return <>{text}</>;
}
