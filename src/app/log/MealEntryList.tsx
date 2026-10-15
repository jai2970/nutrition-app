"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { deleteFoodEntry } from "./actions";
import LocalTime from "@/app/dashboard/LocalTime";
import { useToast } from "@/app/Toaster";

type Entry = {
  id: string;
  name: string;
  isEstimate: boolean;
  grams: number;
  calories: number;
  protein: number;
  consumedAt: string;
};

export default function MealEntryList({ entries }: { entries: Entry[] }) {
  const knownIds = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();

  function handleDelete(e: FormEvent<HTMLFormElement>, entry: Entry) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setRemovingId(entry.id);
    startTransition(async () => {
      try {
        const result = await deleteFoodEntry(formData);
        if (result.status === "error") {
          setRemovingId(null);
          toast.error(result.message);
        } else {
          toast.success(`Removed ${entry.name} from your log.`);
        }
      } catch {
        setRemovingId(null);
        toast.error("Couldn't remove that entry. Please try again.");
      }
    });
  }

  useEffect(() => {
    const currentIds = new Set(entries.map((e) => e.id));
    const previouslyKnown = knownIds.current;
    knownIds.current = currentIds;

    // Skip the very first mount — only animate entries that appear on a
    // later update (i.e. were just added), not the page's existing history.
    if (previouslyKnown === null) return;

    const newlyAdded = [...currentIds].filter((id) => !previouslyKnown.has(id));
    if (newlyAdded.length > 0) {
      setFreshIds(new Set(newlyAdded));
      const timer = setTimeout(() => setFreshIds(new Set()), 1200);
      return () => clearTimeout(timer);
    }
  }, [entries]);

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const isFresh = freshIds.has(entry.id);
        const isRemoving = removingId === entry.id;

        return (
          <li
            key={entry.id}
            className={`row-collapse ${isFresh ? "animate-row-in" : ""}`}
            style={{ gridTemplateRows: isRemoving ? "0fr" : "1fr", opacity: isRemoving ? 0 : 1 }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={`group flex items-center gap-3 min-h-16 rounded-2xl border px-3 transition-colors duration-700 ${
                  isFresh ? "border-primary/40 bg-primary-soft" : "border-border bg-surface"
                }`}
              >
                <span
                  className="hidden min-[360px]:inline-flex h-10 w-10 shrink-0 rounded-xl bg-background text-primary-ink font-heading font-semibold text-lg items-center justify-center"
                  aria-hidden="true"
                >
                  {entry.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-5 flex flex-wrap items-center gap-x-1.5 break-words">
                    <span className="min-w-0 break-words">{entry.name}</span>
                    {entry.isEstimate && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary-soft text-primary-ink">
                        AI estimate
                      </span>
                    )}
                  </p>
                  <p className="text-[13px] text-muted leading-5 whitespace-nowrap">
                    {Math.round(entry.grams)}g · <LocalTime iso={entry.consumedAt} />
                  </p>
                </div>

                <div className="text-right tabular-nums shrink-0">
                  <p className="text-base font-semibold leading-5 text-primary-ink">
                    {Math.round(entry.protein)}g
                  </p>
                  <p className="text-[13px] text-muted leading-5">{Math.round(entry.calories)} kcal</p>
                </div>

                <form onSubmit={(e) => handleDelete(e, entry)}>
                  <input type="hidden" name="entryId" value={entry.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center h-11 w-11 -mr-2 rounded-full text-muted hover:bg-primary-soft hover:text-primary-ink active:scale-90 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:group-focus-within:opacity-100"
                    aria-label={`Remove ${entry.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
