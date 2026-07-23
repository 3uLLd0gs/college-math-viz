import { describe, it, expect } from 'vitest';
import { FIELDS, readingsAt, stillness, canGoStill } from './content.js';
import { divergenceAt, curlAt, outwardFlux, circulation } from '../../engine/vector-field.js';

const field = id => FIELDS.find(f => f.id === id);
const pts = [[0.3, -0.8], [1.2, 0.9], [-1.1, 0.4]];

describe('declared div and curl match the actual field', () => {
  FIELDS.forEach(fd => {
    pts.forEach(([x, y]) => {
      it(`${fd.id}: div at (${x}, ${y})`, () => {
        expect(divergenceAt(fd, x, y)).toBeCloseTo(fd.div(x, y), 4);
      });
      it(`${fd.id}: curl at (${x}, ${y})`, () => {
        expect(curlAt(fd, x, y)).toBeCloseTo(fd.curl(x, y), 4);
      });
    });
  });
});

describe('div and curl really are flux and circulation per unit area', () => {
  // The ratios carry an O(r²) term wherever div or curl is nonlinear — `cubic`
  // has a quadratic curl, so its circulation/area overshoots by 1.5r². Hence a
  // genuinely small test circle, plus an explicit check that shrinking helps.
  const AREA = r => Math.PI * r * r;
  const [x, y] = [0.55, -0.35];

  FIELDS.forEach(fd => {
    it(`${fd.id}: flux/area over a small circle approaches div`, () => {
      expect(outwardFlux(fd, x, y, 0.001) / AREA(0.001)).toBeCloseTo(fd.div(x, y), 4);
    });
    it(`${fd.id}: circulation/area over a small circle approaches curl`, () => {
      expect(circulation(fd, x, y, 0.001) / AREA(0.001)).toBeCloseTo(fd.curl(x, y), 4);
    });
  });

  it('a smaller circle is strictly better where the quantity is nonlinear', () => {
    const fd = field('cubic');
    const err = r => Math.abs(circulation(fd, x, y, r) / AREA(r) - fd.curl(x, y));
    expect(err(0.05)).toBeLessThan(err(0.5));
    expect(err(0.005)).toBeLessThan(err(0.05));
  });

  it('and makes no difference where the quantity is linear', () => {
    const fd = field('quad');   // div = 4(x − 0.7), curl = 4(y + 0.5): both linear
    for (const r of [0.01, 0.4, 1.1]) {
      expect(outwardFlux(fd, x, y, r) / AREA(r)).toBeCloseTo(fd.div(x, y), 6);
      expect(circulation(fd, x, y, r) / AREA(r)).toBeCloseTo(fd.curl(x, y), 6);
    }
  });
});

describe('readingsAt', () => {
  it('reports the paddle wheel rate as half the curl', () => {
    const r = readingsAt(field('vortex'), 0.3, 0.4);
    expect(r.curl).toBe(2);
    expect(r.omega).toBe(1);
  });
  it('a pure vortex expands not at all', () => {
    expect(readingsAt(field('vortex'), 1, -1).div).toBe(0);
  });
  it('an irrotational field turns no wheel anywhere', () => {
    for (const [x, y] of pts) expect(readingsAt(field('blob'), x, y).omega).toBe(0);
  });
});

describe('the still point is genuinely still, and genuinely elsewhere', () => {
  FIELDS.filter(f => f.still).forEach(fd => {
    const [sx, sy] = fd.still;
    it(`${fd.id}: both div and curl vanish at its declared point`, () => {
      expect(stillness(fd, sx, sy)).toBeCloseTo(0, 10);
    });
    it(`${fd.id}: the flow is clearly not still a short step away`, () => {
      expect(stillness(fd, sx + 0.35, sy)).toBeGreaterThan(0.15);
      expect(stillness(fd, sx, sy + 0.35)).toBeGreaterThan(0.15);
    });
    it(`${fd.id}: its still point is away from the origin`, () => {
      // otherwise "the middle" answers every field without reading anything
      expect(Math.hypot(sx, sy)).toBeGreaterThan(0.5);
    });
    it(`${fd.id}: its still point is inside the visible domain`, () => {
      expect(Math.abs(sx)).toBeLessThan(2);
      expect(Math.abs(sy)).toBeLessThan(2);
    });
  });

  it('different fields put the still point in different places', () => {
    const spots = FIELDS.filter(f => f.still).map(f => f.still.join(','));
    expect(new Set(spots).size).toBe(spots.length);
  });
});

describe('the fields with no still point are the deliberate contrasts', () => {
  it('the vortex can never go still — curl is 2 everywhere', () => {
    const fd = field('vortex');
    expect(canGoStill(fd)).toBe(false);
    for (const [x, y] of pts) expect(stillness(fd, x, y)).toBeCloseTo(2, 10);
  });

  it('the irrotational blob goes still along a whole line, not a point', () => {
    const fd = field('blob');
    expect(fd.still).toBeNull();
    expect(canGoStill(fd)).toBe(true);
    // 2(x−1.1) + 2(y+0.3) = 0  =>  y = 0.8 − x
    for (const x of [-0.5, 0.4, 1.3]) expect(stillness(fd, x, 0.8 - x)).toBeCloseTo(0, 10);
  });
});

describe('the registry shows both quantities independently', () => {
  const has = pred => FIELDS.some(pred);
  it('includes a field that spins but never expands', () =>
    expect(has(f => f.div(0.4, 0.7) === 0 && f.curl(0.4, 0.7) !== 0)).toBe(true));
  it('includes a field that expands but never spins', () =>
    expect(has(f => f.curl(0.4, 0.7) === 0 && f.div(0.4, 0.7) !== 0)).toBe(true));
  it('includes a field that does both', () =>
    expect(has(f => f.div(0.4, 0.7) !== 0 && f.curl(0.4, 0.7) !== 0)).toBe(true));
});
