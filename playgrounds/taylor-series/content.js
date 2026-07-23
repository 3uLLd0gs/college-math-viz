import { fact, sup } from '../../engine/math.js';

/* ---- CONTENT: the FUNCTIONS registry — the only part that changes per concept ---- */
export const FUNCTIONS = [
  { id: 'exp', label: 'eˣ',
    f: x => Math.exp(x),
    coeff: n => 1 / fact(n),
    term: n => n === 0 ? { neg: false, body: '1' } : n === 1 ? { neg: false, body: 'x' } : { neg: false, body: `x${sup(n)}/${n}!` },
    view: { xmin: -3, xmax: 3.4, ymin: -1.6, ymax: 14 },
    challenge: { x0: 2, tol: 0.05, label: 'e²' } },

  { id: 'sin', label: 'sin x',
    f: x => Math.sin(x),
    coeff: n => n % 2 === 1 ? (((n - 1) / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
    term: n => { if (n % 2 === 0) return null; if (n === 1) return { neg: false, body: 'x' };
      return { neg: ((n - 1) / 2) % 2 !== 0, body: `x${sup(n)}/${n}!` }; },
    view: { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 },
    challenge: { x0: 3, tol: 0.02, label: 'sin 3' } },

  { id: 'cos', label: 'cos x',
    f: x => Math.cos(x),
    coeff: n => n % 2 === 0 ? ((n / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
    term: n => { if (n % 2 === 1) return null; if (n === 0) return { neg: false, body: '1' };
      return { neg: (n / 2) % 2 !== 0, body: `x${sup(n)}/${n}!` }; },
    view: { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 },
    challenge: { x0: 3, tol: 0.02, label: 'cos 3' } },

  { id: 'ln', label: 'ln(1+x)',
    f: x => x > -1 ? Math.log(1 + x) : NaN,
    coeff: n => n === 0 ? 0 : (n % 2 === 1 ? 1 : -1) / n,
    term: n => { if (n === 0) return null; if (n === 1) return { neg: false, body: 'x' };
      return { neg: n % 2 === 0, body: `x${sup(n)}/${n}` }; },
    view: { xmin: -0.95, xmax: 3, ymin: -4, ymax: 2.2 },
    challenge: { x0: 0.8, tol: 0.01, label: 'ln 1.8' } },

  { id: 'geo', label: '1/(1−x)',
    f: x => x < 1 ? 1 / (1 - x) : NaN,
    coeff: n => 1,
    term: n => n === 0 ? { neg: false, body: '1' } : n === 1 ? { neg: false, body: 'x' } : { neg: false, body: `x${sup(n)}` },
    view: { xmin: -3, xmax: 0.97, ymin: -2, ymax: 9 },
    challenge: { x0: 0.5, tol: 0.005, label: '1/(1−½) = 2' } },
];

export function polyAt(fn, N, x) { let s = 0; for (let n = 0; n <= N; n++) s += fn.coeff(n) * Math.pow(x, n); return s; }

export function formula(fn, N) {
  let parts = [], shown = 0;
  for (let n = 0; n <= N && shown < 7; n++) {
    const t = fn.term(n); if (!t) continue;
    if (parts.length === 0) parts.push((t.neg ? '−' : '') + t.body);
    else parts.push((t.neg ? ' − ' : ' + ') + t.body);
    shown++;
  }
  return parts.join('') + (moreTerms(fn, N) ? ' <span class="dots">+ …</span>' : '');
}
function moreTerms(fn, N) { let c = 0; for (let n = 0; n <= N; n++) if (fn.term(n)) c++; return c > 7; }

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'Turning a curve into a polynomial you can actually compute',
  intro: `Your calculator cannot "do" <code>sin</code> or <code>eˣ</code> directly — it has adders and
    multipliers and nothing else. A <b>Taylor series</b> is the bridge: it rebuilds a curve out of
    powers of x, using nothing but the function's derivatives <em>at a single point</em>. Add terms
    and the polynomial grips the curve over a wider and wider stretch.`,
  steps: [
    { level: 'intro', title: 'One term is a horizontal line',
      body: `At <code>N = 0</code> the polynomial is just <code>f(0)</code> — a flat line at the
        function's height at the origin. It is right at exactly one point and wrong everywhere else.
        That is the honest starting position.`,
      state: { fn: 'exp', N: 0, probe: 1.5 }, jump: 'Show me N = 0' },

    { level: 'intro', title: 'Two terms is the tangent line',
      body: `Adding <code>f′(0)·x</code> gives the polynomial the right <em>slope</em> at the origin as
        well as the right height. That is precisely the tangent line — so the first Taylor polynomial
        is an idea you already met in Calculus 1 under another name.`,
      state: { fn: 'exp', N: 1, probe: 1.5 }, jump: 'Show me the tangent' },

    { level: 'use', title: 'Each new term fixes one more derivative',
      body: `The <code>xⁿ/n!</code> term is built so the polynomial's <b>n-th derivative</b> matches the
        function's at the origin, without disturbing any of the lower ones. That is what the factorial
        is doing — it cancels the n! that <code>d ⁿ/dxⁿ</code> drops on <code>xⁿ</code>.`,
      state: { fn: 'exp', N: 5, probe: 2 }, jump: 'Stack five terms' },

    { level: 'use', title: 'Accuracy is local, and it spreads',
      body: `Drag the probe outward and watch the error grow. The approximation is always best near
        the centre and decays away from it — but every extra term pushes the region where it is
        usable further out. Watch the red error bar shrink as N climbs.`,
      state: { fn: 'sin', N: 7, probe: 4 }, jump: 'Probe far from centre' },

    { level: 'advanced', title: 'Some series simply stop working',
      body: `<code>1/(1−x)</code> has a wall at <code>x = 1</code>. Its series <code>1 + x + x² + …</code>
        converges only for <code>|x| < 1</code> — that is the <b>radius of convergence</b>. Add a
        hundred terms and it still tells you nothing past the wall. <code>ln(1+x)</code> is the same
        story, which is why it needs so many terms to reach even modest accuracy.`,
      state: { fn: 'geo', N: 14, probe: 0.9 }, jump: 'Push against the wall' },

    { level: 'real', title: 'How your calculator finds sin(37°)',
      body: `It does not look anything up. It reduces the angle into a small range using symmetry, then
        evaluates a short polynomial — Taylor's, or a close relative tuned to spread the error more
        evenly. Five or six terms buy full display precision, and every one of them is a multiply and
        an add. The same trick computes <code>exp</code>, <code>log</code> and square roots inside
        every language's standard library.`,
      figure: `<svg viewBox="0 0 260 130" role="img" aria-label="A short polynomial evaluated by repeated multiply and add">
  <rect x="14" y="18" width="232" height="46" rx="8" fill="none" stroke="#7e98c4" stroke-opacity=".4"/>
  <text x="130" y="46" fill="#3df2c0" font-family="JetBrains Mono, monospace" font-size="11" text-anchor="middle">x − x³/6 + x⁵/120 − x⁷/5040</text>
  <g stroke="#ffb454" stroke-width="1.6" fill="#ffb454">
    <path d="M50 70 v14"/><path d="M50 86 l-3 -6 h6 z"/>
    <path d="M130 70 v14"/><path d="M130 86 l-3 -6 h6 z"/>
    <path d="M210 70 v14"/><path d="M210 86 l-3 -6 h6 z"/>
  </g>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab" text-anchor="middle">
    <text x="50" y="100">×</text><text x="130" y="100">×</text><text x="210" y="100">+</text>
    <text x="130" y="120" fill="#ffd76a">4 multiplies, 3 adds — that is the whole of sin</text>
  </g>
</svg>`,
      state: { fn: 'sin', N: 7, probe: 0.65 }, jump: 'Show me sin to 7 terms' },

    { level: 'real', title: 'Why physics keeps saying "for small angles"',
      body: `A pendulum's equation involves <code>sin θ</code>, which has no clean solution. Keep only the
        first Taylor term — <code>sin θ ≈ θ</code> — and it becomes the simple harmonic oscillator every
        textbook solves. That single truncation is where "for small oscillations" comes from, and it is
        why a grandfather clock keeps time but a wildly swinging one does not.`,
      figure: `<svg viewBox="0 0 260 130" role="img" aria-label="sin theta and the line theta agreeing for small angles and parting for large ones">
  <path d="M20 100 H240" stroke="#7e98c4" stroke-opacity=".35"/>
  <path d="M20 100 L240 12" stroke="#3df2c0" stroke-width="2" fill="none"/>
  <path d="M20 100 Q120 24 240 60" stroke="#ffb454" stroke-width="2" fill="none"/>
  <rect x="20" y="72" width="58" height="28" fill="#3df2c0" fill-opacity=".10"/>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab">
    <text x="48" y="118" text-anchor="middle">small θ</text>
    <text x="212" y="112" fill="#ff5d73" text-anchor="middle">they part</text>
    <text x="238" y="22" fill="#3df2c0" text-anchor="end">θ</text>
    <text x="238" y="72" fill="#ffb454" text-anchor="end">sin θ</text>
  </g>
</svg>`,
      state: { fn: 'sin', N: 1, probe: 0.4 }, jump: 'Show me sin θ ≈ θ' },

    { level: 'use', title: 'These are all built around zero — that is a choice',
      body: `Expanding about <code>x = 0</code> gives a <b>Maclaurin</b> series, the special case
        everyone meets first. A Taylor series proper can be centred anywhere: swap <code>x</code> for
        <code>(x − a)</code> and the sweet spot moves to <code>a</code>. If you care about accuracy
        near x = 10, centring at 0 is a poor plan.`,
      state: { fn: 'ln', N: 8, probe: 0.5 }, jump: 'Show me a series with a bad centre' },

    { level: 'advanced', title: 'The error is roughly the first term you left out',
      body: `Truncating after N terms leaves a remainder, and Lagrange's form of it says that remainder
        looks like the next term with the derivative evaluated somewhere in between. Practically: the
        first discarded term is a good estimate of your error. Watch the readout — for
        <code>eˣ</code> at x = 2 the error tracks <code>2ⁿ⁺¹/(n+1)!</code> closely.`,
      state: { fn: 'exp', N: 4, probe: 2 }, jump: 'Compare error to the next term' },

    { level: 'advanced', title: 'Symmetry deletes half the terms',
      body: `<code>sin</code> is odd, so only odd powers survive; <code>cos</code> is even, so only even
        ones do. You can see it in the formula panel — the gaps are not omissions, they are
        coefficients that are exactly zero. That is why N = 6 and N = 7 give an identical cosine
        polynomial.`,
      state: { fn: 'cos', N: 8, probe: 2.4 }, jump: 'Look at the missing terms' },

    { level: 'real', title: 'Where E = mc² comes from',
      body: `Relativistic energy is <code>γmc²</code> with <code>γ = 1/√(1 − v²/c²)</code>. Expand it for
        small <code>v/c</code> and you get <code>mc² + ½mv² + …</code> — the rest energy, then
        <b>exactly the Newtonian kinetic energy</b> as the first correction. Classical mechanics is the
        first two terms of a Taylor series, which is why it works beautifully until things go fast.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Relativistic energy curve and its two-term approximation agreeing at low speed">
  <path d="M20 108 H240" stroke="#7e98c4" stroke-opacity=".4"/>
  <path d="M20 108 Q140 100 200 20" fill="none" stroke="#ffb454" stroke-width="2"/>
  <path d="M20 108 Q110 94 176 62" fill="none" stroke="#3df2c0" stroke-width="2" stroke-dasharray="5 4"/>
  <rect x="20" y="86" width="72" height="22" fill="#3df2c0" fill-opacity=".10"/>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab">
    <text x="56" y="122" text-anchor="middle">v ≪ c</text>
    <text x="215" y="26" fill="#ffb454">γmc²</text>
    <text x="182" y="74" fill="#3df2c0">mc² + ½mv²</text>
  </g>
</svg>`,
      state: { fn: 'geo', N: 2, probe: 0.25 }, jump: 'Show me a two-term approximation' },

    { level: 'real', title: 'Every numerical solver is a truncated series',
      body: `Euler's method for an ODE is the first two Taylor terms; Runge–Kutta keeps more, which is
        why RK4's error falls like <code>h⁴</code> while Euler's falls like <code>h</code>. The same
        logic sits under finite-difference PDE solvers, orbital propagators and physics engines. When a
        simulation "loses accuracy at large timesteps", this is the reason.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A true solution curve with a coarse Euler path and a finer one tracking it more closely">
  <path d="M20 104 Q90 92 140 60 Q190 28 240 20" fill="none" stroke="#ffb454" stroke-width="2"/>
  <polyline points="20,104 76,98 132,76 188,44 240,26" fill="none" stroke="#3df2c0" stroke-width="1.6"/>
  <polyline points="20,104 62,100 104,90 146,70 188,48 240,20" fill="none" stroke="#7aa2ff" stroke-width="1.6" stroke-dasharray="4 3"/>
  <g font-family="JetBrains Mono, monospace" font-size="9">
    <text x="22" y="20" fill="#ffb454">true</text>
    <text x="22" y="34" fill="#3df2c0">coarse steps</text>
    <text x="22" y="48" fill="#7aa2ff">finer steps</text>
  </g>
</svg>`,
      state: { fn: 'exp', N: 1, probe: 1.2 }, jump: 'Show me one Euler step' },
  ],
};
