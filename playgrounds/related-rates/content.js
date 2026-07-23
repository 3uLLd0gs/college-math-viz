/* ---- CONTENT: the SCENARIOS registry — the only part that changes per concept ----
   Every scenario has ONE rate the world imposes (a ladder pulled at constant
   speed, a pump at constant litres per second) and a SECOND rate that follows
   from geometry. The second is almost never constant, and that is the whole
   subject: differentiate the constraint and the two rates come out related.

   `rate(s, drive)` returns the derived rate at state `s`. `solveFor(target,
   drive)` inverts it, so a test can check the challenge is reachable without
   hunting numerically. */

export const SCENARIOS = [
  {
    id: 'ladder', label: 'Sliding ladder', L: 5,
    title: 'A ladder slips down a wall',
    setup: 'A 5 m ladder leans on a wall. Its base is pulled away at a steady speed.',
    constraint: 'x² + y² = 25',
    relation: '2x·(dx/dt) + 2y·(dy/dt) = 0   ⟹   dy/dt = −(x/y)·(dx/dt)',
    sVar: { symbol: 'x', label: 'base distance', unit: 'm', min: 0.4, max: 4.8, start: 1.4, step: 0.02 },
    drive: { symbol: 'dx/dt', label: 'base speed', unit: 'm/s', min: 0.2, max: 2, start: 0.8, step: 0.05 },
    derived: { symbol: 'dy/dt', label: 'top speed', unit: 'm/s' },
    stateIsDriven: true,
    rate: (x, v) => -(x / Math.sqrt(25 - x * x)) * v,
    height: x => Math.sqrt(25 - x * x),
    // |dy/dt| = drive exactly when x = y, i.e. x = L/√2
    challenge: { equalRates: true, tol: 0.03,
      prompt: 'Slide the base until the top falls exactly as fast as the base moves.' },
    note: 'As the ladder flattens, y → 0 and the top speed runs away to infinity — the model breaks before the ladder does.',
  },
  {
    id: 'balloon', label: 'Inflating balloon',
    title: 'A balloon is pumped at a constant rate',
    setup: 'Air goes in at a fixed number of litres per second. The radius does NOT grow at a fixed rate.',
    constraint: 'V = (4/3)πr³',
    relation: 'dV/dt = 4πr²·(dr/dt)   ⟹   dr/dt = (dV/dt) / (4πr²)',
    sVar: { symbol: 'r', label: 'radius', unit: 'm', min: 0.35, max: 3, start: 0.5, step: 0.01 },
    drive: { symbol: 'dV/dt', label: 'pump rate', unit: 'm³/s', min: 0.5, max: 8, start: 4, step: 0.1 },
    derived: { symbol: 'dr/dt', label: 'radius speed', unit: 'm/s' },
    stateIsDriven: false,   // the pump drives volume; the radius is what follows
    rate: (r, v) => v / (4 * Math.PI * r * r),
    challenge: { target: 0.1, tol: 0.004,
      prompt: 'Find the radius at which the skin is creeping outward at 0.1 m/s.' },
    note: 'Surface area grows like r², so the same air spread over a bigger skin moves it more slowly.',
  },
  {
    id: 'ripple', label: 'Spreading ripple',
    title: 'A ripple widens on still water',
    setup: 'The edge moves outward at a steady speed. The area it encloses does not.',
    constraint: 'A = πr²',
    relation: 'dA/dt = 2πr·(dr/dt)',
    sVar: { symbol: 'r', label: 'radius', unit: 'm', min: 0.3, max: 3, start: 0.6, step: 0.01 },
    drive: { symbol: 'dr/dt', label: 'edge speed', unit: 'm/s', min: 0.2, max: 1.5, start: 0.6, step: 0.05 },
    derived: { symbol: 'dA/dt', label: 'area rate', unit: 'm²/s' },
    stateIsDriven: true,
    rate: (r, v) => 2 * Math.PI * r * v,
    challenge: { target: 8, tol: 0.25,
      prompt: 'Find the radius at which the wetted area is growing by 8 m² every second.' },
    note: 'The circumference is what is sweeping, and circumference grows with r — so a wide ripple gains area fast.',
  },
  {
    id: 'cone', label: 'Filling cone', R: 2, H: 4,
    title: 'A conical tank fills from a tap',
    setup: 'Water enters at a constant rate. The level climbs quickly at first, then slows.',
    constraint: 'V = (π/3)·(r/h)²·h³  with  r/h = 1/2',
    relation: 'dV/dt = (π/4)·h²·(dh/dt)   ⟹   dh/dt = (dV/dt) / ((π/4)·h²)',
    sVar: { symbol: 'h', label: 'water depth', unit: 'm', min: 0.35, max: 3.9, start: 0.5, step: 0.01 },
    drive: { symbol: 'dV/dt', label: 'tap rate', unit: 'm³/s', min: 0.3, max: 4, start: 1.5, step: 0.05 },
    derived: { symbol: 'dh/dt', label: 'level speed', unit: 'm/s' },
    stateIsDriven: false,   // the tap drives volume; the depth is what follows
    rate: (h, v) => v / ((Math.PI / 4) * h * h),
    challenge: { target: 0.5, tol: 0.02,
      prompt: 'Find the depth at which the level is rising by 0.5 m every second.' },
    note: 'The surface is a disc whose area grows with depth, so the same water raises the level less and less.',
  },
  {
    id: 'shadow', label: 'Walking shadow', lamp: 6, person: 1.8,
    title: 'A shadow stretches under a lamp',
    setup: 'A 1.8 m person walks away from a 6 m lamp at a steady pace.',
    constraint: 's / 1.8 = (x + s) / 6',
    relation: 'ds/dt = (1.8 / 4.2)·(dx/dt)  — a constant multiple',
    sVar: { symbol: 'x', label: 'distance from lamp', unit: 'm', min: 0.5, max: 7, start: 1.5, step: 0.05 },
    drive: { symbol: 'dx/dt', label: 'walking speed', unit: 'm/s', min: 0.3, max: 2.5, start: 1.2, step: 0.05 },
    derived: { symbol: 'ds/dt', label: 'shadow growth', unit: 'm/s' },
    stateIsDriven: true,
    rate: (x, v) => (1.8 / (6 - 1.8)) * v,
    shadowLength: x => (1.8 * x) / (6 - 1.8),
    challenge: null,   // the rate does not depend on x, so there is nothing to find
    note: 'The constraint is LINEAR, so differentiating leaves no x behind — the shadow grows at the same rate wherever you stand.',
  },
];

