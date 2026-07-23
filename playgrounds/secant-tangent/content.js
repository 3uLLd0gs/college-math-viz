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

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'The derivative is a limit you can watch happen',
  intro: `Slope needs two points — rise over run. But the slope <b>at</b> a single point is a
    contradiction: one point has no run. The derivative resolves it by refusing to take the limit
    early. Keep two points, compute the honest slope between them, then slide them together and see
    what the number approaches.`,
  steps: [
    { level: 'intro', title: 'Two points, ordinary slope',
      body: `The mint line is a <b>secant</b> — it cuts the curve at the gold dot and at a second dot
        a distance <code>h</code> away. Its slope is the blue triangle: rise over run, nothing
        clever. At <code>h = 1.75</code> it is not the tangent and does not pretend to be.`,
      state: { fn: 'square', x0: 0.8, h: 1.75 }, jump: 'Show me a wide secant' },

    { level: 'intro', title: 'Shrink the run',
      body: `Slide <code>h</code> down and the second dot walks back toward the first. The secant
        pivots. It is still just a slope between two points — the only thing changing is how close
        together they are.`,
      state: { fn: 'square', x0: 0.8, h: 0.4 }, jump: 'Bring the points closer' },

    { level: 'use', title: 'The quotient settles on a number',
      body: `For <code>x²</code> the difference quotient works out to exactly <code>2x + h</code>. The
        <code>h</code> is the entire error — so as h → 0 the slope heads for <code>2x</code> and
        nothing else. That destination is <code>f′(x)</code>. The inset plots the journey.`,
      state: { fn: 'square', x0: 0.8, h: 0.02 }, jump: 'Take h to almost nothing' },

    { level: 'use', title: 'It works on curves with no tidy formula',
      body: `<code>eˣ</code> is its own derivative, which sounds like a party trick until you watch the
        quotient converge on <code>e^0.6 ≈ 1.82</code> — the same number as the height. The limit does
        not care whether the algebra is pretty.`,
      state: { fn: 'exp', x0: 0.6, h: 0.01 }, jump: 'Try it on eˣ' },

    { level: 'advanced', title: 'The slope changes as you move',
      body: `Drag the gold dot along <code>x³ − 2x</code>. The tangent tips from positive to negative
        and back. Collecting that value at every x gives a whole new function — <code>f′</code> — and
        the places where it crosses zero are the peaks and valleys of the original.`,
      state: { fn: 'cubic', x0: 0.2, h: 0.05 }, jump: 'Find a flat tangent' },

    { level: 'real', title: 'Speedometers, and why "instantaneous" is a limit',
      body: `A car cannot measure speed at an instant — it measures how far the wheel turned over some
        tiny interval and divides. That <em>is</em> the difference quotient, with <code>h</code> set by
        the sensor's timing. Radar guns do the same with reflected wave phase. "Instantaneous velocity"
        is the number those quotients converge to as the interval shrinks.`,
      figure: `<svg viewBox="0 0 260 130" role="img" aria-label="Position samples a small time apart, divided to give speed">
  <path d="M18 100 H244" stroke="#7e98c4" stroke-opacity=".4"/>
  <path d="M24 96 Q120 88 236 22" fill="none" stroke="#ffb454" stroke-width="2"/>
  <g stroke="#7aa2ff" stroke-dasharray="3 3"><path d="M150 74 H196"/><path d="M196 74 V52"/></g>
  <path d="M120 82 L226 30" stroke="#3df2c0" stroke-width="2"/>
  <g fill="#ffd76a"><circle cx="150" cy="74" r="4"/><circle cx="196" cy="52" r="4"/></g>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab">
    <text x="173" y="88" text-anchor="middle">Δt</text>
    <text x="208" y="66">Δs</text>
    <text x="130" y="120" fill="#ffd76a" text-anchor="middle">Δs / Δt → speed as Δt → 0</text>
  </g>
</svg>`,
      state: { fn: 'cubic', x0: 1.05, h: 0.3 }, jump: 'Show me a finite interval' },

    { level: 'real', title: 'How every neural network learns',
      body: `Backpropagation is derivatives, computed exactly rather than numerically — but the meaning
        is this picture. "If I nudge this weight by <code>h</code>, how much does the error move?" is a
        difference quotient, and the limit of it is the gradient the optimiser steps along. Frameworks
        even ship <b>gradient checking</b>: compare the analytic derivative against a small-h quotient
        to catch bugs. That is literally this page, used as a test.`,
      figure: `<svg viewBox="0 0 260 130" role="img" aria-label="A weight nudged slightly, and the resulting change in error">
  <g fill="none" stroke="#7e98c4" stroke-opacity=".45" stroke-width="1.5">
    <circle cx="46" cy="40" r="12"/><circle cx="46" cy="88" r="12"/><circle cx="130" cy="64" r="12"/><circle cx="214" cy="64" r="12"/>
  </g>
  <g stroke="#7e98c4" stroke-opacity=".35"><path d="M58 44 L118 60"/><path d="M58 84 L118 68"/><path d="M142 64 H202"/></g>
  <path d="M58 44 L118 60" stroke="#3df2c0" stroke-width="2.4"/>
  <text x="86" y="42" fill="#3df2c0" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">w + h</text>
  <text x="214" y="94" fill="#ff5d73" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">error</text>
  <text x="130" y="120" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">∂error/∂w ≈ Δerror / h</text>
</svg>`,
      state: { fn: 'exp', x0: 0.6, h: 0.001 }, jump: 'Show me a gradient check' },

    { level: 'use', title: 'You can approach from either side',
      body: `Nothing says the second point must be to the right. A negative <code>h</code> gives the
        <b>backward</b> difference, and it converges to the same limit. Averaging the forward and
        backward quotients gives the <b>symmetric</b> difference, whose error falls like
        <code>h²</code> instead of <code>h</code> — the same trick as the midpoint rule.`,
      state: { fn: 'sin', x0: 0.7, h: 0.3 }, jump: 'Show me a moderate step' },

    { level: 'advanced', title: 'Not every curve has a tangent',
      body: `The derivative exists only if the quotient approaches the <em>same</em> number from both
        sides. At a corner it does not: approach <code>|x|</code> at zero from the right and you get
        +1, from the left −1. No single slope, so no derivative — even though the function is perfectly
        continuous. Continuity is weaker than differentiability.`,
      state: { fn: 'cubic', x0: 0, h: 0.05 }, jump: 'Sit where the slope flips' },

    { level: 'advanced', title: 'You cannot let h go all the way to zero on a computer',
      body: `<code>f(x+h) − f(x)</code> subtracts two nearly equal numbers. In floating point that
        destroys significant digits, and below roughly <code>h ≈ 10⁻⁸</code> the quotient gets
        <em>worse</em>, not better — truncation error falls but rounding error explodes. That is why
        this slider stops at 10⁻³, and why real code uses analytic or automatic differentiation.`,
      state: { fn: 'exp', x0: 0.6, h: 0.001 }, jump: 'Go to the smallest h here' },

    { level: 'real', title: 'Simulating anything that changes',
      body: `Weather models, crash simulations and circuit solvers all replace derivatives with
        difference quotients on a grid — that is the <b>finite difference method</b>. The grid spacing
        is your <code>h</code>, and the accuracy order you saw here is exactly what determines how fine
        the mesh must be. Halving the mesh in a first-order scheme buys you half the error and four
        times the work in 2-D.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A grid over a region with a stencil of neighbouring points highlighted">
  <g stroke="#7e98c4" stroke-opacity=".3">
    <path d="M30 16 V112"/><path d="M72 16 V112"/><path d="M114 16 V112"/><path d="M156 16 V112"/><path d="M198 16 V112"/><path d="M240 16 V112"/>
    <path d="M30 16 H240"/><path d="M30 40 H240"/><path d="M30 64 H240"/><path d="M30 88 H240"/><path d="M30 112 H240"/>
  </g>
  <g fill="#3df2c0"><circle cx="114" cy="64" r="4.5"/></g>
  <g fill="#ffb454"><circle cx="72" cy="64" r="3.4"/><circle cx="156" cy="64" r="3.4"/><circle cx="114" cy="40" r="3.4"/><circle cx="114" cy="88" r="3.4"/></g>
  <text x="135" y="126" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">a stencil: neighbours give the derivative</text>
</svg>`,
      state: { fn: 'sin', x0: 0.7, h: 0.1 }, jump: 'Show me a grid-sized step' },

    { level: 'real', title: 'Rate of change as a diagnosis',
      body: `A rising blood-glucose reading matters less than <em>how fast</em> it is rising — continuous
        monitors compute a difference quotient over the last few samples and alarm on the slope, not the
        level. The same logic drives trend detection in server monitoring and momentum indicators in
        trading. Choosing the window is choosing <code>h</code>: too big and you lag, too small and you
        alarm on noise.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A noisy signal with a short window giving a jagged slope and a longer window a smooth one">
  <path d="M18 100 H244" stroke="#7e98c4" stroke-opacity=".4"/>
  <path d="M22 88 l10 -6 8 8 12 -12 9 6 11 -14 10 5 12 -13 9 4 11 -12 10 6 12 -14 9 5 11 -10 10 4 12 -12" fill="none" stroke="#7e98c4" stroke-opacity=".75" stroke-width="1.4"/>
  <path d="M22 92 L106 60" stroke="#ff5d73" stroke-width="2"/>
  <path d="M22 94 L232 26" stroke="#3df2c0" stroke-width="2"/>
  <g font-family="JetBrains Mono, monospace" font-size="9">
    <text x="112" y="58" fill="#ff5d73">short h: noisy</text>
    <text x="150" y="98" fill="#3df2c0">long h: smooth but late</text>
  </g>
</svg>`,
      state: { fn: 'exp', x0: 0.6, h: 0.05 }, jump: 'Show me a sampling window' },
  ],
};
