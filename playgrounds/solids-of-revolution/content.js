/* ---- CONTENT: the REGIONS registry — the only part that changes per concept ----
   Each entry is a plane region: the area between f (outer) and g (inner, absent
   when the region sits on the axis) over [a, b].

   `exact` gives the closed-form volume for BOTH axes of revolution, so the page
   can show the true answer next to the approximation rather than comparing one
   numerical estimate against another. Every region has a ≥ 0 so revolving about
   the y-axis never double-covers. */
export const REGIONS = [
  { id: 'cone', label: 'y = x', tex: 'y = x on [0, 2]',
    f: x => x, a: 0, b: 2,
    exact: { x: 8 * Math.PI / 3, y: 16 * Math.PI / 3 },
    note: 'A triangle. About x it sweeps a cone; about y, a wider one.' },

  { id: 'hump', label: 'y = x − x²', tex: 'y = x − x² on [0, 1]',
    f: x => x - x * x, a: 0, b: 1,
    exact: { x: Math.PI / 30, y: Math.PI / 6 },
    note: 'A low arch. The two axes give volumes five times apart.' },

  { id: 'root', label: 'y = √x', tex: 'y = √x on [0, 4]',
    f: x => Math.sqrt(x), a: 0, b: 4,
    exact: { x: 8 * Math.PI, y: 128 * Math.PI / 5 },
    note: 'About x the integrand is linear, so even a few disks land exactly.' },

  { id: 'band', label: 'x² ≤ y ≤ x', tex: 'between y = x² and y = x on [0, 1]',
    f: x => x, g: x => x * x, a: 0, b: 1,
    exact: { x: 2 * Math.PI / 15, y: Math.PI / 6 },
    note: 'The region misses the x-axis, so revolving about x needs washers.' },

  { id: 'quarter', label: 'y = √(4−x²)', tex: 'y = √(4 − x²) on [0, 2]',
    f: x => Math.sqrt(Math.max(0, 4 - x * x)), a: 0, b: 2,
    exact: { x: 16 * Math.PI / 3, y: 16 * Math.PI / 3 },
    note: 'A quarter disc. Both axes sweep the same half-ball — equal by symmetry.' },
];

export const AXES = [
  { id: 'x', label: 'about x' },
  { id: 'y', label: 'about y' },
];

/**
 * Some region/axis pairs are integrated EXACTLY by the midpoint rule at any n,
 * because the volume integrand comes out linear — √x about the x-axis gives
 * π(√x)² = πx, and midpoint is exact for a linear integrand. That is a real and
 * rather nice property, not a defect, but it would hand the student a solved
 * challenge on arrival. The playground detects it and says so instead.
 *
 * Detected numerically rather than declared, so it stays true if a region is
 * ever edited.
 */
export function isExactAtAnyN(region, axis, sum) {
  const exact = region.exact[axis];
  return [1, 2, 3].every(n => Math.abs(sum(region, axis, n) - exact) < 1e-9 * Math.max(1, Math.abs(exact)));
}

