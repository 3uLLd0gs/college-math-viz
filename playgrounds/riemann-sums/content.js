/* ---- CONTENT: the INTEGRANDS registry — the only part that changes per concept ----
   `exact` is the closed-form value of ∫f over [a,b], so the readout shows true
   error rather than the gap to a second numerical estimate.

   `tol` is the absolute error that clears the challenge. Each was derived from
   the left-rule error at n = 58, which makes every integrand solvable by every
   rule within the slider's 80 rectangles while still rewarding a smarter rule:
   midpoint clears at n = 4-5 on the asymmetric integrands versus ~58 for left.
   (On `sin` and `gauss` the left and right errors cancel across the symmetric
   interval, so those two converge nearly as fast as midpoint — that contrast is
   the point, not a mistake.)

   Absolute rather than relative tolerance: `cubic` nearly cancels over its
   interval, so relative error there is dominated by the small exact value and
   would make the challenge unreachable. */
export const INTEGRANDS = [
  { id: 'square', label: 'x²', tex: 'x²',
    f: x => x * x, a: 0, b: 2, exact: 8 / 3, tol: 6.9e-2,
    view: { xmin: -0.4, xmax: 2.4, ymin: -0.6, ymax: 4.6 } },

  { id: 'sin', label: 'sin x', tex: 'sin x',
    f: x => Math.sin(x), a: 0, b: Math.PI, exact: 2, tol: 4.9e-4,
    view: { xmin: -0.35, xmax: 3.5, ymin: -0.5, ymax: 1.35 } },

  { id: 'recip', label: '1/x', tex: '1/x',
    f: x => 1 / x, a: 1, b: 3, exact: Math.log(3), tol: 1.2e-2,
    view: { xmin: 0.5, xmax: 3.4, ymin: -0.25, ymax: 1.25 } },

  { id: 'gauss', label: 'e^(−x²)', tex: 'e^(−x²)',
    f: x => Math.exp(-x * x), a: -1.5, b: 1.5, exact: 1.7724538509055159 * erf(1.5), tol: 1.4e-4,
    view: { xmin: -2, xmax: 2, ymin: -0.25, ymax: 1.25 } },

  { id: 'cubic', label: 'x³ − 2x', tex: 'x³ − 2x',
    f: x => x * x * x - 2 * x, a: -1.5, b: 2, exact: 0.984375, tol: 1.3e-1,
    view: { xmin: -2, xmax: 2.4, ymin: -2, ymax: 4.2 } },
];

/* Abramowitz & Stegun 7.1.26 — enough precision to state ∫e^(−x²) exactly
   to more digits than the readout shows. */
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

export const RULES = [
  { id: 'left', label: 'Left', sample: (x0, x1) => x0 },
  { id: 'mid', label: 'Midpoint', sample: (x0, x1) => (x0 + x1) / 2 },
  { id: 'right', label: 'Right', sample: (x0, x1) => x1 },
];

/** The Riemann sum of `fn` over [a,b] with n subintervals under `rule`. */
export function riemannSum(fn, n, rule) {
  const dx = (fn.b - fn.a) / n;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const x0 = fn.a + i * dx;
    total += fn.f(rule.sample(x0, x0 + dx)) * dx;
  }
  return total;
}

/** Each rectangle as {x0, x1, y} — shared by the renderer and the tests. */
export function rectangles(fn, n, rule) {
  const dx = (fn.b - fn.a) / n;
  return Array.from({ length: n }, (_, i) => {
    const x0 = fn.a + i * dx, x1 = x0 + dx;
    return { x0, x1, y: fn.f(rule.sample(x0, x1)) };
  });
}
