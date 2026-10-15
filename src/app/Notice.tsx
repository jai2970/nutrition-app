import type { ReactNode } from "react";

export type NoticeTone = "success" | "error";

const TONE_STYLE: Record<NoticeTone, { background: string; color: string }> = {
  success: { background: "var(--success-soft)", color: "var(--success-ink)" },
  error: { background: "var(--primary-soft)", color: "var(--primary-ink)" },
};

// The one visual style for every success/error message in the app — used
// directly for inline form messages and wrapped by the toaster for
// action feedback, so both always look the same.
export default function Notice({
  tone,
  children,
  className = "",
}: {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${className}`}
      style={TONE_STYLE[tone]}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 shrink-0 -mt-px"
        aria-hidden="true"
      >
        {tone === "success" ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.7 2.7L16 9.8" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.4v.1" />
          </>
        )}
      </svg>
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}
