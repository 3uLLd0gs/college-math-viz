import { describe, it, expect } from 'vitest';
import { FUNCTIONS, polyAt, formula } from './content.js';

const fn = id => FUNCTIONS.find(f => f.id === id);

describe('Taylor partial sums converge to the true function', () => {
  it('eˣ at x=1, N=12 matches Math.exp within 1e-6', () => {
    expect(polyAt(fn('exp'), 12, 1)).toBeCloseTo(Math.exp(1), 6);
  });
  it('sin x at x=1, N=12 matches Math.sin within 1e-6', () => {
    expect(polyAt(fn('sin'), 12, 1)).toBeCloseTo(Math.sin(1), 6);
  });
  it('cos x at x=1, N=12 matches Math.cos within 1e-6', () => {
    expect(polyAt(fn('cos'), 12, 1)).toBeCloseTo(Math.cos(1), 6);
  });
  it('ln(1+x) at x=0.5, N=30 matches Math.log(1.5) within 1e-3 (slow-converging series)', () => {
    expect(polyAt(fn('ln'), 30, 0.5)).toBeCloseTo(Math.log(1.5), 3);
  });
  it('1/(1-x) at x=0.5, N=20 matches the closed form within 1e-6', () => {
    // Assert the documented 1e-6 tolerance explicitly. toBeCloseTo(x, 6) uses a
    // stricter 0.5e-6 threshold; the geometric partial-sum error here is 0.5^20 ≈
    // 9.54e-7, which meets the stated 1e-6 bound but not toBeCloseTo's tighter one.
    expect(Math.abs(polyAt(fn('geo'), 20, 0.5) - 1 / (1 - 0.5))).toBeLessThan(1e-6);
  });
});

describe('every registered function agrees with its own coefficients', () => {
  // Guards the registry as a whole: each f must be reproduced by its own Taylor
  // series near the origin, so a coeff/f mismatch on any row fails here.
  FUNCTIONS.forEach(f => {
    it(`${f.id}: P₂₅ reproduces f at a point well inside its radius`, () => {
      const x = f.id === 'ln' || f.id === 'geo' ? 0.3 : 0.7;
      expect(polyAt(f, 25, x)).toBeCloseTo(f.f(x), 5);
    });
  });
});

describe('challenge reachability', () => {
  const MAX_N = 14;   // mirrors playground.js / the #terms slider max

  FUNCTIONS.forEach(f => {
    it(`${f.id}: its challenge is clearable within N = ${MAX_N}`, () => {
      const err = Math.abs(f.f(f.challenge.x0) - polyAt(f, MAX_N, f.challenge.x0));
      expect(err).toBeLessThan(f.challenge.tol);
    });

    it(`${f.id}: is NOT already solved at the starting N = 1`, () => {
      const err = Math.abs(f.f(f.challenge.x0) - polyAt(f, 1, f.challenge.x0));
      expect(err).toBeGreaterThan(f.challenge.tol);
    });

    it(`${f.id}: challenge point lies inside the plotted view`, () => {
      expect(f.challenge.x0).toBeGreaterThan(f.view.xmin);
      expect(f.challenge.x0).toBeLessThan(f.view.xmax);
    });
  });
});

describe('formula rendering', () => {
  it('shows the running polynomial for eˣ', () => {
    expect(formula(fn('exp'), 3)).toBe('1 + x + x²/2! + x³/3!');
  });

  it('omits the terms a series does not have', () => {
    // cos has only even powers, so N=4 yields three terms, not five
    expect(formula(fn('cos'), 4)).toBe('1 − x²/2! + x⁴/4!');
  });

  it('renders leading negatives without a stray operator', () => {
    expect(formula(fn('sin'), 1).startsWith('x')).toBe(true);
  });

  it('appends an ellipsis once more than seven terms exist', () => {
    expect(formula(fn('exp'), 6)).not.toContain('…');
    expect(formula(fn('exp'), 8)).toContain('…');
  });
});
