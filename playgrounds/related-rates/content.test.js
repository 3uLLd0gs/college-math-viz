import { describe, it, expect } from 'vitest';
import { SCENARIOS, byId, solveFor, missBy, inRange, stateSpeed } from './content.js';

const num = (f, s, h = 1e-6) => (f(s + h) - f(s - h)) / (2 * h);

describe('each derived rate really is the derivative of its constraint', () => {
  it('ladder: dy/dt matches differentiating y = √(25 − x²)', () => {
    const sc = byId('ladder'), v = 0.8;
    for (const x of [1, 2.5, 4]) {
      expect(sc.rate(x, v)).toBeCloseTo(num(sc.height, x) * v, 5);
    }
  });

  it('balloon: dr/dt matches differentiating V = (4/3)πr³', () => {
    const sc = byId('balloon'), v = 4;
    for (const r of [0.5, 1.4, 2.7]) {
      const dVdr = num(x => (4 / 3) * Math.PI * x ** 3, r);
      expect(sc.rate(r, v)).toBeCloseTo(v / dVdr, 5);
    }
  });

  it('ripple: dA/dt matches differentiating A = πr²', () => {
    const sc = byId('ripple'), v = 0.6;
    for (const r of [0.4, 1.5, 2.8]) {
      expect(sc.rate(r, v)).toBeCloseTo(num(x => Math.PI * x * x, r) * v, 5);
    }
  });

  it('cone: dh/dt matches differentiating V = (π/12)h³', () => {
    const sc = byId('cone'), v = 1.5;
    for (const h of [0.6, 1.8, 3.4]) {
      const dVdh = num(x => (Math.PI / 12) * x ** 3, h);
      expect(sc.rate(h, v)).toBeCloseTo(v / dVdh, 4);
    }
  });

  it('shadow: ds/dt matches differentiating s = 1.8x / 4.2', () => {
    const sc = byId('shadow'), v = 1.2;
    for (const x of [1, 3, 6]) {
      expect(sc.rate(x, v)).toBeCloseTo(num(sc.shadowLength, x) * v, 8);
    }
  });
});

describe('the derived rate is generally NOT constant', () => {
  ['ladder', 'balloon', 'ripple', 'cone'].forEach(id => {
    it(`${id}: the rate changes as the state changes`, () => {
      const sc = byId(id), v = sc.drive.start;
      const a = sc.rate(sc.sVar.min + 0.2, v);
      const b = sc.rate(sc.sVar.max - 0.2, v);
      expect(Math.abs(a - b)).toBeGreaterThan(1e-3);
    });
  });

  it('shadow is the deliberate exception: linear constraint, constant rate', () => {
    const sc = byId('shadow'), v = 1.2;
    const vals = [0.5, 2, 4, 7].map(x => sc.rate(x, v));
    vals.forEach(r => expect(r).toBeCloseTo(vals[0], 12));
    expect(sc.challenge).toBeNull();
  });
});

describe('each rate scales linearly with the driving rate', () => {
  SCENARIOS.forEach(sc => {
    it(`${sc.id}: doubling the drive doubles the derived rate`, () => {
      const s = sc.sVar.start;
      expect(sc.rate(s, 2)).toBeCloseTo(2 * sc.rate(s, 1), 10);
    });
  });
});

describe('the direction of change is physically right', () => {
  it('the ladder top moves DOWN while the base moves out', () => {
    expect(byId('ladder').rate(2, 0.8)).toBeLessThan(0);
  });
  it('the ladder top accelerates as the ladder flattens', () => {
    const sc = byId('ladder');
    expect(Math.abs(sc.rate(4.5, 0.8))).toBeGreaterThan(Math.abs(sc.rate(1, 0.8)));
  });
  it('the balloon skin slows as it inflates', () => {
    const sc = byId('balloon');
    expect(sc.rate(2.5, 4)).toBeLessThan(sc.rate(0.5, 4));
  });
  it('the ripple gains area faster as it widens', () => {
    const sc = byId('ripple');
    expect(sc.rate(2.5, 0.6)).toBeGreaterThan(sc.rate(0.5, 0.6));
  });
  it('the cone level slows as it fills', () => {
    const sc = byId('cone');
    expect(sc.rate(3.5, 1.5)).toBeLessThan(sc.rate(0.5, 1.5));
  });
});

