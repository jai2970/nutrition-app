"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, animate, m, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
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

// Swipe a row this far left (or flick it quickly) to delete it. The delete
// button on the row keeps working for everyone who prefers tapping.
const SWIPE_DELETE_PX = 96;
const SWIPE_FLICK_VELOCITY = 520;

export default function MealEntryList({ entries, animateFirstRows = false }: { entries: Entry[]; animateFirstRows?: boolean }) {
  const reduce = useReducedMotion();
  const knownIds = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  // Rows hidden immediately when deleted (optimistic), so the exit animation
  // starts right away instead of waiting for the server round trip.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => {
    const currentIds = new Set(entries.map((e) => e.id));
    const previouslyKnown = knownIds.current;
    knownIds.current = currentIds;

    // Skip the very first mount — only highlight entries that appear on a
    // later update (i.e. were just added), not the page's existing history.
    if (previouslyKnown === null) return;

    const newlyAdded = [...currentIds].filter((id) => !previouslyKnown.has(id));
    if (newlyAdded.length > 0) {
      setFreshIds(new Set(newlyAdded));
      const timer = setTimeout(() => setFreshIds(new Set()), 1600);
      return () => clearTimeout(timer);
    }
  }, [entries]);

  function setHidden(id: string, hidden: boolean) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function removeEntry(entry: Entry) {
    const formData = new FormData();
    formData.set("entryId", entry.id);
    setHidden(entry.id, true);
    startTransition(async () => {
      try {
        const result = await deleteFoodEntry(formData);
        if (result.status === "error") {
          setHidden(entry.id, false);
          toast.error(result.message);
        } else {
          toast.success(`Removed ${entry.name} from your log.`);
        }
      } catch {
        setHidden(entry.id, false);
        toast.error("Couldn't remove that entry. Please try again.");
      }
    });
  }

  const visible = entries.filter((e) => !hiddenIds.has(e.id));
  const rowSpring = { type: "spring", stiffness: 420, damping: 36 } as const;

  return (
    <ul className="relative flex flex-col gap-2">
      <AnimatePresence initial={animateFirstRows} mode="popLayout">
        {visible.map((entry) => {
          const isFresh = freshIds.has(entry.id);
          return (
            <m.li
              key={entry.id}
              layout="position"
              initial={reduce ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: -48, transition: { duration: 0.18, ease: "easeIn" } }}
              transition={{ layout: reduce ? { duration: 0 } : rowSpring, y: reduce ? { duration: 0 } : rowSpring, opacity: { duration: reduce ? 0 : 0.2 } }}
            >
              <SwipeToDelete onDelete={() => removeEntry(entry)} reduce={!!reduce}>
                {/* "Just added" glow — an overlay that fades out (opacity only). */}
                {isFresh && !reduce && (
                  <m.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/40 bg-primary-soft"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                  />
                )}
                <span
                  className="relative hidden min-[360px]:inline-flex h-10 w-10 shrink-0 rounded-xl bg-background text-primary-ink font-heading font-semibold text-lg items-center justify-center"
                  aria-hidden="true"
                >
                  {entry.name.charAt(0).toUpperCase()}
                </span>

                <div className="relative min-w-0 flex-1">
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

                <div className="relative text-right tabular-nums shrink-0">
                  <p className="text-base font-semibold leading-5 text-primary-ink">{Math.round(entry.protein)}g</p>
                  <p className="text-[13px] text-muted leading-5">{Math.round(entry.calories)} kcal</p>
                </div>

                <button
                  type="button"
                  onClick={() => removeEntry(entry)}
                  className="relative inline-flex items-center justify-center h-11 w-11 -mr-2 rounded-full text-muted hover:bg-primary-soft hover:text-primary-ink active:scale-90 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:group-focus-within:opacity-100"
                  aria-label={`Remove ${entry.name}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </SwipeToDelete>
            </m.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

// Wraps a row's card so it can be dragged left to reveal a delete action.
// Horizontal drags are claimed by the row; vertical drags still scroll the
// page. Releasing short of the threshold springs back.
function SwipeToDelete({ children, onDelete, reduce }: { children: ReactNode; onDelete: () => void; reduce: boolean }) {
  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-SWIPE_DELETE_PX, -24, 0], [1, 0.5, 0]);
  const iconScale = useTransform(x, [-SWIPE_DELETE_PX, -40], [1, 0.7]);

  function handleDragEnd(_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const farEnough = info.offset.x < -SWIPE_DELETE_PX;
    const flicked = info.velocity.x < -SWIPE_FLICK_VELOCITY && info.offset.x < -40;
    if (farEnough || flicked) {
      onDelete();
    } else {
      animate(x, 0, reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 });
    }
  }

  return (
    <div className="relative">
      <m.div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-end rounded-2xl bg-primary pr-5 text-white"
        style={{ opacity: actionOpacity }}
      >
        <m.svg style={{ scale: iconScale }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </m.svg>
      </m.div>
      <m.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -SWIPE_DELETE_PX * 1.6, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="group relative flex items-center gap-3 min-h-16 rounded-2xl border border-border bg-surface px-3"
      >
        {children}
      </m.div>
    </div>
  );
}
