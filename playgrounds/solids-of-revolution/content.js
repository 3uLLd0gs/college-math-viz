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
