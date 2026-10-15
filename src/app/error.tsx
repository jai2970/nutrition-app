"use client";

import Link from "next/link";
import { useEffect } from "react";

// Last-resort fallback for an unexpected crash while rendering a page, so
// people see a friendly screen with a way out instead of a blank error.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-[28px] leading-9 font-semibold">Something went wrong</h1>
          <p className="text-muted">That didn&apos;t load properly. Please try again, or head back to Today.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-primary text-white font-semibold h-12 px-8 hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-border font-semibold h-12 px-8 hover:bg-surface active:scale-[0.97] transition-all"
          >
            Back to Today
          </Link>
        </div>
      </div>
    </main>
  );
}
