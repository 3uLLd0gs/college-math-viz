// engine/drill/differentiation.test.js
import { describe, it, expect } from 'vitest';
import { compile } from '../expr.js';
import { makeRng } from './rng.js';
import { nextProblem, RULES } from './differentiation.js';

const numDeriv = (f, x, h = 1e-5) => (f({ x: x + h }) - f({ x: x - h })) / (2 * h);

describe('nextProblem', () => {
  it('emits an answer that is the true derivative of fExpr (numeric self-check)', () => {
    const rng = makeRng(2024);
    for (let i = 0; i < 200; i++) {
      const p = nextProblem(rng);
      const f = compile(p.fExpr);
      const df = compile(p.answer);
      let checked = 0;
      for (const x of [0.3, 0.7, 1.2, 1.8, 2.4]) {
        const approx = numDeriv(f, x), stated = df({ x });
        if (!Number.isFinite(approx) || !Number.isFinite(stated)) continue;
        checked++;
        expect(Math.abs(approx - stated)).toBeLessThan(1e-3 * Math.max(1, Math.abs(stated)));
      }
      expect(checked).toBeGreaterThan(0);
      expect(RULES).toContain(p.rule);
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
      expect(typeof p.promptText).toBe('string');
      expect(p.promptText.length).toBeGreaterThan(0);
    }
  });
  it('is deterministic for a given seed', () => {
    const a = nextProblem(makeRng(5)), b = nextProblem(makeRng(5));
    expect(a.fExpr).toBe(b.fExpr);
    expect(a.answer).toBe(b.answer);
  });
});
