/* ---- CONTENT: the FIELDS registry — the only part that changes per concept ----
   Divergence and curl are two independent things a flow can do at a point:
   expand/contract, and spin. The page shows each as a physical object — a ring
   of tracer particles whose area changes at rate div, and a paddle wheel that
   turns at rate curl/2 — so the challenge is to find the one spot where BOTH go
   still.

   Every solvable field therefore needs div and curl that both vanish somewhere
   reachable, and at DIFFERENT places for different fields, so the answer is not
   simply "the middle" every time. `still` records where that is. */
export const FIELDS = [
  { id: 'quad', label: '(x²−y², 2xy)', tex: 'shifted (x²−y², 2xy)',
    P: (x, y) => (x - 0.7) ** 2 - (y + 0.5) ** 2,
    Q: (x, y) => 2 * (x - 0.7) * (y + 0.5),
    div: (x) => 4 * (x - 0.7), curl: (x, y) => 4 * (y + 0.5),
    still: [0.7, -0.5],
    note: 'div = 4(x−c₁) and curl = 4(y−c₂): expansion is set by where you stand left-to-right, spin by up-and-down.' },

  { id: 'mixed', label: '(xy, 0)', tex: 'shifted (xy, 0)',
    P: (x, y) => (x + 0.9) * (y - 0.6), Q: () => 0,
    div: (x, y) => y - 0.6, curl: (x) => -(x + 0.9),
    still: [-0.9, 0.6],
    note: 'A one-component flow that still both spreads and spins — div and curl come from different partials.' },

  { id: 'cubic', label: '(−y³, x³)', tex: 'shifted (−y³, x³)',
    P: (x, y) => -((y - 0.4) ** 3), Q: (x) => (x + 0.6) ** 3,
    div: () => 0, curl: (x, y) => 3 * (x + 0.6) ** 2 + 3 * (y - 0.4) ** 2,
    still: [-0.6, 0.4],
    note: 'Divergence is zero everywhere — incompressible. Only the spin has to be hunted down.' },

  { id: 'blob', label: '((x−a)², (y−b)²)', tex: 'shifted ((x−a)², (y−b)²)',
    P: (x) => (x - 1.1) ** 2, Q: (x, y) => (y + 0.3) ** 2,
    div: (x, y) => 2 * (x - 1.1) + 2 * (y + 0.3), curl: () => 0,
    still: null, stillLine: 'the line where 2(x−1.1) + 2(y+0.3) = 0',
    note: 'Curl is zero everywhere — irrotational. The wheel never turns; only the ring breathes.' },

  { id: 'vortex', label: '(−y, x)', tex: '(−y, x)',
    P: (x, y) => -y, Q: (x) => x,
    div: () => 0, curl: () => 2,
    still: null, stillLine: null,
    note: 'Curl is 2 at every single point. There is nowhere the wheel slows down, let alone stops.' },
];

/** Both quantities at a point, and the paddle wheel rate they imply. */
export function readingsAt(field, x, y) {
  const d = field.div(x, y), c = field.curl(x, y);
  return { div: d, curl: c, omega: c / 2 };
}

/** How still the flow is here — the quantity the challenge drives to zero. */
export const stillness = (field, x, y) =>
  Math.max(Math.abs(field.div(x, y)), Math.abs(field.curl(x, y)));

