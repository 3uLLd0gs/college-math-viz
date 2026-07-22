import { describe, it, expect } from 'vitest';

// Mirrors the SURFACES registry in playgrounds/partial-derivatives/content.js —
// verifies each analytic partial against a central-difference numerical approximation.
const SURFACES = [
  { id: 'parab', f: (x, y) => x * x + y * y, fx: (x, y) => 2 * x, fy: (x, y) => 2 * y },
  { id: 'saddle', f: (x, y) => x * x - y * y, fx: (x, y) => 2 * x, fy: (x, y) => -2 * y },
  { id: 'ripple', f: (x, y) => Math.sin(x) * Math.cos(y), fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y) },
  { id: 'gauss', f: (x, y) => Math.exp(-(x * x + y * y) / 4), fx: (x, y) => -x / 2 * Math.exp(-(x * x + y * y) / 4), fy: (x, y) => -y / 2 * Math.exp(-(x * x + y * y) / 4) },
];

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
