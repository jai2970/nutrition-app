"use client";

import { useSyncExternalStore } from "react";
import { getGreetingForHour } from "@/lib/nutrition";

const noopSubscribe = () => () => {};

export default function Greeting({
  name,
  initialGreeting,
}: {
  name: string | null;
  initialGreeting: string;
}) {
  // The server can only guess (IST fallback) since it doesn't know the
  // visitor's timezone. useSyncExternalStore lets the client snapshot (the
  // browser's real local time) take over right after hydration, matching
  // the server-rendered markup exactly on first paint so there's no
  // mismatch — no setState-in-effect render cascade needed either.
  const greeting = useSyncExternalStore(
    noopSubscribe,
    () => getGreetingForHour(new Date().getHours()),
    () => initialGreeting,
  );

  return (
    <h1 className="font-heading text-[28px] leading-9 sm:text-[32px] sm:leading-[38px] font-semibold">
      {name ? `${greeting}, ${name}` : "Welcome back"}
    </h1>
  );
}
