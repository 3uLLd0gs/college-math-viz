/* ---- CONTENT: the TRACES registry — the only part that changes per concept ----
   Three quantities read off the unit circle, each unwrapping into its own curve:
   the height (sin), the width (cos), and the slope of the radius (tan).

   `target` is the value the challenge asks for, and `solutions` lists every
   angle in [0, 4π) that produces it — sin θ = ½ has FOUR answers over two turns,
   and noticing that is most of the lesson. */

export const TWO_PI = Math.PI * 2;
export const MAX_ANGLE = 2 * TWO_PI;      // the sweep runs over two full turns

/** Every angle in [0, MAX_ANGLE) congruent to `base` modulo a full turn. */
const overTurns = (...base) =>
  base.flatMap(b => [b, b + TWO_PI]).filter(a => a < MAX_ANGLE).sort((p, q) => p - q);

export const TRACES = [
  { id: 'sin', label: 'sin θ', tex: 'sin θ',
    f: Math.sin,
    reads: 'the HEIGHT of the point above the x-axis',
    target: 0.5,
    targetTex: '½',
    solutions: overTurns(Math.PI / 6, 5 * Math.PI / 6),
    range: 1.15 },

  { id: 'cos', label: 'cos θ', tex: 'cos θ',
    f: Math.cos,
    reads: 'the WIDTH of the point from the y-axis',
    target: -0.5,
    targetTex: '−½',
    solutions: overTurns(2 * Math.PI / 3, 4 * Math.PI / 3),
    range: 1.15 },

  { id: 'tan', label: 'tan θ', tex: 'tan θ',
    f: Math.tan,
    reads: 'the SLOPE of the radius — height over width',
    target: 1,
    targetTex: '1',
    solutions: overTurns(Math.PI / 4, 5 * Math.PI / 4),
    range: 2.6,
    // tan runs to infinity a quarter turn either side of the origin
    asymptotes: [Math.PI / 2, 3 * Math.PI / 2, 5 * Math.PI / 2, 7 * Math.PI / 2] },
];

/** Wrap any angle into [0, 2π). */
export const wrap = a => ((a % TWO_PI) + TWO_PI) % TWO_PI;

/** The traced value, or null where the curve has no finite value. */
export function valueAt(trace, theta) {
  const v = trace.f(theta);
  return Number.isFinite(v) && Math.abs(v) < 1e6 ? v : null;
}

/** How far this angle is from producing the target value. */
export function missBy(trace, theta) {
  const v = valueAt(trace, theta);
  return v === null ? Infinity : Math.abs(v - trace.target);
}

/**
 * The solution angles a student has actually landed on, within `tol`.
 *
 * Compared on RAW angles, not wrapped ones: θ = 30° and θ = 390° are the same
 * point on the circle but different points on the curve, and having to visit
 * both is exactly how the repetition gets noticed. Wrapping first would credit
 * two answers for one turn of the dial and quietly delete the lesson.
 */
export const solutionsHit = (trace, angles, tol = 0.06) =>
  trace.solutions.filter(sol => angles.some(a => Math.abs(a - sol) < tol));

