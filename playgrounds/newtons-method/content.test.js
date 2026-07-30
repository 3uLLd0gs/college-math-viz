// playgrounds/newtons-method/content.test.js
import { describe, it, expect } from 'vitest';
import { FUNCTIONS, newtonStep, newtonRun, nearestRoot } from './content.js';

const fn = id => FUNCTIONS.find(f => f.id === id);

describe('every declared derivative is the real one', () => {
  const numDf = (f, x, h = 1e-6) => (f(x + h) - f(x - h)) / (2 * h);
  FUNCTIONS.forEach(f => {
    [f.start, f.start + 0.5, f.start - 0.3].forEach(x => {
      it(`${f.id}: f' at ${x.toFixed(2)} matches a central difference`, () => {
        expect(f.df(x)).toBeCloseTo(numDf(f.f, x), 5);
      });
    });
  });
});

describe('every declared root is a root', () => {
  FUNCTIONS.forEach(f => {
    f.roots.forEach(r => {
      it(`${f.id}: f(${r.toFixed(4)}) ≈ 0`, () => {
        expect(Math.abs(f.f(r))).toBeLessThan(1e-9);
      });
    });
  });
});

describe('newtonStep and newtonRun', () => {
  it('one step of x²−2 from 2 moves toward √2', () => {
    expect(newtonStep(fn('quad'), 2)).toBeCloseTo(1.5, 12);   // 2 − 2/4
  });
  it('x²−2 converges to √2 from x0=2', () => {
    const seq = newtonRun(fn('quad'), 2, 8);
    expect(seq[seq.length - 1]).toBeCloseTo(Math.SQRT2, 6);
  });
  it('cos x − x converges to its root from x0=-0.5', () => {
    const seq = newtonRun(fn('cosx'), -0.5, 10);
    expect(seq[seq.length - 1]).toBeCloseTo(0.7390851332, 6);
  });
  it('a flat tangent (f′=0) flings: newtonStep returns NaN and the run stops', () => {
    expect(Number.isNaN(newtonStep(fn('quad'), 0))).toBe(true);   // f'(0)=0
    expect(newtonRun(fn('quad'), 0, 5)).toEqual([0]);             // breaks immediately
  });
  it('x³−2x+2 from x0=0 cycles 0↔1 forever and never reaches the real root', () => {
    const seq = newtonRun(fn('cycle'), 0, 8);
    expect(seq).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0]);
    const root = fn('cycle').roots[0];                            // ≈ -1.769
    expect(Math.abs(seq[seq.length - 1] - root)).toBeGreaterThan(1);
  });
});

describe('nearestRoot', () => {
  it('picks the closest registry root', () => {
    expect(nearestRoot(fn('cubic'), 0.4)).toBe(0);
    expect(nearestRoot(fn('cubic'), 0.7)).toBe(1);
    expect(nearestRoot(fn('cubic'), -0.8)).toBe(-1);
  });
});
