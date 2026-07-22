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
