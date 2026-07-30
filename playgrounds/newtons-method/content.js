/* ---- CONTENT: the FUNCTIONS registry — the only part that changes per concept ----
   Each row carries f, its analytic derivative df, its real roots, and a `start`
   where the iteration begins. Four functions cover the whole story: one that
   always converges, and the three classic ways Newton's method fails. */
export const FUNCTIONS = [
  { id: 'cosx', label: 'cos x − x', tex: 'cos x − x',
    f: x => Math.cos(x) - x, df: x => -Math.sin(x) - 1,
    roots: [0.7390851332151607], start: -0.5,
    view: { xmin: -2, xmax: 3, ymin: -3, ymax: 2 }, challenge: { tol: 1e-4 } },

  { id: 'quad', label: 'x² − 2', tex: 'x² − 2',
    f: x => x * x - 2, df: x => 2 * x,
    roots: [-Math.SQRT2, Math.SQRT2], start: 2,
    view: { xmin: -3, xmax: 3, ymin: -3, ymax: 4 }, challenge: { tol: 1e-4 },
    note: 'Start exactly at x = 0 and the tangent is flat — the estimate is flung to infinity.' },

  { id: 'cubic', label: 'x³ − x', tex: 'x³ − x',
    f: x => x * x * x - x, df: x => 3 * x * x - 1,
    roots: [-1, 0, 1], start: 1.2,
    view: { xmin: -2, xmax: 2, ymin: -1.6, ymax: 1.6 }, challenge: { tol: 1e-4 },
    note: 'Nudge the start just a little and Newton lands on a different one of the three roots.' },

  { id: 'cycle', label: 'x³ − 2x + 2', tex: 'x³ − 2x + 2',
    f: x => x * x * x - 2 * x + 2, df: x => 3 * x * x - 2,
    roots: [-1.7692923542386314], start: -2.4,
    view: { xmin: -3, xmax: 2, ymin: -3, ymax: 6 }, challenge: { tol: 1e-4 },
    note: 'Start at x = 0 and Newton cycles 0 → 1 → 0 → 1 forever, never reaching the root.' },
];

const FLAT = 1e-7;   // |f′| below this is a flat tangent — the next estimate flings off

/** One Newton iteration x − f(x)/f′(x). Returns NaN when the tangent is flat
   (division would fling the estimate to infinity), so callers can stop cleanly. */
export function newtonStep(fn, x) {
  const d = fn.df(x);
  if (!Number.isFinite(d) || Math.abs(d) < FLAT) return NaN;
  const next = x - fn.f(x) / d;
  return Number.isFinite(next) ? next : NaN;
}

/** The sequence [x0, x1, …] of up to `steps` Newton iterations. Stops early
   (returns a shorter array) as soon as a step flings — so `seq.length < steps+1`
   is exactly the "flung" signal. */
export function newtonRun(fn, x0, steps) {
  const seq = [x0];
  for (let i = 0; i < steps; i++) {
    const next = newtonStep(fn, seq[seq.length - 1]);
    if (!Number.isFinite(next)) break;
    seq.push(next);
  }
  return seq;
}

/** The registry root nearest x — used to report which root the iteration is
   heading for (and, for the cubic, which basin a start belongs to). */
export function nearestRoot(fn, x) {
  return fn.roots.reduce((best, r) => (Math.abs(r - x) < Math.abs(best - x) ? r : best), fn.roots[0]);
}
