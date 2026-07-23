/* ---- CONTENT: the FIELDS registry — the only part that changes per concept ----
   Each field is F(x, y) = (P, Q) with its analytic divergence and curl, and a
   stagnation point (where F = 0) that the challenge asks the student to find.

   The equilibria are deliberately NOT at the origin. Every textbook field is
   written centred, which makes the answer "the middle" before you have read
   anything; shifting them turns the hunt into actually reading the arrows.

   Divergence and curl are independent, and the registry is chosen to show all
   four combinations: source (div>0, curl 0), vortex (div 0, curl≠0), saddle
   (both 0), and spiral sink (div<0, curl≠0). */
export const FIELDS = [
  { id: 'source', label: 'source', tex: '(x−c₁, y−c₂)',
    at: [0.8, -0.6],
    P: (x, y) => x - 0.8, Q: (x, y) => y + 0.6,
    div: () => 2, curl: () => 0,
    kind: 'Source', blurb: 'every arrow points away — flow is created here' },

  { id: 'sink', label: 'sink', tex: '−(x−c₁, y−c₂)',
    at: [-0.9, -0.7],
    P: (x, y) => -(x + 0.9), Q: (x, y) => -(y + 0.7),
    div: () => -2, curl: () => 0,
    kind: 'Sink', blurb: 'every arrow points in — flow drains away here' },

  { id: 'vortex', label: 'vortex', tex: '(−(y−c₂), x−c₁)',
    at: [-0.7, 0.9],
    P: (x, y) => -(y - 0.9), Q: (x, y) => x + 0.7,
    div: () => 0, curl: () => 2,
    kind: 'Vortex', blurb: 'it spins without gaining or losing any flow' },

  { id: 'saddle', label: 'saddle', tex: '(x−c₁, −(y−c₂))',
    at: [0.6, 0.8],
    P: (x, y) => x - 0.6, Q: (x, y) => -(y - 0.8),
    div: () => 0, curl: () => 0,
    kind: 'Saddle', blurb: 'in along one axis, out along the other — no spin, no net flow' },

  { id: 'spiral', label: 'spiral', tex: 'sink + spin',
    at: [0.9, 0.7],
    P: (x, y) => -(x - 0.9) - (y - 0.7), Q: (x, y) => (x - 0.9) - (y - 0.7),
    div: () => -2, curl: () => 2,
    kind: 'Spiral sink', blurb: 'spins inward — divergence and curl are both non-zero' },

  { id: 'shear', label: 'shear', tex: '(y−c₂, 0)',
    at: null,   // stagnation along a whole line, not a point
    P: (x, y) => y - 0.5, Q: () => 0,
    div: () => 0, curl: () => -1,
    kind: 'Shear', blurb: 'parallel flow at different speeds — it still has curl' },
];

export const speed = (fd, x, y) => Math.hypot(fd.P(x, y), fd.Q(x, y));

/**
 * Name a field's behaviour at a point from its divergence and curl alone. This
 * is the classification the whole playground is teaching, so it lives in the
 * content layer where it can be tested directly.
 */
