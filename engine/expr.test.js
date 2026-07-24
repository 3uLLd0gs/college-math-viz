// engine/expr.test.js
import { describe, it, expect } from 'vitest';
import { compile, parse, ExprError } from './expr.js';

const at = (src, x) => compile(src)({ x });

describe('expr evaluate', () => {
  it('evaluates arithmetic with precedence', () => {
    expect(at('1+2*3', 0)).toBe(7);
    expect(at('(1+2)*3', 0)).toBe(9);
    expect(at('2*x+1', 4)).toBe(9);
  });
  it('exponent is right-associative and binds tighter than unary minus', () => {
    expect(at('2^3^2', 0)).toBe(512);      // 2^(3^2)
    expect(at('-x^2', 3)).toBe(-9);        // -(x^2)
    expect(at('2^-1', 0)).toBeCloseTo(0.5, 12);
  });
  it('evaluates whitelisted functions and constants', () => {
    expect(at('sin(0)+cos(0)', 0)).toBeCloseTo(1, 12);
    expect(at('ln(exp(x))', 2)).toBeCloseTo(2, 12);
    expect(at('sqrt(x)', 9)).toBeCloseTo(3, 12);
    expect(compile('pi')({})).toBeCloseTo(Math.PI, 12);
  });
});

describe('expr safety', () => {
  it('rejects unknown functions and names', () => {
    expect(() => parse('alert(1)')).toThrow(ExprError);
    expect(() => parse('__proto__')).toThrow(ExprError);
    expect(() => parse('y+1')).toThrow(ExprError);
  });
  it('rejects out-of-grammar characters and structure', () => {
    expect(() => parse('x.constructor')).toThrow(ExprError);
    expect(() => parse('1;2')).toThrow(ExprError);
    expect(() => parse('2*(3')).toThrow(ExprError);
    expect(() => parse('')).toThrow(ExprError);
  });
  it('an unbound variable throws rather than leaking globals', () => {
    // x is grammatical but unbound here → ExprError, never a global lookup
    expect(() => compile('x')({})).toThrow(ExprError);
  });
});
