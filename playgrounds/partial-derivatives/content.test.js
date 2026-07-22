import { describe, it, expect } from 'vitest';
import { SURFACES, SLICE_START_FRAC, PROBE_START_FRAC, sliceStart, probeStart } from './content.js';

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
    const slice = sliceStart(surf);
    const probe = probeStart(surf);

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

    it(`${surf.id}: both starts sit inside the slider range`, () => {
      [slice, probe].forEach(v => {
        expect(v).toBeGreaterThan(-surf.a);
        expect(v).toBeLessThan(surf.a);
      });
    });
  });

  it('start fractions are ordered so the two sliders do not coincide', () => {
    expect(SLICE_START_FRAC).not.toBe(PROBE_START_FRAC);
  });
});

describe('Each challenge stays solvable', () => {
  // The student wins by driving the moving variable to a flat spot. That spot is
  // NOT always the origin — on `ripple`, ∂f/∂x = cos x · cos y vanishes at
  // x = ±π/2, which is exactly what the "a crest or a trough" hint points at. So
  // walk the actual slider positions (step = a/100) and require that at least one
  // reachable position clears the tolerance.
  const solvable = (surf, partial, hold) => {
    const step = surf.a / 100;
    for (let v = -surf.a; v <= surf.a + 1e-9; v += step) {
      if (Math.abs(partial(surf, v, hold)) < surf.challenge.tol) return v;
    }
    return null;
  };

  SURFACES.forEach(surf => {
    it(`${surf.id}: some reachable x zeroes ∂f/∂x with y held at its start`, () => {
      const at = solvable(surf, (s, v, h) => s.fx(v, h), sliceStart(surf));
      expect(at).not.toBeNull();
    });
    it(`${surf.id}: some reachable y zeroes ∂f/∂y with x held at its start`, () => {
      const at = solvable(surf, (s, v, h) => s.fy(h, v), sliceStart(surf));
      expect(at).not.toBeNull();
    });
  });
});
