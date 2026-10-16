import { GoogleGenAI } from "@google/genai";

// Shared client for anything hitting the Gemini API — meal parsing
// (gemini.ts), embeddings, and the diet advisor's answer generation
// (rag.ts) all go through this one lazily-created instance.
let client: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// --- Resilient calls ------------------------------------------------------
//
// Every Gemini request that a user is waiting on goes through runGeminiCall:
// per-attempt timeout, short retries on transient failures, one optional
// attempt on a fallback model, and a hard ceiling on total time so a spinner
// can never hang. Keep this section free of "@/..." imports so the unit tests
// can load it directly.

export const GEMINI_ATTEMPT_TIMEOUT_MS = 12_000;
export const GEMINI_RETRY_DELAYS_MS = [1_000, 2_000];
export const GEMINI_TOTAL_CEILING_MS = 30_000;
// Time held back for the fallback-model attempt so a slow primary can't
// starve it.
const FALLBACK_RESERVE_MS = 10_000;
// Not worth starting an attempt with less time than this.
const MIN_ATTEMPT_MS = 1_000;

export const GEMINI_BUSY_MESSAGE = "Gemini is busy right now. Try again in a minute.";

export class GeminiTimeoutError extends Error {
  constructor(ms: number) {
    super(`Gemini call timed out after ${ms}ms`);
    this.name = "GeminiTimeoutError";
  }
}

/** Thrown when every attempt failed with a transient error (or time ran out). */
export class GeminiBusyError extends Error {
  readonly lastError: unknown;
  constructor(label: string, lastError: unknown) {
    super(`${GEMINI_BUSY_MESSAGE} (${label}: ${lastError instanceof Error ? lastError.message : String(lastError)})`);
    this.name = "GeminiBusyError";
    this.lastError = lastError;
  }
}

const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
]);
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: unknown; code?: unknown; message?: unknown } | null;
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.code === "number") return e.code;
  // SDK errors sometimes only carry the status inside a JSON message body.
  const m = typeof e?.message === "string" ? e.message.match(/"code"\s*:\s*(\d{3})|status[^0-9]{0,4}(\d{3})/i) : null;
  const n = m ? Number(m[1] ?? m[2]) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** "retry" = transient (503/429/timeout/network); "fatal" = never retry (400, 401, bad key, ...). */
export function classifyGeminiError(err: unknown): "retry" | "fatal" {
  if (err instanceof GeminiTimeoutError) return "retry";
  const e = err as { name?: string; message?: string; code?: unknown; cause?: { code?: unknown } } | null;
  if (e?.name === "AbortError" || e?.name === "TimeoutError") return "retry";
  const status = statusOf(err);
  if (status !== undefined) return RETRYABLE_STATUSES.has(status) ? "retry" : "fatal";
  const code = typeof e?.code === "string" ? e.code : typeof e?.cause?.code === "string" ? e.cause.code : undefined;
  if (code && NETWORK_ERROR_CODES.has(code)) return "retry";
  if (e?.name === "TypeError" && /fetch failed|network/i.test(e.message ?? "")) return "retry";
  return "fatal";
}

export type GeminiRunContext = { model: string; signal: AbortSignal };

export type RunGeminiCallOptions = {
  /** Epoch ms by which the whole call (all attempts) must be finished. Default: now + 30s. */
  deadlineAt?: number;
};

function describe(err: unknown): string {
  if (err instanceof GeminiTimeoutError) return "timeout";
  const status = statusOf(err);
  if (status !== undefined) return String(status);
  return err instanceof Error ? err.message.slice(0, 80).replace(/\s+/g, " ") : "error";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptOnce<T>(run: (ctx: GeminiRunContext) => Promise<T>, model: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new GeminiTimeoutError(timeoutMs));
    }, timeoutMs);
  });
  const work = run({ model, signal: controller.signal });
  work.catch(() => {}); // a call that loses the race must not become an unhandled rejection
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs one logical Gemini request resiliently:
 *  - each attempt is aborted after 12s;
 *  - transient failures (503, 429, 5xx, timeouts, network) are retried up to
 *    twice, after 1s then 2s; 400/401 and other errors fail immediately;
 *  - if the primary model is still failing, ONE attempt is made on the model
 *    named in GEMINI_FALLBACK_MODEL (skipped when unset);
 *  - everything stays inside a 30s ceiling (or opts.deadlineAt).
 * Throws GeminiBusyError when only transient failures were seen; any other
 * error is rethrown unchanged. Each attempt logs one line.
 */
export async function runGeminiCall<T>(
  label: string,
  primaryModel: string,
  run: (ctx: GeminiRunContext) => Promise<T>,
  opts: RunGeminiCallOptions = {},
): Promise<T> {
  const deadline = opts.deadlineAt ?? Date.now() + GEMINI_TOTAL_CEILING_MS;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim();
  const hasFallback = !!fallbackModel && fallbackModel !== primaryModel;
  const primaryDeadline = hasFallback ? deadline - FALLBACK_RESERVE_MS : deadline;
  const maxAttempts = GEMINI_RETRY_DELAYS_MS.length + 1;

  let lastError: unknown = new Error("no time left to call Gemini");

  const tryModel = async (model: string, tag: string, budgetMs: number): Promise<{ ok: true; value: T } | { ok: false }> => {
    const started = Date.now();
    try {
      const value = await attemptOnce(run, model, budgetMs);
      console.log(`[gemini] call=${label} attempt=${tag} model=${model} result=ok ms=${Date.now() - started}`);
      return { ok: true, value };
    } catch (err) {
      const kind = classifyGeminiError(err);
      console.log(
        `[gemini] call=${label} attempt=${tag} model=${model} result=${kind === "retry" ? "transient" : "fatal"} error=${describe(err)} ms=${Date.now() - started}`,
      );
      if (kind === "fatal") throw err;
      lastError = err;
      return { ok: false };
    }
  };

  for (let i = 0; i < maxAttempts; i++) {
    const budget = Math.min(GEMINI_ATTEMPT_TIMEOUT_MS, primaryDeadline - Date.now());
    if (budget < MIN_ATTEMPT_MS) break;
    const res = await tryModel(primaryModel, `${i + 1}/${maxAttempts}`, budget);
    if (res.ok) return res.value;
    if (i < maxAttempts - 1) {
      const delay = GEMINI_RETRY_DELAYS_MS[i];
      if (primaryDeadline - Date.now() < delay + MIN_ATTEMPT_MS) break;
      await sleep(delay);
    }
  }

  if (hasFallback) {
    const budget = Math.min(GEMINI_ATTEMPT_TIMEOUT_MS, deadline - Date.now());
    if (budget >= MIN_ATTEMPT_MS) {
      const res = await tryModel(fallbackModel, "fallback", budget);
      if (res.ok) return res.value;
    }
  }

  throw new GeminiBusyError(label, lastError);
}
