import { describe, it, expect } from 'vitest';
import { FIELDS, speed, classify } from './content.js';
import { divergenceAt, curlAt } from '../../engine/vector-field.js';

const field = id => FIELDS.find(f => f.id === id);
const pts = [[0.4, -0.9], [1.2, 1.1], [-1.3, 0.5]];

describe('declared divergence and curl match the actual field', () => {
  FIELDS.forEach(fd => {
    pts.forEach(([x, y]) => {
      it(`${fd.id}: div at (${x}, ${y})`, () => {
        expect(divergenceAt(fd, x, y)).toBeCloseTo(fd.div(x, y), 5);
      });
      it(`${fd.id}: curl at (${x}, ${y})`, () => {
        expect(curlAt(fd, x, y)).toBeCloseTo(fd.curl(x, y), 5);
      });
    });
  });
});

describe('declared stagnation points really are stagnation points', () => {
  FIELDS.filter(fd => fd.at).forEach(fd => {
    it(`${fd.id}: |F| vanishes at its declared point`, () => {
      expect(speed(fd, fd.at[0], fd.at[1])).toBeCloseTo(0, 12);
    });

    it(`${fd.id}: |F| is clearly non-zero a short step away`, () => {
      const [cx, cy] = fd.at;
      expect(speed(fd, cx + 0.3, cy)).toBeGreaterThan(0.2);
      expect(speed(fd, cx, cy + 0.3)).toBeGreaterThan(0.2);
    });

    it(`${fd.id}: its equilibrium is NOT at the origin`, () => {
      // otherwise the answer is "the middle" before reading a single arrow
      expect(Math.hypot(fd.at[0], fd.at[1])).toBeGreaterThan(0.5);
    });

    it(`${fd.id}: its equilibrium sits inside the visible domain`, () => {
      expect(Math.abs(fd.at[0])).toBeLessThan(2);
      expect(Math.abs(fd.at[1])).toBeLessThan(2);
    });
  });

  it('shear declares no point equilibrium, because it has a whole line of them', () => {
    const fd = field('shear');
    expect(fd.at).toBeNull();
    // F = (y - 0.5, 0) vanishes everywhere along y = 0.5
    expect(speed(fd, -1.4, 0.5)).toBeCloseTo(0, 12);
    expect(speed(fd, 1.7, 0.5)).toBeCloseTo(0, 12);
  });
});

describe('the registry covers all four div/curl combinations', () => {
  const has = (d, c) => FIELDS.some(fd => Math.sign(fd.div(0, 0)) === d && Math.sign(fd.curl(0, 0)) === c);

  it('includes a pure source (div > 0, curl = 0)', () => expect(has(1, 0)).toBe(true));
  it('includes a pure sink (div < 0, curl = 0)', () => expect(has(-1, 0)).toBe(true));
  it('includes a pure vortex (div = 0, curl ≠ 0)', () => expect(has(0, 1)).toBe(true));
  it('includes a saddle (div = 0, curl = 0)', () => expect(has(0, 0)).toBe(true));
  it('includes a field with both (div ≠ 0, curl ≠ 0)', () => expect(has(-1, 1)).toBe(true));
});

describe('classify', () => {
  it('names a source and a sink from divergence alone', () => {
    expect(classify(2, 0)).toBe('source (outflow)');
    expect(classify(-2, 0)).toBe('sink (inflow)');
  });

  it('names spin direction from the sign of curl', () => {
    expect(classify(0, 2)).toBe('counter-clockwise spin');
    expect(classify(0, -2)).toBe('clockwise spin');
  });

  it('calls a saddle neither compressing nor rotating', () => {
    expect(classify(0, 0)).toBe('incompressible & irrotational');
  });

  it('reports both when divergence and curl are non-zero', () => {
    expect(classify(-2, 2)).toBe('inflow + ccw spin');
    expect(classify(2, -2)).toBe('outflow + cw spin');
  });

  it('treats small numerical residue as zero', () => {
    expect(classify(1e-9, -1e-9)).toBe('incompressible & irrotational');
  });

  it('agrees with each registered field own numbers', () => {
    expect(classify(field('source').div(), field('source').curl())).toBe('source (outflow)');
    expect(classify(field('vortex').div(), field('vortex').curl())).toBe('counter-clockwise spin');
    expect(classify(field('saddle').div(), field('saddle').curl())).toBe('incompressible & irrotational');
    expect(classify(field('spiral').div(), field('spiral').curl())).toBe('inflow + ccw spin');
    expect(classify(field('shear').div(), field('shear').curl())).toBe('clockwise spin');
  });
});

describe('every field is presentable', () => {
  FIELDS.forEach(fd => {
    it(`${fd.id}: declares a kind and a blurb`, () => {
      expect(fd.kind.length).toBeGreaterThan(3);
      expect(fd.blurb.length).toBeGreaterThan(15);
    });
    it(`${fd.id}: is finite across the domain`, () => {
      for (let x = -2; x <= 2; x += 0.5) {
        for (let y = -2; y <= 2; y += 0.5) {
          expect(Number.isFinite(speed(fd, x, y))).toBe(true);
        }
      }
    });
  });
});
