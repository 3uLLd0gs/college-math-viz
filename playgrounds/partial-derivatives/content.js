/* ---- CONTENT: the SURFACES registry — the only part that changes per concept ---- */
export const SURFACES = [
  { id: 'parab', label: 'x² + y²', f: (x, y) => x * x + y * y, fx: (x, y) => 2 * x, fy: (x, y) => 2 * y, a: 2, challenge: { tol: 0.06, hint: 'the bottom of the bowl' } },
  { id: 'saddle', label: 'x² − y²', f: (x, y) => x * x - y * y, fx: (x, y) => 2 * x, fy: (x, y) => -2 * y, a: 2, challenge: { tol: 0.06, hint: 'the saddle pass' } },
  { id: 'ripple', label: 'sin x · cos y', f: (x, y) => Math.sin(x) * Math.cos(y), fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y), a: 3.1, challenge: { tol: 0.05, hint: 'a crest or a trough' } },
  { id: 'gauss', label: 'e^(−r²/4)', f: (x, y) => Math.exp(-(x * x + y * y) / 4), fx: (x, y) => -x / 2 * Math.exp(-(x * x + y * y) / 4), fy: (x, y) => -y / 2 * Math.exp(-(x * x + y * y) / 4), a: 3, challenge: { tol: 0.04, hint: 'the summit of the hill' } },
];

// Both sliders start off-origin, as fractions of the surface's half-extent `a`.
// Every surface here has a critical point at the origin, so starting the probe at
// x = 0 would hand the student a solved challenge before they touch anything. The
// slice is offset too: on `ripple`, holding y = 0 makes the cross-section z = f(x,0)
// degenerate (identically zero) in the ∂f/∂y direction, which likewise reads as solved.
// Both fractions are multiples of the slider step (a/100), so they land exactly.
export const SLICE_START_FRAC = 0.35;
export const PROBE_START_FRAC = 0.6;
export const sliceStart = sf => sf.a * SLICE_START_FRAC;
export const probeStart = sf => sf.a * PROBE_START_FRAC;
