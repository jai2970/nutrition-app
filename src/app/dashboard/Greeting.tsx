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
    <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
      {greeting}, {name}
    </h1>
  );
}
