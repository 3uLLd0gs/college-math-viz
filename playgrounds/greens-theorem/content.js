/* ---- CONTENT: the FIELDS registry — the only part that changes per concept ----
   Green's theorem says ∮_C F·dr = ∬_R curl F dA. To make that an experiment
   rather than an assertion, both sides are computed independently and shown
   side by side.

   Every field here has curl that CHANGES SIGN across the domain, so a loop can
   be positioned where the positive and negative interior curl cancel and the
   boundary circulation vanishes. That cancellation is the challenge, and it is
   only interesting when the curl is not constant — a field with uniform curl
   circulates on every loop no matter where you put it.

   `zeroLine` describes, in words, the locus where curl = 0; the playground
   draws that locus from the field itself via marching squares, so the two can
   never disagree. */
export const FIELDS = [
  { id: 'quad', label: '(0, x²)',
    P: () => 0, Q: (x) => x * x,
    curl: (x) => 2 * x,
    zeroLine: 'the y-axis',
    note: 'curl = 2x — the right half spins one way, the left half the other' },

  { id: 'hyper', label: '(y², x²)',
    P: (x, y) => y * y, Q: (x) => x * x,
    curl: (x, y) => 2 * x - 2 * y,
    zeroLine: 'the line y = x',
    note: 'curl = 2(x − y) — it vanishes along the diagonal' },

  { id: 'wave', label: '(sin y, sin x)',
    P: (x, y) => Math.sin(y), Q: (x) => Math.sin(x),
    curl: (x, y) => Math.cos(x) - Math.cos(y),
    zeroLine: 'both diagonals y = ±x',
    note: 'curl = cos x − cos y — a chequerboard of spin' },

  { id: 'mixed', label: '(−y, xy)',
    P: (x, y) => -y, Q: (x, y) => x * y,
    curl: (x, y) => y + 1,
    zeroLine: 'the line y = −1',
    note: 'curl = y + 1 — spin grows steadily as you move up' },

  { id: 'grad', label: '(2x, 2y)',
    P: (x) => 2 * x, Q: (x, y) => 2 * y,
    curl: () => 0,
    zeroLine: null,
    note: 'F = ∇(x² + y²) — a gradient field, so its curl is zero everywhere' },
];

/**
 * Closed form of ∬ curl dA over the disc of radius r at (cx, cy), used by the
 * tests as an independent check on the numeric integrators. Available only for
 * fields whose curl is linear, where the mean over a disc equals the value at
 * the centre and the integral is simply curl(centre) × area.
 */
export function exactCirculation(field, cx, cy, r) {
  if (!LINEAR_CURL.has(field.id)) return null;
  return field.curl(cx, cy) * Math.PI * r * r;
}

/** Fields whose curl is an affine function of x and y. */
export const LINEAR_CURL = new Set(['quad', 'hyper', 'mixed', 'grad']);

