import { describe, it, expect } from 'vitest';
import { fact, sup, vsub, vcross, vdot, vnorm } from './math.js';

describe('fact', () => {
  it('computes factorials including the memoised path', () => {
    expect(fact(0)).toBe(1);
    expect(fact(1)).toBe(1);
    expect(fact(5)).toBe(120);
    expect(fact(10)).toBe(3628800);
  });
});

describe('sup', () => {
  it('converts digits to unicode superscripts', () => {
    expect(sup(0)).toBe('⁰');
    expect(sup(12)).toBe('¹²');
    expect(sup(304)).toBe('³⁰⁴');
  });
});

describe('vector helpers', () => {
  it('vsub subtracts componentwise', () => {
    expect(vsub([5, 5, 5], [1, 2, 3])).toEqual([4, 3, 2]);
  });
  it('vcross computes the standard cross product', () => {
    expect(vcross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
  it('vdot computes the standard dot product', () => {
    expect(vdot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
  it('vnorm returns a unit vector', () => {
    const [x, y, z] = vnorm([3, 4, 0]);
    expect(x).toBeCloseTo(0.6);
    expect(y).toBeCloseTo(0.8);
    expect(z).toBeCloseTo(0);
  });
});
