import { describe, it, expect } from 'vitest';
import { cellSegments, isoSegments, levelsFor } from './contour-map.js';

/** Sample f over [-a,a]² onto an (n+1)×(n+1) grid, matching ContourMap.setField. */
function grid(f, n, a = 1) {
  const z = [];
  for (let i = 0; i <= n; i++) {
    z[i] = [];
    for (let j = 0; j <= n; j++) z[i][j] = f(-a + 2 * a * i / n, -a + 2 * a * j / n);
  }
  return z;
}

describe('cellSegments', () => {
  it('returns nothing when the level misses the cell entirely', () => {
    const z = [[0, 0], [0, 0]];
    expect(cellSegments(z, 0, 0, 5)).toEqual([]);
  });

  it('returns nothing when every corner is above the level', () => {
    const z = [[9, 9], [9, 9]];
    expect(cellSegments(z, 0, 0, 5)).toEqual([]);
  });

  it('cuts a corner off when exactly one corner is below', () => {
    // corner (0,0) low, the rest high -> a single segment isolating it
    const z = [[0, 10], [10, 10]];
    const segs = cellSegments(z, 0, 0, 5);
    expect(segs).toHaveLength(1);
    const [[p, q]] = segs;
    // both endpoints sit on edges touching corner (0,0), i.e. at its midpoints
    const ends = [p, q].map(([x, y]) => `${x},${y}`).sort();
    expect(ends).toEqual(['0,0.5', '0.5,0']);
  });

  it('splits the cell when two adjacent corners are below', () => {
    const z = [[0, 0], [10, 10]];
    const segs = cellSegments(z, 0, 0, 5);
    expect(segs).toHaveLength(1);
    const [[p, q]] = segs;
    expect(p[0]).toBeCloseTo(0.5, 12);
    expect(q[0]).toBeCloseTo(0.5, 12);
  });

  it('interpolates the crossing linearly, not at the midpoint', () => {
    // corner values 0 and 10; level 2 must cross at 20% along the edge
    const z = [[0, 10], [10, 10]];
    const [[p, q]] = cellSegments(z, 0, 0, 2);
    const along = [p, q].map(([x, y]) => Math.max(x, y)).sort();
    expect(along[0]).toBeCloseTo(0.2, 12);
    expect(along[1]).toBeCloseTo(0.2, 12);
  });

  it('emits two segments for the ambiguous saddle case', () => {
    // diagonally opposite corners low -> four edge crossings
    const z = [[0, 10], [10, 0]];
    expect(cellSegments(z, 0, 0, 5)).toHaveLength(2);
  });

  it('ignores edges with a non-finite endpoint', () => {
    const z = [[0, NaN], [10, 10]];
    const segs = cellSegments(z, 0, 0, 5);
    // the NaN edge contributes nothing, so no complete segment survives
    expect(segs).toEqual([]);
  });

  it('reads the cell at the requested offset, not always the origin', () => {
    const z = [[9, 9, 9], [9, 0, 9], [9, 9, 9]];
    expect(cellSegments(z, 0, 0, 5)).toHaveLength(1);
    const segs = cellSegments(z, 1, 1, 5);
    expect(segs).toHaveLength(1);
    // coordinates are absolute grid indices, so they lie in the [1,2] cell
    for (const [x, y] of segs[0]) {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('isoSegments on known fields', () => {
  it('a circular paraboloid contour is a circle of the expected radius', () => {
    // f = x² + y² over [-1,1]²; the level 0.25 contour is the circle r = 0.5
    const n = 60, a = 1;
    const z = grid((x, y) => x * x + y * y, n, a);
    const segs = isoSegments(z, 0.25);
    expect(segs.length).toBeGreaterThan(20);
    for (const [p, q] of segs) {
      for (const [gi, gj] of [p, q]) {
        const x = -a + 2 * a * gi / n, y = -a + 2 * a * gj / n;
        expect(Math.hypot(x, y)).toBeCloseTo(0.5, 2);
      }
    }
  });

  it('a plane produces straight parallel contours', () => {
    // f = x  =>  every contour is a vertical line at constant x
    const n = 40, a = 1;
    const z = grid(x => x, n, a);
    const segs = isoSegments(z, 0.5);
    expect(segs.length).toBeGreaterThan(0);
    for (const [p, q] of segs) {
      const x0 = -a + 2 * a * p[0] / n, x1 = -a + 2 * a * q[0] / n;
      expect(x0).toBeCloseTo(0.5, 6);
      expect(x1).toBeCloseTo(0.5, 6);
    }
  });

  it('a constant field has no contour at all', () => {
    expect(isoSegments(grid(() => 3, 20), 3)).toEqual([]);
    expect(isoSegments(grid(() => 3, 20), 1)).toEqual([]);
  });

  it('finds no contour outside the field range', () => {
    expect(isoSegments(grid((x, y) => x * x + y * y, 30), 99)).toEqual([]);
  });
});

describe('levelsFor', () => {
  it('places levels strictly inside the range', () => {
    const ls = levelsFor(0, 1, 3);
    expect(ls).toEqual([0.25, 0.5, 0.75]);
    expect(Math.min(...ls)).toBeGreaterThan(0);
    expect(Math.max(...ls)).toBeLessThan(1);
  });

  it('returns nothing for a degenerate range', () => {
    expect(levelsFor(2, 2, 5)).toEqual([]);
    expect(levelsFor(3, 1, 5)).toEqual([]);
  });

  it('spaces levels evenly', () => {
    const ls = levelsFor(-4, 4, 7);
    expect(ls).toHaveLength(7);
    const gaps = ls.slice(1).map((v, i) => v - ls[i]);
    gaps.forEach(gp => expect(gp).toBeCloseTo(1, 12));
  });
});
