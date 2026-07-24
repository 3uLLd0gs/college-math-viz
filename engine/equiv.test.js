import { describe, it, expect } from 'vitest';
import { equivalent } from './equiv.js';

// deterministic rng for reproducible tests
const seq = (() => { let s = 0.123; return () => (s = (s * 9301 + 49297) % 233280 / 233280); });

describe('equivalent', () => {
  it('accepts algebraic rearrangements of the same function', () => {
    expect(equivalent('2*x*sin(x)+x^2*cos(x)', 'x*(2*sin(x)+x*cos(x))', { rng: seq() })).toBe(true);
    expect(equivalent('(x+1)^2', 'x^2+2*x+1', { rng: seq() })).toBe(true);
  });
  it('rejects genuinely different functions', () => {
    expect(equivalent('2*x', '2*x+1', { rng: seq() })).toBe(false);
    expect(equivalent('sin(x)', 'cos(x)', { rng: seq() })).toBe(false);
  });
  it('returns false for unparseable input rather than throwing', () => {
    expect(equivalent('2*x', 'alert(1)', { rng: seq() })).toBe(false);
  });
  it('handles functions with poles by sampling around them', () => {
    // 1/x vs 1/x — equal wherever defined; sampling skips x≈0
    expect(equivalent('1/x', '1/x', { rng: seq() })).toBe(true);
  });
});
