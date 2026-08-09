"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileUpdatedToast() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Drop the ?updated=1 query param immediately so it doesn't linger in
    // the address bar or get re-triggered by a refresh/back navigation.
    router.replace("/dashboard", { scroll: false });
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="rounded-lg px-4 py-2 text-sm font-medium mb-6 animate-fade-in"
      style={{ background: "var(--success-soft)", color: "var(--success-ink)" }}
    >
      Profile updated.
    </div>
  );
}
