/* ---- CONTENT: the FIELDS registry — the only part that changes per concept ----
   Each field carries f and its two analytic partials. `a` is the half-extent of
   the square domain; `hint` names where a student should look to find a spot
   where the gradient vanishes (there the directional derivative is zero in every
   direction, which the challenge deliberately excludes — see playground.js). */
export const FIELDS = [
  { id: 'bowl', label: 'x² + y²', tex: 'x² + y²',
    f: (x, y) => x * x + y * y,
    fx: (x, y) => 2 * x, fy: (x, y) => 2 * y, a: 2,
    hint: 'the gradient points straight out from the bottom of the bowl' },

  { id: 'saddle', label: 'x² − y²', tex: 'x² − y²',
    f: (x, y) => x * x - y * y,
    fx: (x, y) => 2 * x, fy: (x, y) => -2 * y, a: 2,
    hint: 'on a saddle the uphill direction swings sharply as you cross the pass' },

  { id: 'plane', label: '2x + y', tex: '2x + y',
    f: (x, y) => 2 * x + y,
    fx: () => 2, fy: () => 1, a: 2,
    hint: 'a plane has the same gradient everywhere — the arrow never turns' },

  { id: 'ripple', label: 'sin x · cos y', tex: 'sin x · cos y',
    f: (x, y) => Math.sin(x) * Math.cos(y),
    fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y), a: 3.1,
    hint: 'the gradient runs from each trough toward the neighbouring crest' },

  { id: 'hill', label: 'e^(−r²/3)', tex: 'e^(−r²/3)',
    f: (x, y) => Math.exp(-(x * x + y * y) / 3),
    fx: (x, y) => -2 * x / 3 * Math.exp(-(x * x + y * y) / 3),
    fy: (x, y) => -2 * y / 3 * Math.exp(-(x * x + y * y) / 3), a: 3,
    hint: 'everywhere on the hill the gradient points back toward the summit' },
];

/** ∇f at a point, as [∂f/∂x, ∂f/∂y]. */
export const grad = (field, x, y) => [field.fx(x, y), field.fy(x, y)];

/** |∇f| — the steepest slope available at a point, in any direction. */
export const gradMag = (field, x, y) => Math.hypot(...grad(field, x, y));

/** Compass angle of steepest ascent, in radians, or null where ∇f = 0. */
export function steepestAngle(field, x, y) {
  const [gx, gy] = grad(field, x, y);
  if (Math.hypot(gx, gy) < 1e-12) return null;
  return Math.atan2(gy, gx);
}

/**
 * Directional derivative D_u f = ∇f · u for the unit vector u at angle `theta`.
 * This is the whole lesson in one line: it peaks at |∇f| when u aligns with ∇f,
 * is zero along the contour, and is −|∇f| pointing downhill.
 */
export function directional(field, x, y, theta) {
  const [gx, gy] = grad(field, x, y);
  return gx * Math.cos(theta) + gy * Math.sin(theta);
}

/** Smallest absolute angle between two directions, in radians (0..π). */
export function angleGap(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}
