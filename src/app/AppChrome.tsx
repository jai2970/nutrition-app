"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavLinks from "./NavLinks";

// The landing page at "/" is full-bleed, so the app's top bar and bottom
// padding are skipped there.
export function TopBar() {
  if (usePathname() === "/") return null;
  return (
    <nav className="border-b border-border bg-surface/60">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-6 px-6 h-14 text-sm font-medium">
        <Link
          href="/dashboard"
          aria-label="Macroly — go to Today"
          className="font-heading font-semibold text-primary tracking-tight hover:opacity-80 transition-opacity"
        >
          Macroly
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          <NavLinks />
        </div>
      </div>
    </nav>
  );
}

export function Body({ children }: { children: React.ReactNode }) {
  const landing = usePathname() === "/";
  return (
    <div className={`flex flex-1 flex-col ${landing ? "" : "pb-28 sm:pb-0"}`}>{children}</div>
  );
}
