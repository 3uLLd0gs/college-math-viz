import { describe, it, expect } from 'vitest';
import { compileCustom } from './custom-fn.js';

describe('compileCustom', () => {
  it('compiles a valid expression to a numeric function', () => {
    const { f, error } = compileCustom('x^2');
    expect(error).toBe('');
    expect(f(3)).toBe(9);
  });
  it('compiles a function with a pole (finite off the pole)', () => {
    const { f, error } = compileCustom('1/x');
    expect(error).toBe('');
    expect(f(2)).toBeCloseTo(0.5, 12);
  });
  it('returns a NaN (not a throw) where the expression is undefined', () => {
    const { f } = compileCustom('ln(x)');
    expect(Number.isNaN(f(-1))).toBe(true);   // ln of a negative → NaN, no throw
  });
  it('rejects hostile / unparseable input without executing', () => {
    for (const bad of ['alert(1)', '__proto__', 'x.constructor', '<script>', '1;2', 'y+1']) {
      const { f, error } = compileCustom(bad);
      expect(f).toBeNull();
      expect(error).not.toBe('');
    }
  });
  it('rejects a function that is non-finite across the whole sample range', () => {
    const { f, error } = compileCustom('sqrt(-1-x^2)');   // always NaN for real x
    expect(f).toBeNull();
    expect(error).not.toBe('');
  });
  it('rejects empty / whitespace input', () => {
    expect(compileCustom('   ').f).toBeNull();
  });
});