/** Whether this field has any point at all where both vanish. */
export const canGoStill = field => field.still !== null || field.stillLine !== null;

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'Two things a flow can do at a point, and how to measure each',
  intro: `Stand at one spot in a flow. Two independent things may be happening: the fluid around you
    may be <b>spreading apart or squeezing together</b>, and it may be <b>turning</b>. Divergence
    measures the first, curl the second — and neither tells you anything about the other. This page
    gives each one a physical instrument.`,
  steps: [
    { level: 'intro', title: 'The ring measures spreading',
      body: `The mint ring is a loop of tracer particles, drifting with the flow. Watch its
        <em>area</em>: growing means positive divergence, shrinking means negative. The dashed circle
        is where it started, so you can see the change rather than guess it.`,
      state: { field: 'quad', x: -1.3, y: 1.2, r: 0.32 }, jump: 'Show me a shrinking ring' },

    { level: 'intro', title: 'The wheel measures turning',
      body: `The gold paddle wheel turns at <code>curl / 2</code>. That factor of two is not decoration:
        curl is circulation per unit area, and a rigid rotation at angular speed ω has curl 2ω. So the
        wheel literally reads half the number in the panel.`,
      state: { field: 'cubic', x: 1.0, y: -0.8, r: 0.32 }, jump: 'Spin the wheel fast' },

    { level: 'use', title: 'Both are limits of an integral, not just formulas',
      body: `Divergence is the <b>flux</b> out of a tiny loop divided by its area; curl is the
        <b>circulation</b> around it divided by the same area. The panel shows both ratios beside the
        pointwise values. Shrink the test circle and watch them meet.`,
      state: { field: 'cubic', x: 0.6, y: -0.4, r: 0.7 }, jump: 'Start with a big circle' },

    { level: 'use', title: 'Shrinking the circle is what makes it a point property',
      body: `With the radius small the two agree; with it large they do not, because the loop is
        averaging over a region where curl varies. Drag the radius down and the numbers converge —
        that convergence <em>is</em> the definition.`,
      state: { field: 'cubic', x: 0.6, y: -0.4, r: 0.1 }, jump: 'Shrink it and watch them meet' },

    { level: 'advanced', title: 'A field can spin everywhere and never stop',
      body: `<code>F = (−y, x)</code> has curl 2 at <em>every</em> point. There is nowhere to stand
        where the wheel slows, let alone stops. Compare that with the fields whose curl varies: those
        have places you can hunt for. Constant curl is why a rigid rotation has no special centre as
        far as curl is concerned.`,
      state: { field: 'vortex', x: 0.9, y: 0.9, r: 0.32 }, jump: 'Try to stop this wheel' },

    { level: 'real', title: 'Vorticity: why aircraft are spaced out on approach',
      body: `A wing sheds a pair of trailing vortices — concentrated curl, invisible, and strong enough
        to roll a following aircraft. Air traffic control enforces separation minima measured in
        minutes precisely because that vorticity takes time to decay. Meteorologists track the same
        quantity to find tornado-producing rotation inside a storm.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Trailing vortices spinning off the wingtips of an aircraft">
  <path d="M112 56 H148" stroke="#eaeff8" stroke-width="5" stroke-linecap="round"/>
  <path d="M60 56 H200" stroke="#eaeff8" stroke-width="3" stroke-linecap="round"/>
  <g fill="none" stroke="#3df2c0" stroke-width="1.6">
    <path d="M60 56 a16 16 0 1 0 -14 -8"/><path d="M200 56 a16 16 0 1 1 14 -8"/>
    <path d="M64 74 a22 22 0 1 0 -20 -10"/><path d="M196 74 a22 22 0 1 1 20 -10"/>
  </g>
  <g fill="#3df2c0"><path d="M46 48 l7 -2 -1 7 z"/><path d="M214 48 l-7 -2 1 7 z"/></g>
  <text x="130" y="114" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">wake turbulence is concentrated curl</text>
</svg>`,
      state: { field: 'vortex', x: 1.2, y: 0.4, r: 0.28 }, jump: 'Show me pure rotation' },

    { level: 'real', title: 'Divergence and the equations of everything that flows',
      body: `<code>div v = 0</code> is the statement that a fluid is incompressible — water, and air
        below about a third the speed of sound. It is one of the two equations behind every CFD
        simulation, every weather model and every aerodynamic design. In electromagnetism the same
        operator gives Gauss's law: <code>div E</code> is charge density.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Flow entering and leaving a small box in equal amounts">
  <rect x="96" y="34" width="68" height="56" rx="4" fill="none" stroke="#7e98c4" stroke-opacity=".55" stroke-width="1.6"/>
  <g stroke="#3df2c0" stroke-width="2" fill="#3df2c0">
    <path d="M40 48 H90"/><path d="M96 48 l-8 -4 v8 z"/>
    <path d="M40 76 H90"/><path d="M96 76 l-8 -4 v8 z"/>
  </g>
  <g stroke="#ffb454" stroke-width="2" fill="#ffb454">
    <path d="M164 48 H214"/><path d="M220 48 l-8 -4 v8 z"/>
    <path d="M164 76 H214"/><path d="M220 76 l-8 -4 v8 z"/>
  </g>
  <text x="130" y="112" fill="#ffd76a" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">in = out ⟹ div v = 0</text>
</svg>`,
      state: { field: 'cubic', x: 0.8, y: -0.6, r: 0.32 }, jump: 'Show me an incompressible field' },

    { level: 'use', title: 'Read a field by eye before computing anything',
      body: `Two questions answer most of it. Do arrows on opposite sides of your point pull <em>apart</em>
        or push <em>together</em>? That is divergence. Are the arrows on one side longer, or angled
        differently, from the other? That is curl. The instruments here just make those two judgements
        quantitative.`,
      state: { field: 'mixed', x: -0.2, y: 1.4, r: 0.32 }, jump: 'Judge this one by eye' },

    { level: 'use', check: {
      q: 'A field F is known to be the gradient of some scalar function, F = ∇f. What must its curl be?',
      options: [
        { text: 'Zero everywhere — curl(∇f) = 0 is an identity', correct: true,
          why: 'Right. This follows from mixed partials being equal (Clairaut\'s theorem): the curl of any gradient field is identically zero, no matter what f is.' },
        { text: 'Zero only at the critical points of f', why: 'The identity curl(∇f) = 0 holds at every point where f is twice differentiable — not just where ∇f itself happens to vanish.' },
        { text: 'It depends on whether f has a maximum or a minimum', why: "curl(∇f) = 0 is an algebraic identity from mixed partials — it doesn't depend on f's max/min structure at all." },
      ],
      state: { field: 'blob', x: 0.9, y: -0.7, r: 0.32 },
    } },

    { level: 'advanced', title: 'The curl of any gradient is zero',
      body: `<code>curl(∇f) = 0</code>, always — it follows from mixed partials being equal. So if a field
        has non-zero curl anywhere, it cannot be the gradient of any scalar, and no potential function
        exists. This single identity is why "conservative" and "irrotational" are the same condition.`,
      state: { field: 'blob', x: 0.9, y: -0.7, r: 0.32 }, jump: 'Show me an irrotational field' },

    { level: 'advanced', title: 'And the divergence of any curl is zero',
      body: `<code>div(curl F) = 0</code>, equally always. In three dimensions this is why magnetic field
        lines never begin or end: <code>B</code> is the curl of a vector potential, so its divergence
        vanishes identically, and monopoles are ruled out by the algebra before any experiment is run.`,
      state: { field: 'cubic', x: 0.7, y: -0.5, r: 0.3 }, jump: 'Show me a divergence-free field' },

    { level: 'real', title: 'The continuity equation: nothing disappears',
      body: `<code>∂ρ/∂t + div(ρv) = 0</code> says that if density drops somewhere, the flow must have
        carried it away — divergence is bookkeeping for conservation. The same equation governs mass in a
        pipe, charge in a wire, cars on a motorway and probability in quantum mechanics. Traffic jams are
        travelling regions of positive divergence.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Flow into and out of a control volume with a change in density inside">
  <path d="M18 40 H242" stroke="#7e98c4" stroke-opacity=".45"/>
  <path d="M18 96 H242" stroke="#7e98c4" stroke-opacity=".45"/>
  <rect x="98" y="40" width="66" height="56" fill="#7aa2ff" fill-opacity=".14" stroke="#7aa2ff" stroke-opacity=".55"/>
  <g stroke="#3df2c0" stroke-width="2.2" fill="#3df2c0">
    <path d="M32 68 H88"/><path d="M94 68 l-8 -4 v8 z"/>
  </g>
  <g stroke="#ffb454" stroke-width="1.4" fill="#ffb454">
    <path d="M170 68 H210"/><path d="M216 68 l-8 -4 v8 z"/>
  </g>
  <text x="131" y="118" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">more in than out ⟹ density rises</text>
</svg>`,
      state: { field: 'quad', x: -1.3, y: 1.2, r: 0.32 }, jump: 'Show me flow being squeezed' },

    { level: 'real', title: 'Storm rotation, and what a tornado warning is watching',
      body: `Doppler radar measures wind toward and away from it, and forecasters look for a tight couplet
        of opposite velocities side by side — a rotation signature. That couplet is a region of large
        curl, and it is what triggers a tornado warning, often before anything is visible. The same
        vorticity field predicts where a hurricane will intensify.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A radar velocity couplet of inbound and outbound winds sitting side by side">
  <circle cx="130" cy="60" r="48" fill="none" stroke="#7e98c4" stroke-opacity=".35"/>
  <path d="M106 24 a44 44 0 0 0 0 72 z" fill="#3df2c0" fill-opacity=".45"/>
  <path d="M154 24 a44 44 0 0 1 0 72 z" fill="#ff5d73" fill-opacity=".45"/>
  <g font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">
    <text x="88" y="62" fill="#3df2c0">toward</text>
    <text x="176" y="62" fill="#ff5d73">away</text>
    <text x="130" y="122" fill="#8b95ab">a tight couplet = rotation</text>
  </g>
</svg>`,
      state: { field: 'vortex', x: 0.8, y: 0.8, r: 0.3 }, jump: 'Show me pure rotation' },
  ],
};