export function classify(div, curl, eps = 0.2) {
  const spinning = Math.abs(curl) > eps;
  const flowing = Math.abs(div) > eps;
  if (!spinning && !flowing) return 'incompressible & irrotational';
  if (spinning && !flowing) return curl > 0 ? 'counter-clockwise spin' : 'clockwise spin';
  if (!spinning && flowing) return div > 0 ? 'source (outflow)' : 'sink (inflow)';
  return (div > 0 ? 'outflow' : 'inflow') + (curl > 0 ? ' + ccw spin' : ' + cw spin');
}

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'A function that hands you an arrow instead of a number',
  intro: `Most functions take a point and return a number — a height, a temperature. A <b>vector
    field</b> takes a point and returns an <em>arrow</em>: a direction and a size. Wind at every
    place on a map, current at every point in a river, force on a charge at every point in space.
    Once you can read the arrows, the shape of the flow tells you nearly everything.`,
  steps: [
    { level: 'intro', title: 'Read the arrows before the algebra',
      body: `Each arrow is <code>F(x, y)</code> drawn at the point it belongs to. Colour and length
        carry its size. Do not start with the formula — start by asking where things are heading and
        where they speed up.`,
      state: { field: 'source', x: -1.4, y: 1.2 }, jump: 'Show me a plain field' },

    { level: 'intro', title: 'A streamline is the path you would drift along',
      body: `Drop a particle in and it follows the arrows. The blue curve through the probe is that
        path, traced both forwards and backwards. Release one and watch — the arrows are the rule, the
        streamline is the consequence.`,
      state: { field: 'vortex', x: 0.6, y: 0.9 }, jump: 'Show me a vortex path' },

    { level: 'use', title: 'Divergence: is flow being created here?',
      body: `Positive divergence means more flow leaves a tiny region than enters — a source. Negative
        means a sink. Zero means whatever flows in flows out, which for a real fluid is what
        <b>incompressible</b> means.`,
      state: { field: 'sink', x: 0.4, y: 0.4 }, jump: 'Show me a sink' },

    { level: 'use', title: 'Curl: is the flow turning?',
      body: `Curl measures rotation, and it is <em>independent</em> of divergence. A vortex spins
        without creating flow; a source creates flow without spinning. A spiral does both, which is
        why you cannot infer one from the other.`,
      state: { field: 'spiral', x: 1.4, y: 1.2 }, jump: 'Show me a spiral' },

    { level: 'advanced', title: 'Shear has curl even though nothing looks like it turns',
      body: `In <code>F = (y − c, 0)</code> every arrow points the same way — only the speed changes with
        height. Drop a paddle wheel in and it <b>still spins</b>, because one side sits in faster flow
        than the other. This is the example that breaks the intuition "curl means it looks swirly".`,
      state: { field: 'shear', x: 0.8, y: 1.2 }, jump: 'Show me shear' },

    { level: 'real', title: 'Weather maps and ocean currents',
      body: `A wind map is a vector field, and the features forecasters name are its structure:
        convergence zones are where divergence is negative and air is forced upward into cloud;
        cyclones are regions of large curl. Ocean models track the same object to predict where a spill,
        a buoy or a container of rubber ducks will end up — by tracing streamlines.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A rotating low pressure system beside converging airflow">
  <g stroke="#3df2c0" stroke-width="1.8" fill="none">
    <path d="M74 26 a34 34 0 1 1 -30 18"/><path d="M44 44 l9 -3 -1 9 z" fill="#3df2c0"/>
    <path d="M74 44 a16 16 0 1 1 -14 8"/><path d="M60 52 l8 -2 -1 8 z" fill="#3df2c0"/>
  </g>
  <text x="74" y="112" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">curl: a cyclone</text>
  <g stroke="#ffb454" stroke-width="1.8" fill="#ffb454">
    <path d="M150 30 H186"/><path d="M192 30 l-8 -4 v8 z"/>
    <path d="M238 30 H206"/><path d="M200 30 l8 -4 v8 z"/>
    <path d="M150 58 H186"/><path d="M192 58 l-8 -4 v8 z"/>
    <path d="M238 58 H206"/><path d="M200 58 l8 -4 v8 z"/>
    <path d="M196 70 V90"/><path d="M196 96 l-4 -8 h8 z"/>
  </g>
  <text x="196" y="112" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">convergence lifts air</text>
</svg>`,
      state: { field: 'vortex', x: -0.2, y: 1.4 }, jump: 'Show me a cyclone' },

    { level: 'real', title: 'Fields you cannot see at all',
      body: `The electric field around a charge is a source field; the magnetic field around a wire is a
        pure vortex with zero divergence — which is exactly the statement that there are no magnetic
        monopoles. Maxwell's equations are four statements about the divergence and curl of two vector
        fields, and everything from radio to MRI follows from them.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Electric field radiating from a charge beside magnetic field looping a wire">
  <g stroke="#ffb454" stroke-width="1.6" fill="#ffb454">
    <circle cx="64" cy="56" r="8" fill="#ff5d73" stroke="none"/>
    <path d="M64 40 V24"/><path d="M64 18 l-3 7 h6 z"/>
    <path d="M64 72 V88"/><path d="M64 94 l-3 -7 h6 z"/>
    <path d="M48 56 H32"/><path d="M26 56 l7 -3 v6 z"/>
    <path d="M80 56 H96"/><path d="M102 56 l-7 -3 v6 z"/>
    <path d="M75 45 L88 32"/><path d="M92 28 l-2 8 6 -2 z"/>
    <path d="M53 67 L40 80"/><path d="M36 84 l2 -8 -6 2 z"/>
  </g>
  <text x="64" y="114" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">div E ≠ 0</text>
  <circle cx="196" cy="56" r="5" fill="#7aa2ff"/>
  <g fill="none" stroke="#3df2c0" stroke-width="1.6">
    <circle cx="196" cy="56" r="18"/><circle cx="196" cy="56" r="30"/>
  </g>
  <path d="M214 50 l6 6 -6 6 z" fill="#3df2c0"/>
  <text x="196" y="114" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">div B = 0</text>
</svg>`,
      state: { field: 'source', x: 1.5, y: -1.3 }, jump: 'Show me a point source' },
  ],
};
