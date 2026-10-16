// Tiny per-request timing log. Wrap the awaited steps of a page/action and
// call end() once; it prints one line, e.g.
//   [timing] today total=212ms auth=48ms user=31ms foods=40ms week=96ms
// Steps that run in parallel overlap, so their durations can add up to more
// than the total — that is the point of running them in parallel.
export function startTimer(label: string) {
  const t0 = performance.now();
  const steps: string[] = [];

  function track<T>(name: string, work: PromiseLike<T>): Promise<T> {
    const s = performance.now();
    const record = () => steps.push(`${name}=${Math.round(performance.now() - s)}ms`);
    return Promise.resolve(work).then(
      (value) => {
        record();
        return value;
      },
      (err) => {
        record();
        throw err;
      },
    );
  }

  function end(extra = "") {
    const total = Math.round(performance.now() - t0);
    console.log(`[timing] ${label} total=${total}ms ${steps.join(" ")}${extra ? ` ${extra}` : ""}`.trimEnd());
    return total;
  }

  return { track, end };
}