export const byId = id => SCENARIOS.find(s => s.id === id) ?? null;

/** The state value that produces `target` for the derived rate, or null. */
export function solveFor(sc, target, drive) {
  if (sc.id === 'ladder') {
    // |dy/dt| = drive  ⟺  x = y  ⟺  x = L/√2
    return sc.L / Math.SQRT2;
  }
  if (sc.id === 'balloon') return Math.sqrt(drive / (4 * Math.PI * target));
  if (sc.id === 'ripple') return target / (2 * Math.PI * drive);
  if (sc.id === 'cone') return Math.sqrt(drive / ((Math.PI / 4) * target));
  return null;
}

/** How far the current state is from clearing the challenge. */
export function missBy(sc, s, drive) {
  if (!sc.challenge) return Infinity;
  const r = sc.rate(s, drive);
  if (sc.challenge.equalRates) return Math.abs(Math.abs(r) - Math.abs(drive));
  return Math.abs(r - sc.challenge.target);
}

export const inRange = (sc, s) => s >= sc.sVar.min && s <= sc.sVar.max;

/**
 * How fast the STATE variable itself moves, for letting time run.
 * Where the state variable is the one being driven (a ladder base pulled at a
 * fixed speed) that is just the drive; where the drive acts on something else
 * (a pump filling a balloon) the state moves at the derived rate instead.
 */