/** Sample curl onto an (n+1)×(n+1) grid over [-a,a]², for iso-line extraction. */
export function curlGrid(field, a, n) {
  const z = [];
  for (let i = 0; i <= n; i++) {
    z[i] = [];
    const x = -a + 2 * a * i / n;
    for (let j = 0; j <= n; j++) z[i][j] = field.curl(x, -a + 2 * a * j / n);
  }
  return z;
}

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'What happens on the edge is decided by what happens inside',
  intro: `Green's theorem links two very different measurements. Walk once round a closed loop, adding
    up how much the field pushes you along — that is <b>circulation</b>, an edge quantity. Separately,
    add up the curl at every point <em>inside</em> the loop — an area quantity. The theorem says they
    are the same number. This page computes both, by completely different routes, and puts them side
    by side so you can watch them agree.`,
  steps: [
    { level: 'intro', title: 'Two numbers, computed independently',
      body: `The panel shows <code>∮F·dr</code> from walking the boundary, and <code>∬curl dA</code>
        from sweeping the interior. Nothing in the code derives one from the other. Their difference
        sits underneath — it stays around <code>1e-12</code>, which is floating-point noise, not
        agreement by construction.`,
      state: { field: 'quad', x: 0.8, y: 0.6, r: 0.7 }, jump: 'Show me both sides' },

    { level: 'intro', title: 'The tint is the curl inside',
      body: `Green patches are where curl is positive, red where it is negative. The interior integral
        is literally adding up that colour, weighted by area. On this field curl is <code>2x</code>, so
        crossing to the left of the axis turns the disc red and both numbers go <b>negative</b> — same
        loop, same size, opposite answer.`,
      state: { field: 'quad', x: -1.2, y: 0.2, r: 0.8 }, jump: 'Move it into the red' },

    { level: 'use', title: 'Make them cancel',
      body: `The dashed gold line is where curl is exactly zero. Straddle it so the green and red
        areas balance, and the interior integral goes to zero — so the boundary circulation must too,
        even though the field along that boundary is nowhere near zero. That is the theorem doing real
        work.`,
      state: { field: 'quad', x: 0, y: 0.4, r: 0.75 }, jump: 'Balance it on the zero line' },

    { level: 'use', title: 'Size is not the point — enclosure is',
      body: `On <code>(y², x²)</code> the curl is <code>2(x − y)</code>, zero along the diagonal. Sit a
        loop on that line and it circulates nothing — and it keeps circulating nothing however large
        you make it, because every extra green patch arrives with a matching red one. Circulation is
        not about how far you walk; it is about what you enclosed.`,
      state: { field: 'hyper', x: 0.5, y: 0.5, r: 1.3 }, jump: 'Show me a big loop with nothing in it' },

    { level: 'advanced', title: 'Zero curl everywhere means zero circulation always',
      body: `<code>F = (2x, 2y)</code> is a gradient field — it is <code>∇(x² + y²)</code>. Its curl is
        zero at every point, so <em>every</em> loop you can draw has zero circulation. That is what
        <b>conservative</b> means: the work done going round and back is nil, and path between two
        points does not matter. Green's theorem makes it obvious rather than surprising.`,
      state: { field: 'grad', x: 0.6, y: -0.4, r: 1.0 }, jump: 'Try a conservative field' },

    { level: 'real', title: 'How a wing makes lift',
      body: `The Kutta–Joukowski theorem says lift per unit span is <code>ρ·V·Γ</code>, where Γ is the
        <b>circulation</b> around the aerofoil — exactly the loop integral on this page. Aerodynamicists
        measure it round a contour in the far field, where the flow is smooth, rather than wrestling
        with the boundary layer on the surface. Green's theorem is the licence to do that swap.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="An aerofoil with a circulation loop drawn around it and lift acting upward">
  <path d="M70 74 q46 -30 106 -8 q-52 22 -106 8 z" fill="#eaeff8" fill-opacity=".82"/>
  <ellipse cx="124" cy="66" rx="76" ry="40" fill="none" stroke="#ffd76a" stroke-width="2" stroke-dasharray="6 4"/>
  <path d="M196 60 l6 6 -8 5 z" fill="#ffd76a"/>
  <g stroke="#3df2c0" stroke-width="2.4" fill="#3df2c0">
    <path d="M124 44 V18"/><path d="M124 12 l-4 8 h8 z"/>
  </g>
  <text x="140" y="24" fill="#3df2c0" font-family="JetBrains Mono, monospace" font-size="9">lift</text>
  <text x="130" y="118" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">L = ρVΓ, and Γ is a loop integral</text>
</svg>`,
      state: { field: 'mixed', x: 0.6, y: -0.2, r: 0.9 }, jump: 'Show me a circulating field' },

    { level: 'real', title: 'The planimeter, and how a chip measures its own area',
      body: `Set <code>F = (−y/2, x/2)</code>, whose curl is exactly 1. Then the interior integral is
        simply the <b>area</b>, and the theorem says you can measure it by tracing the boundary alone.
        Surveyors used mechanical planimeters that did this on maps; today the same identity — the
        shoelace formula — is what computes polygon area in CAD, GIS and graphics.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Tracing the outline of an irregular shape to obtain its area">
  <path d="M52 84 L74 34 L124 20 L178 44 L206 88 L146 108 L92 100 Z" fill="#3df2c0" fill-opacity=".14" stroke="#3df2c0" stroke-width="2"/>
  <g fill="#ffd76a">
    <circle cx="52" cy="84" r="3.4"/><circle cx="74" cy="34" r="3.4"/><circle cx="124" cy="20" r="3.4"/>
    <circle cx="178" cy="44" r="3.4"/><circle cx="206" cy="88" r="3.4"/><circle cx="146" cy="108" r="3.4"/><circle cx="92" cy="100" r="3.4"/>
  </g>
  <text x="130" y="124" fill="#8b95ab" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">trace the edge, get the area</text>
</svg>`,
      state: { field: 'wave', x: 0.95, y: 0.95, r: 1.15 }, jump: 'Show me a traced loop' },
  ],
};
