"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/Toaster";

// Shown after a returning user saves their profile (updateProfile redirects
// here with ?updated=1). Renders nothing itself — the confirmation goes
// through the shared toaster so it looks like every other message.
export default function ProfileUpdatedToast() {
  const router = useRouter();
  const toast = useToast();
  const shown = useRef(false);

  useEffect(() => {
    // Once only — React dev mode replays effects on mount.
    if (!shown.current) {
      shown.current = true;
      toast.success("Profile saved.");
    }
    // Drop the ?updated=1 query param immediately so it doesn't linger in
    // the address bar or get re-triggered by a refresh/back navigation.
    router.replace("/dashboard", { scroll: false });
  }, [router, toast]);

  return null;
}
