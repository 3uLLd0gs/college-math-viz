import { describe, it, expect } from 'vitest';
import { fact } from '../../engine/math.js';

// Mirrors the coeff() functions in playgrounds/taylor-series/content.js —
// verifies the Taylor coefficients against the closed-form series for each function.
const coeffs = {
  exp: n => 1 / fact(n),
  sin: n => n % 2 === 1 ? (((n - 1) / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
  cos: n => n % 2 === 0 ? ((n / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
  ln: n => n === 0 ? 0 : (n % 2 === 1 ? 1 : -1) / n,
  geo: n => 1,
};

function polyAt(coeff, N, x) { let s = 0; for (let n = 0; n <= N; n++) s += coeff(n) * Math.pow(x, n); return s; }

describe('Taylor partial sums converge to the true function', () => {
  it('eˣ at x=1, N=12 matches Math.exp within 1e-6', () => {
    expect(polyAt(coeffs.exp, 12, 1)).toBeCloseTo(Math.exp(1), 6);
  });
  it('sin x at x=1, N=12 matches Math.sin within 1e-6', () => {
    expect(polyAt(coeffs.sin, 12, 1)).toBeCloseTo(Math.sin(1), 6);
  });
  it('cos x at x=1, N=12 matches Math.cos within 1e-6', () => {
    expect(polyAt(coeffs.cos, 12, 1)).toBeCloseTo(Math.cos(1), 6);
  });
  it('ln(1+x) at x=0.5, N=30 matches Math.log(1.5) within 1e-3 (slow-converging series)', () => {
    expect(polyAt(coeffs.ln, 30, 0.5)).toBeCloseTo(Math.log(1.5), 3);
  });
  it('1/(1-x) at x=0.5, N=20 matches the closed form within 1e-6', () => {
    expect(polyAt(coeffs.geo, 20, 0.5)).toBeCloseTo(1 / (1 - 0.5), 6);
  });
});
