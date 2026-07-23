import { describe, it, expect } from 'vitest';
import { FUNCTIONS, secantSlope, slopeError, clampProbe, clampStep } from './content.js';

const fn = id => FUNCTIONS.find(f => f.id === id);

describe('every declared derivative is the real one', () => {
  const numDf = (f, x, h = 1e-6) => (f(x + h) - f(x - h)) / (2 * h);
  FUNCTIONS.forEach(f => {
    [f.probe, f.probe + 0.4, f.probe - 0.25].forEach(x => {
      it(`${f.id}: f' at ${x.toFixed(2)} matches a central difference`, () => {
        expect(f.df(x)).toBeCloseTo(numDf(f.f, x), 5);
      });
    });
  });
});

describe('the secant slope IS the difference quotient', () => {
  it('computes (f(x+h) − f(x)) / h', () => {
    const f = fn('square');
    expect(secantSlope(f, 1, 0.5)).toBeCloseTo((f.f(1.5) - f.f(1)) / 0.5, 12);
  });

  it('for x² the secant slope is exactly 2x + h', () => {
    // (x+h)² − x² = 2xh + h², so the quotient is 2x + h — the error is h itself
    const f = fn('square');
    for (const [x, h] of [[1, 0.5], [-0.4, 0.25], [2, 0.001]]) {
      expect(secantSlope(f, x, h)).toBeCloseTo(2 * x + h, 10);
      expect(slopeError(f, x, h)).toBeCloseTo(h, 10);
    }
  });

  it('a negative h gives the backward difference, and it also converges', () => {
    const f = fn('sin');
    expect(secantSlope(f, 0.7, -0.001)).toBeCloseTo(f.df(0.7), 3);
  });

  it('is exact at every h for a straight line, where secant and tangent coincide', () => {
    const line = { f: x => 3 * x - 1, df: () => 3 };
    for (const h of [2, 0.5, 0.01]) expect(secantSlope(line, 0.9, h)).toBeCloseTo(3, 12);
  });
});

describe('convergence to the derivative', () => {
  FUNCTIONS.forEach(f => {
    it(`${f.id}: the quotient approaches f'(x₀) as h shrinks`, () => {
      expect(secantSlope(f, f.probe, 1e-6)).toBeCloseTo(f.df(f.probe), 4);
    });

    it(`${f.id}: error shrinks monotonically over the usable range of h`, () => {
      const hs = [1, 0.5, 0.25, 0.1, 0.05, 0.01];
      const errs = hs.map(h => slopeError(f, f.probe, h));
      for (let i = 1; i < errs.length; i++) expect(errs[i]).toBeLessThan(errs[i - 1]);
    });

    it(`${f.id}: error is first order — halving h roughly halves it`, () => {
      const e1 = slopeError(f, f.probe, 0.02);
      const e2 = slopeError(f, f.probe, 0.01);
      expect(e1 / e2).toBeGreaterThan(1.7);
      expect(e1 / e2).toBeLessThan(2.3);
    });
  });
});

describe('the challenge is honest', () => {
  const TOL = 0.02;      // mirrors playground.js
  const H_MAX = 2, H_MIN = 1e-3;

  FUNCTIONS.forEach(f => {
    it(`${f.id}: is NOT already solved at the opening h`, () => {
      const h = clampStep(f, f.probe, H_MAX);
      expect(slopeError(f, f.probe, h)).toBeGreaterThan(TOL);
    });

    it(`${f.id}: IS solvable at the smallest h the slider reaches`, () => {
      expect(slopeError(f, f.probe, H_MIN)).toBeLessThan(TOL);
    });
  });
});

describe('domain clamping keeps both secant points on the curve', () => {
  it('holds the probe inside a declared domain', () => {
    const f = fn('recip');
    expect(clampProbe(f, -5)).toBe(0.3);
    expect(clampProbe(f, 99)).toBe(3.2);
    expect(clampProbe(f, 1.3)).toBe(1.3);
  });

  it('falls back to the plotted view when no domain is declared', () => {
    const f = fn('sin');
    expect(clampProbe(f, -99)).toBeCloseTo(f.view.xmin + 0.15, 12);
    expect(clampProbe(f, 99)).toBeCloseTo(f.view.xmax - 0.15, 12);
  });

  it('shrinks h so x₀ + h cannot leave the domain', () => {
    const f = fn('recip');
    expect(clampStep(f, 3.0, 2)).toBeCloseTo(0.2, 12);
    expect(clampStep(f, 1.0, 0.5)).toBeCloseTo(0.5, 12);
  });

  it('never returns a step small enough to divide by zero', () => {
    const f = fn('recip');
    expect(clampStep(f, 3.2, 2)).toBeGreaterThanOrEqual(1e-3);
    expect(clampStep(f, 99, 2)).toBeGreaterThanOrEqual(1e-3);
  });

  it('1/x is never evaluated across its pole', () => {
    const f = fn('recip');
    for (let x = -5; x <= 10; x += 0.37) {
      const p = clampProbe(f, x);
      expect(p).toBeGreaterThan(0);
      expect(Number.isFinite(f.f(p))).toBe(true);
      expect(Number.isFinite(f.f(p + clampStep(f, p, 2)))).toBe(true);
    }
  });
});