/** Degrees, for the readout — students meet the circle in degrees first. */
export const deg = rad => rad * 180 / Math.PI;

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'Where the sine wave actually comes from',
  intro: `Sine is not a squiggle someone drew. It is a <b>coordinate</b>. Put a point on a circle of
    radius 1, walk it round, and record how high it is at each angle — that record, unrolled along a
    line, is the sine curve. Every property it has, including the repeating, is a fact about walking
    in circles.`,
  steps: [
    { level: 'intro', title: 'The angle is a distance, not a corner',
      body: `Turning by θ moves the point a distance θ <em>along the arc</em>, because the radius is 1.
        That is what radians are, and why <code>2π</code> is once round. Degrees are a human convention
        laid on top.`,
      state: { trace: 'sin', deg: 60 }, jump: 'Put me at 60°' },

    { level: 'intro', title: 'Height becomes the curve',
      body: `The mint bar is the point's height. Carry it straight across — that dashed line — and drop
        it at the matching angle on the right. Do that for every angle and you have drawn sine. The two
        pictures share one vertical scale, so the bar and the curve height are literally the same
        length.`,
      state: { trace: 'sin', deg: 90 }, jump: 'Take me to the top' },

    { level: 'use', title: 'Cosine is the same walk, measured sideways',
      body: `Nothing changes about the circle. You read the <b>width</b> instead of the height, and out
        comes a curve that is sine shifted by a quarter turn. That shift is not a coincidence — it is
        the angle between the two axes.`,
      state: { trace: 'cos', deg: 60 }, jump: 'Read the width instead' },

    { level: 'use', title: 'Going round again repeats everything',
      body: `Past 360° the point retraces its own path, so the heights repeat exactly. That is
        <b>periodicity</b>, and it is why <code>sin θ = ½</code> has infinitely many answers spaced
        <code>2π</code> apart. Sweep past one turn and watch the curve copy itself.`,
      state: { trace: 'sin', deg: 430 }, jump: 'Sweep past one full turn' },

    { level: 'advanced', title: 'Tangent is a slope, so it can blow up',
      body: `<code>tan θ = sin θ / cos θ</code> — the slope of the radius. At 90° the width is zero and
        the slope is vertical: undefined, not merely large. The curve runs off to infinity on both
        sides of that angle, which is why tangent has asymptotes and sine never does.`,
      state: { trace: 'tan', deg: 88 }, jump: 'Walk up to the asymptote' },

    { level: 'real', title: 'Alternating current is a rotating magnet',
      body: `Mains electricity is a sine wave because a generator is a coil spinning in a magnetic
        field — the voltage <em>is</em> the height of a rotating point. 50 or 60 Hz is how many turns
        per second. Three-phase power is three of these points spaced 120° apart on the same circle,
        which is why the phases sum to zero and the return wire can be thin.`,
      figure: `<svg viewBox="0 0 260 132" role="img" aria-label="Three points spaced round a circle producing three offset sine waves">
  <circle cx="52" cy="66" r="34" fill="none" stroke="#7e98c4" stroke-opacity=".45"/>
  <g stroke-width="2" stroke-linecap="round">
    <path d="M52 66 L82 49" stroke="#3df2c0"/><path d="M52 66 L44 100" stroke="#ffb454"/><path d="M52 66 L30 39" stroke="#ff5d73"/>
  </g>
  <path d="M104 66 H250" stroke="#7e98c4" stroke-opacity=".35"/>
  <path d="M104 49 Q127 12 150 49 Q173 86 196 49 Q219 12 242 49" fill="none" stroke="#3df2c0" stroke-width="1.8"/>
  <path d="M104 83 Q127 46 150 83 Q173 120 196 83 Q219 46 242 83" fill="none" stroke="#ffb454" stroke-width="1.8"/>
  <path d="M104 66 Q127 103 150 66 Q173 29 196 66 Q219 103 242 66" fill="none" stroke="#ff5d73" stroke-width="1.8"/>
  <text x="176" y="128" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">three phases, 120° apart</text>
</svg>`,
      state: { trace: 'sin', deg: 120 }, jump: 'Show me a phase offset' },

    { level: 'real', title: 'Sound, and why a tuning fork is a circle',
      body: `A pure tone is a sine wave in air pressure. Middle A is 440 turns of that circle per
        second. Every richer sound — a violin, a voice — is a sum of these, which is the whole content
        of <b>Fourier analysis</b>: any repeating signal is a stack of rotating points at different
        speeds. Audio codecs, image compression and radio all run on that one idea.`,
      figure: `<svg viewBox="0 0 260 132" role="img" aria-label="A pure tone and a richer wave built from summed harmonics">
  <path d="M14 42 Q34 14 54 42 Q74 70 94 42 Q114 14 134 42 Q154 70 174 42 Q194 14 214 42 Q234 70 248 48" fill="none" stroke="#3df2c0" stroke-width="1.8"/>
  <text x="14" y="20" fill="#3df2c0" font-family="JetBrains Mono, monospace" font-size="9">pure tone</text>
  <path d="M14 100 q10 -26 20 0 q10 26 20 -14 q10 -22 20 12 q10 24 20 -18 q10 -20 20 14 q10 22 20 -10 q10 -24 20 12 q10 20 20 -6 q10 -18 20 8 q10 16 20 -4 q10 -14 14 6" fill="none" stroke="#ffb454" stroke-width="1.8"/>
  <text x="14" y="128" fill="#ffb454" font-family="JetBrains Mono, monospace" font-size="9">a violin: many circles at once</text>
</svg>`,
      state: { trace: 'sin', deg: 720 }, jump: 'Show me two full cycles' },

    { level: 'use', title: 'Amplitude and period are stretches of the same circle',
      body: `<code>A·sin(Bθ)</code> does two things: <code>A</code> scales the height, so the circle
        grows; <code>B</code> speeds the walk, so a full turn happens in <code>2π/B</code>. Neither
        changes the shape — every sinusoid you will ever meet is this one curve, stretched.`,
      state: { trace: 'sin', deg: 180 }, jump: 'Take me half a turn' },

    { level: 'advanced', title: 'Radians are not a preference',
      body: `<code>d/dθ sin θ = cos θ</code> is true <em>only</em> in radians. In degrees you pick up a
        stray factor of <code>π/180</code> every time you differentiate. Radians are defined so that arc
        length equals angle on the unit circle, and that is precisely what makes the calculus clean.
        Degrees are a Babylonian convenience.`,
      state: { trace: 'sin', deg: 57 }, jump: 'Show me one radian' },

    { level: 'advanced', title: 'The circle and the exponential are the same object',
      body: `Euler's formula, <code>e^(iθ) = cos θ + i·sin θ</code>, says a point on this circle is what
        you get by raising e to an imaginary power. Sine and cosine are the shadow of exponential growth
        turned sideways. At <code>θ = π</code> it gives <code>e^(iπ) = −1</code> — the point at the far
        left of the circle you are looking at.`,
      state: { trace: 'cos', deg: 180 }, jump: 'Take me to e^(iπ)' },

    { level: 'real', title: 'Everything wireless',
      body: `A radio carrier is a sine wave, and information rides on it by nudging one of three things:
        <b>amplitude</b> (AM), <b>frequency</b> (FM) or <b>phase</b>. Wi-Fi and 5G use the last, packing
        several bits per symbol by choosing one of many points around exactly this circle — engineers
        draw it as a constellation diagram, which is the unit circle with labels.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A constellation of phase points around a circle beside a modulated wave">
  <circle cx="62" cy="64" r="40" fill="none" stroke="#7e98c4" stroke-opacity=".45"/>
  <g fill="#3df2c0">
    <circle cx="90" cy="36" r="3.4"/><circle cx="90" cy="92" r="3.4"/><circle cx="34" cy="36" r="3.4"/><circle cx="34" cy="92" r="3.4"/>
    <circle cx="62" cy="24" r="3.4"/><circle cx="62" cy="104" r="3.4"/><circle cx="22" cy="64" r="3.4"/><circle cx="102" cy="64" r="3.4"/>
  </g>
  <path d="M62 64 L90 36" stroke="#ffd76a" stroke-width="1.8"/>
  <text x="62" y="122" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">each point = a symbol</text>
  <path d="M126 64 q10 -30 20 0 q10 30 20 0 q10 -30 20 0 q10 30 20 0 q10 -30 20 0 q10 30 14 0" fill="none" stroke="#ffb454" stroke-width="1.8"/>
  <path d="M126 64 h0" stroke="#7e98c4"/>
  <text x="186" y="122" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">carrier</text>
</svg>`,
      state: { trace: 'sin', deg: 45 }, jump: 'Show me a phase point' },

    { level: 'real', title: 'Tides, daylight and body clocks',
      body: `Anything driven by rotation is sinusoidal. Daylight hours over a year, tide height over a
        day, body temperature over a circadian cycle — all fitted as <code>A·sin(Bt + C) + D</code>,
        because the underlying cause really is something going round. Tide tables are computed by adding
        dozens of such terms, one for each astronomical driver.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Two sinusoids of different periods summing to a more complex tide curve">
  <path d="M18 40 q22 -20 44 0 q22 20 44 0 q22 -20 44 0 q22 20 44 0 q22 -20 44 0" fill="none" stroke="#3df2c0" stroke-width="1.6" stroke-opacity=".8"/>
  <path d="M18 72 q44 -16 88 0 q44 16 88 0 q30 -11 50 -5" fill="none" stroke="#7aa2ff" stroke-width="1.6" stroke-opacity=".8"/>
  <path d="M18 108 q11 -14 22 -4 q11 10 22 -10 q11 -10 22 8 q11 14 22 -6 q11 -12 22 2 q11 12 22 -8 q11 -8 22 6 q11 10 22 -4 q11 -12 22 0" fill="none" stroke="#ffb454" stroke-width="1.8"/>
  <g font-family="JetBrains Mono, monospace" font-size="9">
    <text x="20" y="24" fill="#3df2c0">lunar</text>
    <text x="20" y="60" fill="#7aa2ff">solar</text>
    <text x="20" y="124" fill="#ffb454">the tide you measure</text>
  </g>
</svg>`,
      state: { trace: 'sin', deg: 540 }, jump: 'Show me repeated cycles' },
  ],
};
