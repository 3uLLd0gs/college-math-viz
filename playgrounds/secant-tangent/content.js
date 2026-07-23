/* ---- CONTENT: the FUNCTIONS registry — the only part that changes per concept ----
   Each row carries f and its analytic derivative, so the page can show the true
   tangent slope beside the secant estimate rather than comparing one numerical
   guess against another.

   `probe` is where the tangent point starts. It is off any inflection or
   symmetry point, so the secant visibly differs from the tangent at the opening
   value of h. */
export const FUNCTIONS = [
  { id: 'square', label: 'x²', tex: 'x²',
    f: x => x * x, df: x => 2 * x,
    probe: 0.8, view: { xmin: -2.6, xmax: 2.6, ymin: -1.2, ymax: 5.2 } },

  { id: 'cubic', label: 'x³ − 2x', tex: 'x³ − 2x',
    f: x => x * x * x - 2 * x, df: x => 3 * x * x - 2,
    probe: 1.05, view: { xmin: -2.4, xmax: 2.4, ymin: -3.4, ymax: 3.4 } },

  { id: 'sin', label: 'sin x', tex: 'sin x',
    f: x => Math.sin(x), df: x => Math.cos(x),
    probe: 0.7, view: { xmin: -3.6, xmax: 3.6, ymin: -1.6, ymax: 1.6 } },

  { id: 'exp', label: 'eˣ', tex: 'eˣ',
    f: x => Math.exp(x), df: x => Math.exp(x),
    probe: 0.6, view: { xmin: -2.2, xmax: 2, ymin: -0.8, ymax: 6 } },

  { id: 'recip', label: '1/x', tex: '1/x',
    f: x => 1 / x, df: x => -1 / (x * x),
    probe: 1.3, view: { xmin: 0.25, xmax: 3.4, ymin: -0.4, ymax: 3.6 },
    domain: [0.3, 3.2] },
];

/** The difference quotient — the secant slope through x₀ and x₀ + h. */
export const secantSlope = (fn, x0, h) => (fn.f(x0 + h) - fn.f(x0)) / h;

/** How far the secant estimate sits from the true derivative. */
export const slopeError = (fn, x0, h) => Math.abs(secantSlope(fn, x0, h) - fn.df(x0));

/** Where the probe may sit, clamped to a function's own domain if it has one. */
export function clampProbe(fn, x) {
  const [lo, hi] = fn.domain ?? [fn.view.xmin + 0.15, fn.view.xmax - 0.15];
  return Math.max(lo, Math.min(hi, x));
}

/** The second point of the secant must stay inside the domain too. */
export function clampStep(fn, x0, h) {
  const [, hi] = fn.domain ?? [fn.view.xmin, fn.view.xmax - 0.05];
  return Math.min(h, Math.max(1e-3, hi - x0));
}