/** Human name for the method the geometry forces, and why. */
export function methodReason(region, axis) {
  if (axis === 'y') return ['shell', 'revolving about y, so strips parallel to the axis become shells'];
  if (region.g) return ['washer', 'the region does not touch the x-axis, so each slice has a hole'];
  return ['disk', 'the region sits on the x-axis, so each slice is a full disk'];
}

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'Spin a flat region and you get a solid you can measure',
  intro: `Take a region in the plane and rotate it about a line. It sweeps out a solid. Its volume
    looks hopeless — until you notice that if you slice it <b>perpendicular to the axis</b>, every
    slice is a circle, and circles you can do. The whole subject is choosing the slice that turns the
    problem into an integral you already know.`,
  steps: [
    { level: 'intro', title: 'Two slices is enough to see the idea',
      body: `Each disk is a cylinder: area <code>πr²</code> times a small thickness. The radius is just
        the height of the curve at that x. Two of them are visibly too chunky — but they already have
        the right shape of formula.`,
      state: { region: 'cone', axis: 'x', n: 2 }, jump: 'Show me two disks' },

    { level: 'intro', title: 'More slices, less staircase',
      body: `Push the count up and the steps shrink toward the true surface. The gold wireframe is the
        real solid; the blue stack is your approximation chasing it. This is the Riemann sum again,
        with <code>πr²</code> in place of a height.`,
      state: { region: 'cone', axis: 'x', n: 24 }, jump: 'Refine it' },

    { level: 'use', title: 'A hole in the region means a hole in the slice',
      body: `When the region does not touch the axis, each slice is a <b>washer</b> — a disk with a
        bite out of the middle. Its area is <code>π(R² − r²)</code>, outer minus inner. Not
        <code>π(R − r)²</code>, which is the single most common slip here.`,
      state: { region: 'band', axis: 'x', n: 16 }, jump: 'Show me a washer' },

    { level: 'use', title: 'Change the axis and the method changes with it',
      body: `Spin the same region about the <em>y</em>-axis and slicing perpendicular would need the
        curve rewritten as x in terms of y. Instead slice <b>parallel</b> to the axis: each strip
        becomes a thin cylindrical <b>shell</b> of radius x, height f(x), and the volume is
        <code>2πx·h·Δx</code>. Same region, different answer, different tool.`,
      state: { region: 'band', axis: 'y', n: 14 }, jump: 'Switch to shells' },

    { level: 'advanced', title: 'Sometimes the arithmetic is exact from the start',
      body: `Revolving <code>√x</code> about the x-axis makes the integrand <code>π(√x)² = πx</code> —
        a straight line. The midpoint rule integrates straight lines <em>exactly</em>, so even one
        disk gives the true volume. The page says so rather than pretending you converged.`,
      state: { region: 'root', axis: 'x', n: 3 }, jump: 'Show me the exact case' },

    { level: 'real', title: 'Anything made on a lathe',
      body: `A chair leg, a wine glass, a rocket nozzle, a violin scroll — all are solids of revolution,
        because a lathe spins the workpiece against a fixed cutter. CAD systems store the profile curve
        and revolve it; the mass and centre of gravity engineers need come out of exactly this
        integral, with density folded in.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A profile curve beside the vase it sweeps when revolved">
  <path d="M40 16 V112" stroke="#8b95ab" stroke-dasharray="4 4"/>
  <path d="M40 16 Q74 34 62 60 Q52 86 78 112" fill="none" stroke="#ffb454" stroke-width="2"/>
  <text x="58" y="126" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">profile</text>
  <g transform="translate(126,0)">
    <path d="M40 16 Q74 34 62 60 Q52 86 78 112" fill="none" stroke="#3a769e" stroke-width="2"/>
    <path d="M40 16 Q6 34 18 60 Q28 86 2 112" fill="none" stroke="#3a769e" stroke-width="2"/>
    <g fill="none" stroke="#3a769e" stroke-opacity=".5">
      <ellipse cx="40" cy="16" rx="0.5" ry="3"/><ellipse cx="40" cy="42" rx="27" ry="7"/>
      <ellipse cx="40" cy="70" rx="21" ry="6"/><ellipse cx="40" cy="112" rx="38" ry="9"/>
    </g>
    <text x="40" y="126" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">revolved</text>
  </g>
</svg>`,
      state: { region: 'hump', axis: 'y', n: 18 }, jump: 'Show me a turned shape' },

    { level: 'real', title: 'Dosing a tank, and why gauges are non-linear',
      body: `A spherical or cylindrical tank lying on its side has a volume that is <b>not</b>
        proportional to depth — the cross-section is a circle, so the same centimetre of level change
        means very different volumes near the middle and near the top. Tank charts are built by
        integrating disks, and it is why a fuel gauge falls slowly then suddenly.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A round tank filling, with equal depth steps holding unequal volumes">
  <circle cx="76" cy="62" r="46" fill="none" stroke="#7e98c4" stroke-opacity=".5" stroke-width="1.6"/>
  <path d="M30 62 a46 46 0 0 0 92 0 z" fill="#7aa2ff" fill-opacity=".22"/>
  <g stroke="#7e98c4" stroke-opacity=".45" stroke-dasharray="3 3">
    <path d="M34 40 H118"/><path d="M30 62 H122"/><path d="M34 84 H118"/>
  </g>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab">
    <text x="150" y="34">equal depth steps</text>
    <text x="150" y="52" fill="#ff5d73">unequal volumes</text>
    <text x="150" y="76">widest slice at</text>
    <text x="150" y="90">the middle</text>
  </g>
</svg>`,
      state: { region: 'quarter', axis: 'x', n: 12 }, jump: 'Show me a round tank' },

    { level: 'use', title: 'Choosing the slice IS the skill',
      body: `Ask one question: <em>which way do I cut so every slice is a shape I can handle?</em>
        Perpendicular to the axis gives disks or washers and integrates in the axis variable. Parallel
        gives shells and integrates in the other one. Get that choice right and the integral is
        routine; get it wrong and you are inverting functions for no reason.`,
      state: { region: 'root', axis: 'y', n: 14 }, jump: 'Show me the shell choice' },

    { level: 'advanced', title: 'Pappus: volume without an integral',
      body: `Pappus's theorem says the volume equals the region's <b>area</b> times the distance its
        <b>centroid</b> travels: <code>V = 2πd̄·A</code>. For the triangle under <code>y = x</code> on
        [0,2] about the y-axis: area 2, centroid at x̄ = 4/3, so <code>V = 2π(4/3)(2) = 16π/3</code> —
        the number in the panel, with no integration at all.`,
      state: { region: 'cone', axis: 'y', n: 20 }, jump: 'Check Pappus against the sum' },

    { level: 'advanced', title: "Gabriel's horn: finite volume, infinite surface",
      body: `Revolve <code>1/x</code> from 1 to ∞ about the x-axis. The volume converges to <code>π</code>
        — you could fill it with paint. The surface area diverges — you could never paint it. Both are
        correct, and the paradox dissolves once you notice paint has thickness and mathematical surfaces
        do not.`,
      state: { region: 'root', axis: 'x', n: 30 }, jump: 'Show me a long thin solid' },

    { level: 'real', title: 'Pressure vessels and how much steel to buy',
      body: `Tanks, boilers, submarine hulls and rocket propellant domes are surfaces of revolution
        because a lathe or a spinning form can make them and because a body of revolution carries
        internal pressure evenly. Designers integrate the profile for volume (how much it holds) and for
        wall mass (what it costs and weighs) — and the centre of mass, which decides how the whole thing
        balances.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A domed pressure vessel formed by revolving a profile about its axis">
  <path d="M130 12 V116" stroke="#8b95ab" stroke-dasharray="4 4"/>
  <path d="M130 16 q42 4 42 30 v34 q0 26 -42 30" fill="none" stroke="#3a769e" stroke-width="2"/>
  <path d="M130 16 q-42 4 -42 30 v34 q0 26 42 30" fill="none" stroke="#3a769e" stroke-width="2"/>
  <g fill="none" stroke="#3a769e" stroke-opacity=".45">
    <ellipse cx="130" cy="46" rx="42" ry="9"/><ellipse cx="130" cy="80" rx="42" ry="9"/>
  </g>
  <g stroke="#ff5d73" stroke-width="1.5" fill="#ff5d73">
    <path d="M130 50 h22"/><path d="M156 50 l-6 -3 v6 z"/>
    <path d="M130 50 h-22"/><path d="M104 50 l6 -3 v6 z"/>
    <path d="M130 50 v-18"/><path d="M130 28 l-3 6 h6 z"/>
  </g>
  <text x="130" y="126" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">pressure acts evenly on a body of revolution</text>
</svg>`,
      state: { region: 'quarter', axis: 'x', n: 22 }, jump: 'Show me a domed shape' },

    { level: 'real', title: 'Reconstructing a volume from scan slices',
      body: `A CT or MRI scanner produces exactly what this page produces: a stack of cross-sections a
        known thickness apart. Software adds <code>area × thickness</code> over the stack to get organ
        or tumour volume — a Riemann sum over disks that are not circles. Radiotherapy dosing and
        surgical planning depend on that number, and its accuracy is set by slice thickness, which is
        the <code>n</code> slider here.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A stack of scan cross-sections of varying size adding to a volume">
  <g fill="#7aa2ff" fill-opacity=".22" stroke="#7aa2ff" stroke-opacity=".65">
    <ellipse cx="130" cy="26" rx="20" ry="6"/><ellipse cx="130" cy="44" rx="32" ry="8"/>
    <ellipse cx="130" cy="62" rx="38" ry="9"/><ellipse cx="130" cy="80" rx="33" ry="8"/>
    <ellipse cx="130" cy="98" rx="18" ry="6"/>
  </g>
  <g stroke="#3df2c0" stroke-width="1.4" fill="#3df2c0">
    <path d="M196 26 V96"/><path d="M196 26 l-3 6 h6 z"/><path d="M196 100 l-3 -6 h6 z"/>
  </g>
  <text x="212" y="66" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9">Δz</text>
  <text x="130" y="122" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">Σ area × Δz = volume</text>
</svg>`,
      state: { region: 'hump', axis: 'x', n: 12 }, jump: 'Show me a stack of slices' },
  ],
};
