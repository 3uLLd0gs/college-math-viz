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

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'A root is a fixed point you can chase with tangents',
  intro: `Solving <code>f(x) = 0</code> exactly is usually impossible. Newton's method gives up on
    exact and iterates instead: stand at a guess, slide down the <b>tangent</b> to where it crosses the
    axis, and use that as the next guess. When it works it is breathtakingly fast — and when it fails,
    it fails in three memorable ways this page lets you trigger on purpose.`,
  steps: [
    { level: 'intro', title: 'One tangent, one better guess',
      body: `Start at <code>x₀</code> on <code>x² − 2</code>. Draw the tangent there and follow it down
        to the axis — that crossing is <code>x₁</code>, already closer to <code>√2</code>. That is the
        whole idea: replace the hard curve with its easy tangent line, and solve the line instead.`,
      state: { fn: 'quad', x0: 2, n: 1 }, jump: 'Show me the first step' },

    { level: 'intro', title: 'Repeat, and watch it race in',
      body: `Feed <code>x₁</code> back in and repeat. Each tangent lands nearer the root than the last —
        the error roughly <em>squares</em> every step, so correct digits double. Three or four steps
        take you from a rough guess to machine precision.`,
      state: { fn: 'quad', x0: 2, n: 6 }, jump: 'Iterate to the root' },

    { level: 'use', title: 'It solves things algebra cannot',
      body: `<code>cos x − x = 0</code> has no closed-form solution, but Newton does not care — it only
        needs <code>f</code> and <code>f′</code>. From <code>x₀ = −0.5</code> it converges on
        <code>0.739…</code> in a handful of steps. This is how calculators actually compute roots,
        reciprocals and square roots under the hood.`,
      state: { fn: 'cosx', x0: -0.5, n: 6 }, jump: 'Solve cos x = x' },

    { level: 'use', check: {
      q: 'You start Newton\'s method exactly at a point where f\'(x₀) = 0 — the tangent is perfectly flat. What happens to the next estimate x₁?',
      options: [
        { text: 'It flies off toward infinity — a flat tangent never crosses the axis nearby', correct: true,
          why: 'Right. x₁ = x₀ − f/f′ divides by f′ ≈ 0, so the step blows up. On x² − 2 starting at x = 0 there is no finite next guess at all — the method has nothing to follow.' },
        { text: 'It stays at x₀ forever, since the slope is zero', why: 'A zero slope does not pin the estimate — it does the opposite. Dividing f by a near-zero f′ makes the correction enormous, not zero.' },
        { text: 'It jumps straight to the nearest root', why: 'Only a lucky accident would do that. A flat tangent gives no useful direction; generically the estimate is flung far away.' },
      ],
      state: { fn: 'quad', x0: 0, n: 1 },
    } },

    { level: 'advanced', title: 'Failure one: the flat-tangent fling',
      body: `Set the function to <code>x² − 2</code> and drag the start to <code>x₀ = 0</code>. The
        tangent is horizontal, so it never meets the axis and the next estimate is undefined — the run
        simply stops. Any <code>x₀</code> that lands near a place where <code>f′ ≈ 0</code> gets thrown
        wildly off course.`,
      state: { fn: 'quad', x0: 0, n: 1 }, jump: 'Trigger the fling' },

    { level: 'advanced', title: 'Failure two: the wrong basin',
      body: `<code>x³ − x</code> has three roots at <code>−1, 0, 1</code>. Which one Newton finds depends
        delicately on where you start — the "basins of attraction" interlock, and near their boundaries a
        tiny change in <code>x₀</code> flips the destination. Drag the start slowly and watch the landing
        root jump.`,
      state: { fn: 'cubic', x0: 0.5, n: 8 }, jump: 'Land on a surprising root' },

    { level: 'advanced', title: 'Failure three: the eternal cycle',
      body: `<code>x³ − 2x + 2</code> from <code>x₀ = 0</code> is the textbook trap: the tangent sends you
        to <code>1</code>, the tangent there sends you back to <code>0</code>, and Newton loops
        <code>0 → 1 → 0 → 1</code> forever without ever approaching the real root near <code>−1.77</code>.
        Convergence is never guaranteed — only fast when it happens.`,
      state: { fn: 'cycle', x0: 0, n: 8 }, jump: 'Show me the 2-cycle' },

    { level: 'real', title: 'Where this actually runs',
      body: `Newton and its cousins power the solvers underneath almost everything numeric: a GPS receiver
        trilaterating your position, an optimiser training a model (that is Newton on the gradient),
        a CAD kernel intersecting surfaces, a power-grid load-flow. The quadratic convergence is why they
        can afford to solve millions of these per second — and the failure modes here are exactly the
        edge cases that production code has to damp, bracket, or fall back from.`,
      figure: `<svg viewBox="0 0 260 120" role="img" aria-label="A guess sliding down a tangent to a better guess, twice">
  <path d="M14 96 H246" stroke="#7e98c4" stroke-opacity=".4"/>
  <path d="M28 20 Q150 150 236 60" fill="none" stroke="#ffb454" stroke-width="2"/>
  <g stroke="#3df2c0" stroke-width="2"><path d="M60 74 L150 96"/><path d="M150 40 L200 96"/></g>
  <g fill="#ffd76a"><circle cx="60" cy="74" r="4"/><circle cx="150" cy="40" r="4"/></g>
  <g fill="#3df2c0"><circle cx="150" cy="96" r="3.2"/><circle cx="200" cy="96" r="3.2"/></g>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab">
    <text x="60" y="112" text-anchor="middle" fill="#ffd76a">x₀</text>
    <text x="150" y="112" text-anchor="middle">x₁</text>
    <text x="200" y="112" text-anchor="middle" fill="#3df2c0">x₂</text>
  </g>
</svg>`,
      state: { fn: 'cosx', x0: -0.5, n: 3 }, jump: 'Watch two clean steps' },
  ],
};