describe('every challenge is reachable, and not already met', () => {
  SCENARIOS.filter(sc => sc.challenge).forEach(sc => {
    const v = sc.drive.start;

    it(`${sc.id}: its solution lies inside the slider range`, () => {
      const s = solveFor(sc, sc.challenge.target, v);
      expect(s).not.toBeNull();
      expect(inRange(sc, s)).toBe(true);
    });

    it(`${sc.id}: the solution really clears the tolerance`, () => {
      const s = solveFor(sc, sc.challenge.target, v);
      expect(missBy(sc, s, v)).toBeLessThan(sc.challenge.tol);
    });

    it(`${sc.id}: the opening state does NOT clear it`, () => {
      expect(missBy(sc, sc.sVar.start, v)).toBeGreaterThan(sc.challenge.tol);
    });
  });

  it('the ladder challenge is met exactly when x equals the height', () => {
    const sc = byId('ladder');
    const x = solveFor(sc, null, 0.8);
    expect(x).toBeCloseTo(sc.height(x), 9);
    expect(x).toBeCloseTo(5 / Math.SQRT2, 9);
  });

  it('shadow offers no challenge, because there is nothing to find', () => {
    expect(missBy(byId('shadow'), 3, 1.2)).toBe(Infinity);
  });
});

describe('every scenario is presentable and safe across its range', () => {
  SCENARIOS.forEach(sc => {
    it(`${sc.id}: declares a setup, constraint, relation and note`, () => {
      // the constraint is a formula and is allowed to be terse — "A = πr²" is
      // seven characters and says everything it needs to
      // constraint and relation are formulas and are allowed to be terse —
      // "A = πr²" is seven characters and says everything it needs to
      expect(sc.constraint.length).toBeGreaterThan(5);
      expect(sc.relation.length).toBeGreaterThan(12);
      // prose, though, has to actually explain something
      [sc.setup, sc.note].forEach(t => expect(t.length).toBeGreaterThan(40));
    });
    it(`${sc.id}: the relation shows a derivative, not just the constraint`, () => {
      expect(sc.relation).toMatch(/d[A-Za-z]\/dt/);
    });
    it(`${sc.id}: the rate is finite everywhere the slider can go`, () => {
      const { min, max } = sc.sVar;
      for (let s = min; s <= max; s += (max - min) / 40) {
        expect(Number.isFinite(sc.rate(s, sc.drive.start))).toBe(true);
      }
    });
    it(`${sc.id}: its opening state sits inside its own range`, () => {
      expect(inRange(sc, sc.sVar.start)).toBe(true);
    });
  });
});

describe('stateSpeed: how fast the state variable itself moves', () => {
  it('is simply the drive where the state variable IS the driven one', () => {
    for (const id of ['ladder', 'ripple', 'shadow']) {
      const sc = byId(id);
      expect(sc.stateIsDriven).toBe(true);
      expect(stateSpeed(sc, sc.sVar.start, 0.9)).toBeCloseTo(0.9, 12);
    }
  });

  it('is the derived rate where the drive acts on something else', () => {
    for (const id of ['balloon', 'cone']) {
      const sc = byId(id);
      expect(sc.stateIsDriven).toBe(false);
      const v = sc.drive.start;
      expect(stateSpeed(sc, sc.sVar.start, v)).toBeCloseTo(Math.abs(sc.rate(sc.sVar.start, v)), 12);
    }
  });

  it('is always positive, so letting time run never goes backwards', () => {
    SCENARIOS.forEach(sc => {
      const { min, max } = sc.sVar;
      for (let s = min; s <= max; s += (max - min) / 20) {
        expect(stateSpeed(sc, s, sc.drive.start)).toBeGreaterThan(0);
      }
    });
  });

  it('slows as a balloon inflates and as a cone fills', () => {
    for (const id of ['balloon', 'cone']) {
      const sc = byId(id), v = sc.drive.start;
      expect(stateSpeed(sc, sc.sVar.max - 0.3, v)).toBeLessThan(stateSpeed(sc, sc.sVar.min + 0.3, v));
    }
  });
});
