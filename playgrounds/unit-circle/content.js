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
