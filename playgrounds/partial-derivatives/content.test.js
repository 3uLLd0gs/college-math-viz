import { describe, it, expect } from 'vitest';

// Mirrors the SURFACES registry in playgrounds/partial-derivatives/content.js —
// verifies each analytic partial against a central-difference numerical approximation.
const SURFACES = [
  { id: 'parab', f: (x, y) => x * x + y * y, fx: (x, y) => 2 * x, fy: (x, y) => 2 * y, a: 2, challenge: { tol: 0.06 } },
  { id: 'saddle', f: (x, y) => x * x - y * y, fx: (x, y) => 2 * x, fy: (x, y) => -2 * y, a: 2, challenge: { tol: 0.06 } },
  { id: 'ripple', f: (x, y) => Math.sin(x) * Math.cos(y), fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y), a: 3.1, challenge: { tol: 0.05 } },
  { id: 'gauss', f: (x, y) => Math.exp(-(x * x + y * y) / 4), fx: (x, y) => -x / 2 * Math.exp(-(x * x + y * y) / 4), fy: (x, y) => -y / 2 * Math.exp(-(x * x + y * y) / 4), a: 3, challenge: { tol: 0.04 } },
];

// Must mirror SLICE_START_FRAC / PROBE_START_FRAC in content.js.
const SLICE_START_FRAC = 0.35;
const PROBE_START_FRAC = 0.6;

function numFx(f, x, y, h = 1e-5) { return (f(x + h, y) - f(x - h, y)) / (2 * h); }
function numFy(f, x, y, h = 1e-5) { return (f(x, y + h) - f(x, y - h)) / (2 * h); }

describe('Analytic partials match central-difference numerical approximation', () => {
  const samplePoints = [[0.7, -0.4], [1.3, 1.1], [-0.9, 0.6]];

  SURFACES.forEach(surf => {
    samplePoints.forEach(([x, y]) => {
      it(`${surf.id}: ∂f/∂x at (${x}, ${y})`, () => {
        expect(surf.fx(x, y)).toBeCloseTo(numFx(surf.f, x, y), 4);
      });
      it(`${surf.id}: ∂f/∂y at (${x}, ${y})`, () => {
        expect(surf.fy(x, y)).toBeCloseTo(numFy(surf.f, x, y), 4);
      });
    });
  });
});

describe('Starting probe position leaves the challenge unsolved', () => {
  // Every surface has a critical point at the origin, so a probe starting at 0 would
  // fire the win state on page load. Each start must sit clearly off the flat spot.
  SURFACES.forEach(surf => {
    const slice = surf.a * SLICE_START_FRAC;
    const probe = surf.a * PROBE_START_FRAC;

    it(`${surf.id}: |∂f/∂x| at the start exceeds tolerance ${surf.challenge.tol}`, () => {
      // axis 'x' holds y = slice and moves x = probe
      expect(Math.abs(surf.fx(probe, slice))).toBeGreaterThan(surf.challenge.tol);
    });

    it(`${surf.id}: |∂f/∂y| at the start exceeds tolerance ${surf.challenge.tol}`, () => {
      // axis 'y' holds x = slice and moves y = probe
      expect(Math.abs(surf.fy(slice, probe))).toBeGreaterThan(surf.challenge.tol);
    });

    it(`${surf.id}: slider starts land exactly on a step boundary`, () => {
      const step = surf.a / 100;
      [slice, probe].forEach(v => {
        expect(Math.abs(((v + surf.a) / step) - Math.round((v + surf.a) / step))).toBeLessThan(1e-9);
      });
    });
  });
});
