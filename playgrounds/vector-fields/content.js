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
