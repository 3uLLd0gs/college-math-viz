import { describe, it, expect } from 'vitest';
import { TRACES, TWO_PI, MAX_ANGLE, wrap, valueAt, missBy, solutionsHit, deg } from './content.js';

const trace = id => TRACES.find(t => t.id === id);

describe('each trace really is the function it claims', () => {
  const angles = [0, 0.4, 1.2, 2.5, 4.1, 5.9];
  it('sin reads the height', () => {
    angles.forEach(a => expect(valueAt(trace('sin'), a)).toBeCloseTo(Math.sin(a), 12));
  });
  it('cos reads the width', () => {
    angles.forEach(a => expect(valueAt(trace('cos'), a)).toBeCloseTo(Math.cos(a), 12));
  });
  it('tan is height over width', () => {
    angles.forEach(a => {
      const v = valueAt(trace('tan'), a);
      if (v !== null) expect(v).toBeCloseTo(Math.sin(a) / Math.cos(a), 10);
    });
  });
});

describe('the circle identities hold at every angle', () => {
  it('sin² + cos² = 1', () => {
    for (let a = 0; a < MAX_ANGLE; a += 0.13) {
      expect(trace('sin').f(a) ** 2 + trace('cos').f(a) ** 2).toBeCloseTo(1, 12);
    }
  });
  it('every value of sin and cos stays inside [−1, 1]', () => {
    for (let a = 0; a < MAX_ANGLE; a += 0.07) {
      expect(Math.abs(trace('sin').f(a))).toBeLessThanOrEqual(1 + 1e-12);
      expect(Math.abs(trace('cos').f(a))).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
});

describe('valueAt guards the places a curve has no value', () => {
  it('returns null at tan’s asymptotes rather than a vast number', () => {
    trace('tan').asymptotes.forEach(a => expect(valueAt(trace('tan'), a)).toBeNull());
  });
  it('still returns a finite value just to either side', () => {
    expect(valueAt(trace('tan'), Math.PI / 2 - 0.05)).toBeGreaterThan(10);
    expect(valueAt(trace('tan'), Math.PI / 2 + 0.05)).toBeLessThan(-10);
  });
  it('sin and cos are finite everywhere', () => {
    for (let a = 0; a < MAX_ANGLE; a += 0.11) {
      expect(valueAt(trace('sin'), a)).not.toBeNull();
      expect(valueAt(trace('cos'), a)).not.toBeNull();
    }
  });
});

describe('wrap', () => {
  it('brings any angle into one turn', () => {
    expect(wrap(0)).toBeCloseTo(0, 12);
    expect(wrap(TWO_PI + 0.3)).toBeCloseTo(0.3, 12);
    expect(wrap(-0.3)).toBeCloseTo(TWO_PI - 0.3, 12);
    expect(wrap(9 * TWO_PI + 1)).toBeCloseTo(1, 10);
  });
  it('always lands in [0, 2π)', () => {
    for (let a = -20; a < 20; a += 0.37) {
      expect(wrap(a)).toBeGreaterThanOrEqual(0);
      expect(wrap(a)).toBeLessThan(TWO_PI);
    }
  });
});

describe('every declared solution really solves its target', () => {
  TRACES.forEach(t => {
    it(`${t.id}: each listed angle produces the target`, () => {
      t.solutions.forEach(a => expect(t.f(a)).toBeCloseTo(t.target, 10));
    });
    it(`${t.id}: the solutions lie inside the sweep`, () => {
      t.solutions.forEach(a => {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(MAX_ANGLE);
      });
    });
    it(`${t.id}: there is more than one — periodicity is the point`, () => {
      expect(t.solutions.length).toBeGreaterThan(1);
    });
    it(`${t.id}: the solutions are distinct angles`, () => {
      expect(new Set(t.solutions.map(a => a.toFixed(9))).size).toBe(t.solutions.length);
    });
    it(`${t.id}: two turns give exactly twice the solutions of one`, () => {
      const inFirstTurn = t.solutions.filter(a => a < TWO_PI);
      expect(t.solutions.length).toBe(inFirstTurn.length * 2);
    });
  });

  it('sin θ = ½ has four answers across two turns, not one', () => {
    expect(trace('sin').solutions).toHaveLength(4);
    expect(trace('sin').solutions[0]).toBeCloseTo(Math.PI / 6, 12);
    expect(trace('sin').solutions[1]).toBeCloseTo(5 * Math.PI / 6, 12);
  });
});

describe('missBy and the challenge', () => {
  it('is zero exactly at a solution', () => {
    TRACES.forEach(t => t.solutions.forEach(a => expect(missBy(t, a)).toBeCloseTo(0, 10)));
  });
  it('is infinite where the curve has no value', () => {
    expect(missBy(trace('tan'), Math.PI / 2)).toBe(Infinity);
  });
  it('is clearly non-zero at the opening angle of 0', () => {
    TRACES.forEach(t => expect(missBy(t, 0)).toBeGreaterThan(0.2));
  });
});

describe('solutionsHit', () => {
  const t = trace('sin');
  it('finds nothing when the student has not been near one', () => {
    expect(solutionsHit(t, [0, 1.5])).toHaveLength(0);
  });
  it('credits ONE answer for one angle, even though a congruent one exists', () => {
    // 30° and 390° are the same point on the circle but different points on the
    // curve; crediting both for one visit would hide the periodicity
    expect(solutionsHit(t, [Math.PI / 6])).toHaveLength(1);
  });
  it('treats the second turn as a separate answer to find', () => {
    expect(solutionsHit(t, [Math.PI / 6 + TWO_PI])).toHaveLength(1);
    expect(solutionsHit(t, [Math.PI / 6, Math.PI / 6 + TWO_PI])).toHaveLength(2);
  });
  it('accumulates distinct solutions', () => {
    expect(solutionsHit(t, [Math.PI / 6, 5 * Math.PI / 6])).toHaveLength(2);
  });
  it('needs all four angles before the set is complete', () => {
    expect(solutionsHit(t, t.solutions)).toHaveLength(4);
    expect(solutionsHit(t, t.solutions.slice(0, 3))).toHaveLength(3);
  });
});

describe('deg', () => {
  it('converts the angles students meet first', () => {
    expect(deg(0)).toBe(0);
    expect(deg(Math.PI / 6)).toBeCloseTo(30, 10);
    expect(deg(Math.PI / 2)).toBeCloseTo(90, 10);
    expect(deg(TWO_PI)).toBeCloseTo(360, 10);
  });
});
