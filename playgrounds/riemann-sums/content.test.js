import { describe, it, expect } from 'vitest';
import { INTEGRANDS, RULES, riemannSum, rectangles } from './content.js';

const byId = (arr, id) => arr.find(x => x.id === id);
const rule = id => byId(RULES, id);
const fn = id => byId(INTEGRANDS, id);

describe('every integrand declares a correct exact value', () => {
  // Cross-check the hand-entered closed forms against a high-resolution
  // midpoint sum. Midpoint error is O(h²), so n = 200000 is far tighter than
  // the 1e-6 asserted here — a wrong `exact` cannot slip through.
  INTEGRANDS.forEach(f => {
    it(`${f.id}: exact matches a 200k-interval midpoint sum`, () => {
      expect(riemannSum(f, 200000, rule('mid'))).toBeCloseTo(f.exact, 6);
    });
  });
});

describe('riemannSum against integrals known in closed form', () => {
  it('left and right sums bracket ∫₀² x² dx = 8/3 for an increasing f', () => {
    const f = fn('square');
    const left = riemannSum(f, 50, rule('left'));
    const right = riemannSum(f, 50, rule('right'));
    expect(left).toBeLessThan(f.exact);
    expect(right).toBeGreaterThan(f.exact);
  });

  it('n = 1 left sum of x² over [0,2] is f(0)·2 = 0', () => {
    expect(riemannSum(fn('square'), 1, rule('left'))).toBe(0);
  });

  it('n = 1 right sum of x² over [0,2] is f(2)·2 = 8', () => {
    expect(riemannSum(fn('square'), 1, rule('right'))).toBe(8);
  });

  it('n = 1 midpoint sum of x² over [0,2] is f(1)·2 = 2', () => {
    expect(riemannSum(fn('square'), 1, rule('mid'))).toBe(2);
  });

  it('∫₀^π sin x dx converges to 2', () => {
    expect(riemannSum(fn('sin'), 5000, rule('mid'))).toBeCloseTo(2, 6);
  });

  it('∫₁³ dx/x converges to ln 3', () => {
    expect(riemannSum(fn('recip'), 5000, rule('mid'))).toBeCloseTo(Math.log(3), 6);
  });

  it('handles an integrand that goes negative (signed area)', () => {
    // ∫(x³ − 2x)dx = x⁴/4 − x²; over [-1.5, 2] that is
    // (4 − 4) − (1.265625 − 2.25) = 0.984375
    expect(fn('cubic').exact).toBe(0.984375);
    expect(riemannSum(fn('cubic'), 20000, rule('mid'))).toBeCloseTo(0.984375, 5);
  });
});

describe('convergence order', () => {
  it('midpoint beats left at equal n on a smooth increasing function', () => {
    const f = fn('square');
    const eLeft = Math.abs(riemannSum(f, 40, rule('left')) - f.exact);
    const eMid = Math.abs(riemannSum(f, 40, rule('mid')) - f.exact);
    expect(eMid).toBeLessThan(eLeft);
  });

  it('left-rule error roughly halves when n doubles (O(h))', () => {
    const f = fn('square');
    const e1 = Math.abs(riemannSum(f, 100, rule('left')) - f.exact);
    const e2 = Math.abs(riemannSum(f, 200, rule('left')) - f.exact);
    expect(e1 / e2).toBeGreaterThan(1.8);
    expect(e1 / e2).toBeLessThan(2.2);
  });

  it('midpoint error roughly quarters when n doubles (O(h²))', () => {
    const f = fn('square');
    const e1 = Math.abs(riemannSum(f, 100, rule('mid')) - f.exact);
    const e2 = Math.abs(riemannSum(f, 200, rule('mid')) - f.exact);
    expect(e1 / e2).toBeGreaterThan(3.6);
    expect(e1 / e2).toBeLessThan(4.4);
  });
});

describe('rectangles', () => {
  it('returns exactly n tiles that tile [a,b] without gaps', () => {
    const f = fn('square');
    const rs = rectangles(f, 8, rule('left'));
    expect(rs).toHaveLength(8);
    expect(rs[0].x0).toBeCloseTo(f.a, 12);
    expect(rs[7].x1).toBeCloseTo(f.b, 12);
    for (let i = 1; i < rs.length; i++) expect(rs[i].x0).toBeCloseTo(rs[i - 1].x1, 12);
  });

  it('sampling rule picks the declared edge of each tile', () => {
    const f = fn('square');
    const [first] = rectangles(f, 4, rule('left'));
    expect(first.y).toBe(f.f(f.a));            // left edge of the first tile
    const [firstRight] = rectangles(f, 4, rule('right'));
    expect(firstRight.y).toBe(f.f(f.a + 0.5)); // right edge, dx = 2/4
    const [firstMid] = rectangles(f, 4, rule('mid'));
    expect(firstMid.y).toBe(f.f(f.a + 0.25));
  });

  it('rectangle areas sum to riemannSum', () => {
    const f = fn('sin');
    for (const r of RULES) {
      const viaRects = rectangles(f, 17, r).reduce((s, t) => s + t.y * (t.x1 - t.x0), 0);
      expect(viaRects).toBeCloseTo(riemannSum(f, 17, r), 12);
    }
  });
});

describe('challenge reachability', () => {
  const MAX_N = 80;   // mirrors playground.js / the #n slider max
  const minN = (f, r) => {
    for (let n = 1; n <= MAX_N; n++) {
      if (Math.abs(riemannSum(f, n, r) - f.exact) < f.tol) return n;
    }
    return null;
  };

  // Every integrand must be clearable by EVERY rule inside the slider's range —
  // otherwise a student who sticks with left endpoints hits the max and stalls
  // with no way to win.
  INTEGRANDS.forEach(f => {
    RULES.forEach(r => {
      it(`${f.id} / ${r.id}: clears its tolerance within n = ${MAX_N}`, () => {
        expect(minN(f, r)).not.toBeNull();
      });
    });
  });

  // ...but it must not be clearable instantly either, or the challenge is free.
  INTEGRANDS.forEach(f => {
    it(`${f.id}: is NOT already solved at the starting n = 4, left rule`, () => {
      expect(Math.abs(riemannSum(f, 4, rule('left')) - f.exact)).toBeGreaterThan(f.tol);
    });
  });

  it('midpoint needs strictly fewer rectangles than left on every integrand', () => {
    for (const f of INTEGRANDS) {
      expect(minN(f, rule('mid'))).toBeLessThan(minN(f, rule('left')));
    }
  });
});
