import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "var(--primary-soft)" }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="var(--primary)" strokeWidth={4} strokeLinecap="round">
            <circle cx="24" cy="24" r="16" />
            <path d="M24 8a16 16 0 0 1 14.4 9" stroke="var(--macro-protein-glow)" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-[28px] leading-9 font-semibold">That page isn&apos;t on the menu</h1>
          <p className="text-muted">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back to your day.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full bg-primary text-white font-semibold h-12 px-8 hover:opacity-90 active:scale-[0.97] transition-all"
        >
          Back to Today
        </Link>
      </div>
    </main>
  );
}
