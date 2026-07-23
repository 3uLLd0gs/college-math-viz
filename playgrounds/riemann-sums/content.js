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

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'Why area under a curve is a sum you never finish',
  intro: `Rectangles have an area you learned at ten: width times height. Curves do not. The
    integral's whole trick is to <b>refuse to deal with the curve</b> — chop the region into thin
    strips, pretend each one is a rectangle, add them up, and then ask what happens as the strips get
    thinner. The answer that number approaches is the integral.`,
  steps: [
    { level: 'intro', title: 'Start crude on purpose',
      body: `Two rectangles is obviously wrong, and being obviously wrong is useful — you can see
        exactly which bits are missing and which are over-counted. Every refinement from here trades
        some of that error away.`,
      state: { fn: 'square', rule: 'left', n: 2 }, jump: 'Show me two rectangles' },

    { level: 'intro', title: 'Where you measure the height matters',
      body: `Each strip needs one height, and the curve offers many. Sample at the <b>left</b> edge of
        a rising curve and every rectangle sits under it — an undercount. Sample at the <b>right</b>
        and every one pokes out. The true area is trapped between them.`,
      state: { fn: 'square', rule: 'right', n: 6 }, jump: 'Show me the overcount' },

    { level: 'use', title: 'The midpoint rule is not a compromise, it is better',
      body: `Sampling the middle lets each rectangle's overshoot cancel its own undershoot. That is not
        just tidier — it changes the <em>rate</em>. Left and right errors shrink like <code>h</code>;
        midpoint shrinks like <code>h²</code>. Halve the strip width and left-rule error halves, but
        midpoint error quarters.`,
      state: { fn: 'square', rule: 'mid', n: 6 }, jump: 'Compare midpoint at the same n' },

    { level: 'use', title: 'Refining is the whole idea',
      body: `Push n up and watch the staircase melt into the curve. The integral is defined as the
        limit of this process — not as a formula. The formulas you memorise later are shortcuts for
        finding that limit without doing the sum.`,
      state: { fn: 'sin', rule: 'left', n: 40 }, jump: 'Refine to forty strips' },

    { level: 'advanced', title: 'Area below the axis counts as negative',
      body: `Where <code>f</code> dips under the x-axis its rectangles hang downward and <em>subtract</em>.
        <code>x³ − 2x</code> does exactly this. So a definite integral is <b>signed</b> area, and a
        curve can enclose plenty of region while integrating to almost nothing.`,
      state: { fn: 'cubic', rule: 'mid', n: 24 }, jump: 'Show me signed area' },

    { level: 'real', title: 'Every number a sensor gives you is a Riemann sum',
      body: `A car's odometer does not know your position — it samples speed and accumulates
        <code>speed × Δt</code>. A power meter samples watts and accumulates energy. A fitness tracker
        samples acceleration. Each is literally the left-rule sum, with Δt set by the sampling rate,
        and its accuracy is governed by exactly the convergence you are watching here.`,
      figure: `<svg viewBox="0 0 260 130" role="img" aria-label="Speed samples forming rectangles whose total is distance">
  <path d="M18 106 H244" stroke="#7e98c4" stroke-opacity=".4"/>
  <g fill="#3df2c0" fill-opacity=".26" stroke="#3df2c0" stroke-opacity=".55">
    <rect x="24" y="82" width="26" height="24"/><rect x="50" y="62" width="26" height="44"/>
    <rect x="76" y="44" width="26" height="62"/><rect x="102" y="34" width="26" height="72"/>
    <rect x="128" y="40" width="26" height="66"/><rect x="154" y="56" width="26" height="50"/>
    <rect x="180" y="74" width="26" height="32"/><rect x="206" y="92" width="26" height="14"/>
  </g>
  <path d="M24 84 Q104 22 128 34 Q186 62 232 94" fill="none" stroke="#ffb454" stroke-width="2"/>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab">
    <text x="18" y="122">speed</text>
    <text x="244" y="122" text-anchor="end">time</text>
    <text x="130" y="20" fill="#ffd76a" text-anchor="middle">Σ speed × Δt = distance</text>
  </g>
</svg>`,
      state: { fn: 'sin', rule: 'left', n: 8 }, jump: 'Show me coarse sampling' },

    { level: 'real', title: 'Drug dosing and the area under the curve',
      body: `Pharmacologists live by <b>AUC</b> — the area under the plasma-concentration curve. It is
        total exposure: how much drug the body actually saw, not just the peak. It is computed from a
        handful of blood samples by exactly the trapezoid or midpoint rule you are using, and it
        decides whether a generic is approved as equivalent to the original.`,
      figure: `<svg viewBox="0 0 260 130" role="img" aria-label="Plasma concentration rising and decaying, with the area beneath it shaded">
  <path d="M20 104 H242" stroke="#7e98c4" stroke-opacity=".4"/>
  <path d="M24 104 Q56 18 92 30 Q150 50 238 100 L238 104 Z" fill="#ffb454" fill-opacity=".20"/>
  <path d="M24 104 Q56 18 92 30 Q150 50 238 100" fill="none" stroke="#ffb454" stroke-width="2"/>
  <g stroke="#7e98c4" stroke-opacity=".45" stroke-dasharray="3 3">
    <path d="M60 104 V32"/><path d="M100 104 V34"/><path d="M140 104 V46"/><path d="M180 104 V66"/>
  </g>
  <g fill="#3df2c0"><circle cx="60" cy="32" r="3"/><circle cx="100" cy="34" r="3"/><circle cx="140" cy="46" r="3"/><circle cx="180" cy="66" r="3"/></g>
  <text x="130" y="122" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">a few samples → AUC = total exposure</text>
</svg>`,
      state: { fn: 'gauss', rule: 'mid', n: 10 }, jump: 'Show me a decay curve' },
  ],
};