export const stateSpeed = (sc, s, drive) => (sc.stateIsDriven ? drive : Math.abs(sc.rate(s, drive)));

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'One rate you control, another the geometry hands you',
  intro: `Related-rates problems read like word puzzles, but they are all one move. Two quantities are
    tied together by a <b>geometric fact</b> — Pythagoras, a volume formula, similar triangles.
    Differentiate that fact with respect to time and the tie becomes a relation between their
    <em>rates</em>. You control one; the other follows, and it usually will not sit still.`,
  steps: [
    { level: 'intro', title: 'Start with the fact, not the rates',
      body: `The ladder's length never changes, so <code>x² + y² = 25</code> is true at every instant.
        That single sentence is the whole physics. Everything else is calculus applied to it.`,
      state: { scenario: 'ladder', s: 1.4, drive: 0.8 }, jump: 'Set up the ladder' },

    { level: 'intro', title: 'Differentiate, and rates appear',
      body: `Take <code>d/dt</code> of both sides: <code>2x·(dx/dt) + 2y·(dy/dt) = 0</code>. Note what
        happened — <code>x</code> and <code>y</code> are functions of time, so the chain rule leaves a
        rate attached to each. Rearranged, <code>dy/dt = −(x/y)·(dx/dt)</code>.`,
      state: { scenario: 'ladder', s: 3, drive: 0.8 }, jump: 'Move the base out' },

    { level: 'use', title: 'The driven rate is constant; the derived one is not',
      body: `Pull the base at a steady 0.8 m/s and the top does <b>not</b> fall steadily. Near vertical
        it barely moves; near flat it plunges. Press "Let time run" and watch the two arrows behave
        completely differently.`,
      state: { scenario: 'ladder', s: 4.5, drive: 0.8 }, jump: 'Take it near flat' },

    { level: 'use', title: 'The same move works on any constraint',
      body: `A balloon: <code>V = (4/3)πr³</code> gives <code>dV/dt = 4πr²·(dr/dt)</code>. Pump air in at
        a fixed rate and the skin slows as it grows, because the same air is spread over an area that
        goes like <code>r²</code>. Nothing new — differentiate the fact.`,
      state: { scenario: 'balloon', s: 0.5, drive: 4 }, jump: 'Inflate a balloon' },

    { level: 'advanced', title: 'When the model breaks before the object does',
      body: `As the ladder flattens, <code>y → 0</code> and <code>dy/dt → ∞</code>. No real ladder does
        that. The constraint quietly assumed the top stays touching the wall, and near the end it does
        not. A related-rates answer is only as good as the geometric fact behind it.`,
      state: { scenario: 'ladder', s: 4.78, drive: 0.8 }, jump: 'Push it to the limit' },

    { level: 'advanced', title: 'A linear constraint leaves nothing behind',
      body: `Similar triangles give <code>s = 1.8x / 4.2</code> — linear. Differentiate and the x
        vanishes entirely: <code>ds/dt</code> is a fixed multiple of walking speed, the same three
        metres from the lamp as thirty. This is the one case where "related rates" produces a constant,
        and it is worth knowing why: differentiating a straight line gives a number, not a function.`,
      state: { scenario: 'shadow', s: 1.5, drive: 1.2 }, jump: 'Walk under the lamp' },

    { level: 'real', title: 'Air traffic control and closing speed',
      body: `Two aircraft on converging tracks: controllers care about the rate the <em>distance
        between them</em> shrinks, not their individual speeds. That distance is a Pythagorean
        constraint on their positions, and differentiating it gives closing rate — which is what a
        collision-avoidance system computes many times a second before it decides to shout.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Two aircraft on converging paths with the distance between them shrinking">
  <g stroke="#7e98c4" stroke-opacity=".4"><path d="M20 100 H240"/><path d="M40 20 V110"/></g>
  <g fill="#3df2c0"><path d="M96 40 l14 6 -14 6 -4 -6 z"/></g>
  <g fill="#ffb454"><path d="M170 92 l-14 -6 14 -6 4 6 z"/></g>
  <g stroke="#3df2c0" stroke-width="1.8" fill="#3df2c0"><path d="M110 46 H144"/><path d="M150 46 l-8 -4 v8 z"/></g>
  <g stroke="#ffb454" stroke-width="1.8" fill="#ffb454"><path d="M156 86 H122"/><path d="M116 86 l8 -4 v8 z"/></g>
  <path d="M100 46 L166 86" stroke="#ff5d73" stroke-width="2" stroke-dasharray="5 4"/>
  <text x="130" y="122" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">d² = Δx² + Δy² ⟹ closing rate</text>
</svg>`,
      state: { scenario: 'ladder', s: 3.54, drive: 1.2 }, jump: 'Show me a Pythagorean tie' },

    { level: 'real', title: 'Why a fuel gauge lies, and dosing a reactor',
      body: `The conical tank here is the honest version of a problem every process engineer meets: a
        constant inflow does <b>not</b> raise the level at a constant rate, because the surface area
        changes with depth. Chemical plants size their level sensors around exactly this; so do
        anaesthetists infusing into a non-cylindrical reservoir, and so does the software that turns
        a tank sounding into a volume.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A cone filling in equal time steps, with the level rising less each time">
  <path d="M64 18 L106 106 L148 18" fill="none" stroke="#7e98c4" stroke-opacity=".5" stroke-width="1.6"/>
  <path d="M84 62 L106 106 L128 62 Z" fill="#7aa2ff" fill-opacity=".30"/>
  <g stroke="#7e98c4" stroke-opacity=".45" stroke-dasharray="3 3">
    <path d="M92 84 H120"/><path d="M84 62 H128"/><path d="M76 44 H136"/>
  </g>
  <g stroke="#ff5d73" stroke-width="1.6" fill="#ff5d73">
    <path d="M160 84 V72"/><path d="M160 68 l-3 6 h6 z"/>
    <path d="M160 62 V54"/><path d="M160 50 l-3 6 h6 z"/>
    <path d="M160 44 V40"/><path d="M160 36 l-3 6 h6 z"/>
  </g>
  <text x="196" y="66" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9">equal volumes,</text>
  <text x="196" y="80" fill="#ff5d73" font-family="JetBrains Mono, monospace" font-size="9">smaller rises</text>
</svg>`,
      state: { scenario: 'cone', s: 0.5, drive: 1.5 }, jump: 'Fill a conical tank' },

    { level: 'use', title: 'Decide what is fixed before you differentiate',
      body: `The ladder's <em>length</em> never changes, so it differentiates to nothing; <code>x</code> and
        <code>y</code> both change, so both pick up rates. Sorting constants from variables before
        applying <code>d/dt</code> is where most of these problems are won or lost — a "constant" that is
        secretly varying produces a wrong equation that still looks tidy.`,
      state: { scenario: 'cone', s: 1.2, drive: 1.5 }, jump: 'Show me a fixed shape, rising level' },

    { level: 'use', check: {
      q: 'Water flows into the conical tank at a constant rate dV/dt. Does the water level rise at a constant rate too?',
      options: [
        { text: 'No — the level rises fastest when the tank is nearly empty, and slows as it fills', correct: true,
          why: 'Right. dh/dt = (dV/dt) / ((π/4)h²): the same dV/dt divided by a growing h² means the level climbs quickly at first and creeps as the water spreads over an ever-wider surface.' },
        { text: 'Yes — dh/dt equals dV/dt divided by a constant', why: 'The divisor is (π/4)h², which grows as the tank fills — that is not a constant, so dh/dt is not one either.' },
        { text: 'Yes, because volume and height are always directly proportional', why: 'That is only true in a cylinder, where cross-sectional area is fixed. In a cone the cross-section grows with depth, so V is proportional to h³, not h.' },
      ],
      state: { scenario: 'cone', s: 0.5, drive: 1.5 },
    } },

    { level: 'advanced', title: 'The chain rule is doing all the work',
      body: `Why does <code>d/dt (x²)</code> give <code>2x·(dx/dt)</code> rather than <code>2x</code>?
        Because <code>x</code> is a function of time, so the outer power rule multiplies by the inner
        derivative. Every related-rates equation is implicit differentiation with <code>t</code> as the
        hidden variable — no new technique, just the chain rule taken seriously.`,
      state: { scenario: 'ripple', s: 1.4, drive: 0.6 }, jump: 'Differentiate an area' },

    { level: 'advanced', title: 'Units are a free correctness check',
      body: `In the cone, <code>dV/dt</code> is m³/s and it divides by an area in m² to give m/s. If your
        answer comes out in the wrong units, the equation is wrong — no arithmetic check needed. This
        catches a genuine, common mistake: differentiating the wrong quantity and not noticing because
        the algebra still ran.`,
      state: { scenario: 'balloon', s: 1.8, drive: 4 }, jump: 'Check the units here' },

    { level: 'real', title: 'Radar, and how a speed gun really works',
      body: `A radar gun measures the rate at which the <em>distance</em> to a car changes, not the car's
        speed along the road. Those differ by a cosine when the gun is off to one side — the "cosine
        error" — and it always reads <b>low</b>, which is why the physics favours the driver. Aircraft
        collision-avoidance systems compute the same closing rate from a Pythagorean constraint.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A radar gun beside the road measuring closing distance rather than road speed">
  <path d="M18 96 H242" stroke="#7e98c4" stroke-opacity=".45"/>
  <path d="M18 78 H242" stroke="#7e98c4" stroke-opacity=".25" stroke-dasharray="6 6"/>
  <rect x="96" y="66" width="34" height="14" rx="3" fill="#eaeff8" fill-opacity=".8"/>
  <g stroke="#3df2c0" stroke-width="2" fill="#3df2c0">
    <path d="M136 73 H184"/><path d="M190 73 l-8 -4 v8 z"/>
  </g>
  <circle cx="52" cy="110" r="6" fill="#ffd76a"/>
  <path d="M58 108 L100 78" stroke="#ff5d73" stroke-width="1.8" stroke-dasharray="4 3"/>
  <g font-family="JetBrains Mono, monospace" font-size="9">
    <text x="196" y="70" fill="#3df2c0">true speed</text>
    <text x="60" y="94" fill="#ff5d73">what radar sees</text>
  </g>
</svg>`,
      state: { scenario: 'ladder', s: 2.5, drive: 1.4 }, jump: 'Show me a closing distance' },

    { level: 'real', title: 'How fast is an outbreak growing?',
      body: `Epidemiologists never observe an infection rate directly — they observe case counts and
        differentiate. The relationship between new cases, hospital admissions and deaths is a chain of
        related rates with lags, and the same structure governs reaction rates in chemistry and
        radioactive decay. When a briefing says "the rate of increase is slowing", that is a statement
        about a second derivative.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A rising case curve with its slope steepening then easing">
  <path d="M20 106 H242" stroke="#7e98c4" stroke-opacity=".45"/>
  <path d="M24 102 Q92 98 132 58 Q176 14 238 8" fill="none" stroke="#ffb454" stroke-width="2"/>
  <path d="M64 108 L120 84" stroke="#3df2c0" stroke-width="2"/>
  <path d="M104 92 L166 26" stroke="#3df2c0" stroke-width="2"/>
  <path d="M182 32 L240 16" stroke="#3df2c0" stroke-width="2"/>
  <g fill="#ffd76a"><circle cx="92" cy="96" r="3.6"/><circle cx="134" cy="58" r="3.6"/><circle cx="212" cy="21" r="3.6"/></g>
  <text x="130" y="122" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">the slope is the thing being reported</text>
</svg>`,
      state: { scenario: 'ripple', s: 2.4, drive: 0.9 }, jump: 'Show me an accelerating spread' },
  ],
};
