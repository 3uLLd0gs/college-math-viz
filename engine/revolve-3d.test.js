import { describe, it, expect } from 'vitest';
import { midpoints, diskSum, shellSum, volumeSum, methodFor } from './revolve-3d.js';

const P = Math.PI;

describe('midpoints', () => {
  it('samples the centre of each strip', () => {
    expect(midpoints(0, 1, 2)).toEqual([0.25, 0.75]);
    expect(midpoints(2, 6, 4)).toEqual([2.5, 3.5, 4.5, 5.5]);
  });
  it('returns exactly n of them', () => {
    expect(midpoints(-1, 3, 7)).toHaveLength(7);
  });
});

describe('diskSum against volumes known in closed form', () => {
  it('a cone: y = x on [0,2] about x gives 8π/3', () => {
    expect(diskSum({ f: x => x, a: 0, b: 2 }, 4000)).toBeCloseTo(8 * P / 3, 5);
  });

  it('a cylinder: y = 3 on [0,5] about x gives π·9·5, exactly at any n', () => {
    for (const n of [1, 2, 17]) {
      expect(diskSum({ f: () => 3, a: 0, b: 5 }, n)).toBeCloseTo(P * 9 * 5, 10);
    }
  });

  it('a sphere: y = √(1−x²) on [−1,1] about x gives 4π/3', () => {
    expect(diskSum({ f: x => Math.sqrt(Math.max(0, 1 - x * x)), a: -1, b: 1 }, 20000))
      .toBeCloseTo(4 * P / 3, 4);
  });

  it('a paraboloid: y = √x on [0,4] about x gives 8π, exactly — the integrand is linear', () => {
    // midpoint is exact for a linear integrand, so even n = 3 nails it
    expect(diskSum({ f: x => Math.sqrt(x), a: 0, b: 4 }, 3)).toBeCloseTo(8 * P, 10);
  });

  it('a washer subtracts the hole: y = x outside, y = x² inside, on [0,1] -> 2π/15', () => {
    expect(diskSum({ f: x => x, g: x => x * x, a: 0, b: 1 }, 8000)).toBeCloseTo(2 * P / 15, 5);
  });

  it('the hole makes it strictly smaller than the solid disk', () => {
    const solid = diskSum({ f: x => x, a: 0, b: 1 }, 500);
    const holed = diskSum({ f: x => x, g: x => x * x, a: 0, b: 1 }, 500);
    expect(holed).toBeLessThan(solid);
  });
});

describe('shellSum against volumes known in closed form', () => {
  it('y = x − x² on [0,1] about y gives π/6', () => {
    expect(shellSum({ f: x => x - x * x, a: 0, b: 1 }, 8000)).toBeCloseTo(P / 6, 6);
  });

  it('y = x on [0,2] about y gives 16π/3', () => {
    expect(shellSum({ f: x => x, a: 0, b: 2 }, 8000)).toBeCloseTo(16 * P / 3, 5);
  });

  it('y = √x on [0,4] about y gives 128π/5', () => {
    expect(shellSum({ f: x => Math.sqrt(x), a: 0, b: 4 }, 20000)).toBeCloseTo(128 * P / 5, 3);
  });

  it('subtracts an inner boundary from the shell height', () => {
    expect(shellSum({ f: x => x, g: x => x * x, a: 0, b: 1 }, 8000)).toBeCloseTo(P / 6, 6);
  });

  it('a hollow cylinder: height 2 between radius 1 and 2 gives π(4−1)·2', () => {
    // shells from x=1 to x=2 of constant height 2
    expect(shellSum({ f: () => 2, a: 1, b: 2 }, 5000)).toBeCloseTo(P * 3 * 2, 4);
  });
});

describe('the two methods agree where geometry says they must', () => {
  it('a quarter disc gives the same half-ball about either axis', () => {
    // y = √(4−x²) on [0,2]: about x it sweeps a half-ball of radius 2, and about
    // y it sweeps the same half-ball — 16π/3 either way, by symmetry
    const region = { f: x => Math.sqrt(Math.max(0, 4 - x * x)), a: 0, b: 2 };
    expect(diskSum(region, 20000)).toBeCloseTo(16 * P / 3, 3);
    expect(shellSum(region, 20000)).toBeCloseTo(16 * P / 3, 3);
  });
});

describe('convergence behaviour', () => {
  const region = { f: x => x - x * x, a: 0, b: 1 };
  const exact = P / 6;

  it('error shrinks as n grows', () => {
    const errs = [4, 8, 16, 32, 64].map(n => Math.abs(shellSum(region, n) - exact));
    for (let i = 1; i < errs.length; i++) expect(errs[i]).toBeLessThan(errs[i - 1]);
  });

  it('midpoint is second order — doubling n quarters the error', () => {
    const e1 = Math.abs(shellSum(region, 50) - exact);
    const e2 = Math.abs(shellSum(region, 100) - exact);
    expect(e1 / e2).toBeGreaterThan(3.6);
    expect(e1 / e2).toBeLessThan(4.4);
  });
});

describe('volumeSum dispatches on the axis', () => {
  const region = { f: x => x, a: 0, b: 2 };
  it('uses disks about x and shells about y', () => {
    expect(volumeSum(region, 'x', 4000)).toBeCloseTo(8 * P / 3, 5);
    expect(volumeSum(region, 'y', 4000)).toBeCloseTo(16 * P / 3, 5);
  });
  it('the two axes give genuinely different solids', () => {
    expect(volumeSum(region, 'x', 500)).not.toBeCloseTo(volumeSum(region, 'y', 500), 2);
  });
});

describe('methodFor', () => {
  it('is a disk when the region meets the x-axis', () => {
    expect(methodFor({ f: x => x }, 'x')).toBe('disk');
  });
  it('is a washer when the region has an inner boundary', () => {
    expect(methodFor({ f: x => x, g: x => x * x }, 'x')).toBe('washer');
  });
  it('is a shell about the y-axis, with or without a hole', () => {
    expect(methodFor({ f: x => x }, 'y')).toBe('shell');
    expect(methodFor({ f: x => x, g: x => x * x }, 'y')).toBe('shell');
  });
});
