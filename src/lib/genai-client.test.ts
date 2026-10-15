import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  GeminiBusyError,
  GEMINI_ATTEMPT_TIMEOUT_MS,
  GEMINI_TOTAL_CEILING_MS,
  classifyGeminiError,
  runGeminiCall,
} from "./genai-client";

// Lets pending promise callbacks run, then moves the fake clock.
async function advance(ms: number) {
  for (let i = 0; i < 30; i++) await Promise.resolve();
  mock.timers.tick(ms);
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

const apiError = (status: number) => Object.assign(new Error(`status ${status}`), { status });

describe("runGeminiCall", () => {
  let logs: string[];

  beforeEach(() => {
    mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
    logs = [];
    mock.method(console, "log", (line: string) => logs.push(line));
    delete process.env.GEMINI_FALLBACK_MODEL;
  });

  afterEach(() => {
    mock.timers.reset();
    mock.restoreAll();
    delete process.env.GEMINI_FALLBACK_MODEL;
  });

  it("succeeds on the first try", async () => {
    const calls: string[] = [];
    const result = await runGeminiCall("meal-text", "main-model", async ({ model }) => {
      calls.push(model);
      return "ok";
    });
    assert.equal(result, "ok");
    assert.deepEqual(calls, ["main-model"]);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /call=meal-text attempt=1\/3 model=main-model result=ok/);
  });

  it("succeeds after a retry (503 then ok), waiting 1s in between", async () => {
    let n = 0;
    const p = runGeminiCall("meal-text", "main-model", async () => {
      if (++n === 1) throw apiError(503);
      return "recovered";
    });
    await advance(999);
    assert.equal(n, 1, "should still be backing off");
    await advance(1);
    assert.equal(await p, "recovered");
    assert.equal(n, 2);
    assert.equal(logs.length, 2);
    assert.match(logs[0], /attempt=1\/3 .*result=transient error=503/);
    assert.match(logs[1], /attempt=2\/3 .*result=ok/);
  });

  it("uses the fallback model after the primary keeps failing", async () => {
    process.env.GEMINI_FALLBACK_MODEL = "backup-model";
    const calls: string[] = [];
    const p = runGeminiCall("food-match", "main-model", async ({ model }) => {
      calls.push(model);
      if (model === "main-model") throw apiError(429);
      return "from-backup";
    });
    await advance(1_000); // after attempt 1
    await advance(2_000); // after attempt 2
    assert.equal(await p, "from-backup");
    assert.deepEqual(calls, ["main-model", "main-model", "main-model", "backup-model"]);
    assert.match(logs[3], /attempt=fallback model=backup-model result=ok/);
  });

  it("fails with GeminiBusyError when every attempt fails (no fallback configured)", async () => {
    let n = 0;
    const p = runGeminiCall("meal-photo", "main-model", async () => {
      n++;
      throw apiError(503);
    });
    const settled = p.then(
      () => assert.fail("should have thrown"),
      (err) => err,
    );
    await advance(1_000);
    await advance(2_000);
    const err = await settled;
    assert.ok(err instanceof GeminiBusyError);
    assert.match(err.message, /Gemini is busy right now\. Try again in a minute\./);
    assert.equal(n, 3, "1 try + 2 retries, and no fallback attempt");
    assert.equal(logs.length, 3);
  });

  it("aborts each attempt at 12s and never runs past the 30s ceiling", async () => {
    let aborted = 0;
    let n = 0;
    const p = runGeminiCall("meal-text", "main-model", ({ signal }) => {
      n++;
      signal.addEventListener("abort", () => aborted++);
      return new Promise<string>(() => {}); // never answers
    });
    const settled = p.then(
      () => assert.fail("should have thrown"),
      (err) => err,
    );
    let elapsed = 0;
    while (elapsed <= GEMINI_TOTAL_CEILING_MS + 5_000) {
      await advance(500);
      elapsed += 500;
      if (logs.length >= 3 && n >= 3 && aborted >= 3) break;
    }
    const err = await settled;
    assert.ok(err instanceof GeminiBusyError);
    assert.equal(aborted, n);
    assert.ok(Date.now() <= GEMINI_TOTAL_CEILING_MS, `took ${Date.now()}ms`);
    assert.match(logs[0], /result=transient error=timeout/);
    assert.ok(GEMINI_ATTEMPT_TIMEOUT_MS === 12_000);
  });

  it("does not retry on 400 or 401, and rethrows the original error", async () => {
    for (const status of [400, 401]) {
      let n = 0;
      await assert.rejects(
        runGeminiCall("meal-text", "main-model", async () => {
          n++;
          throw apiError(status);
        }),
        (err: unknown) => !(err instanceof GeminiBusyError) && (err as { status: number }).status === status,
      );
      assert.equal(n, 1);
    }
  });
});

describe("classifyGeminiError", () => {
  it("treats 503/429/timeouts/network errors as retryable and 400/401 as fatal", () => {
    assert.equal(classifyGeminiError(apiError(503)), "retry");
    assert.equal(classifyGeminiError(apiError(429)), "retry");
    assert.equal(classifyGeminiError(Object.assign(new TypeError("fetch failed"))), "retry");
    assert.equal(classifyGeminiError(Object.assign(new Error("x"), { code: "ECONNRESET" })), "retry");
    assert.equal(classifyGeminiError(new Error('{"error":{"code":503,"message":"high demand"}}')), "retry");
    assert.equal(classifyGeminiError(apiError(400)), "fatal");
    assert.equal(classifyGeminiError(apiError(401)), "fatal");
    assert.equal(classifyGeminiError(new Error("GEMINI_API_KEY is not set.")), "fatal");
  });
});
