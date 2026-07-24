import { describe, it, expect } from 'vitest';
import { makeRng, randInt, pick } from './rng.js';

describe('makeRng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(42), b = makeRng(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it('differs across seeds and stays in [0,1)', () => {
    const a = makeRng(1), b = makeRng(2);
    expect(a()).not.toBe(b());
    const r = makeRng(7);
    for (let i = 0; i < 100; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  it('randInt is inclusive and pick returns a member', () => {
    const r = makeRng(3);
    for (let i = 0; i < 100; i++) { const n = randInt(r, 2, 4); expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(4); }
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) expect(arr).toContain(pick(makeRng(i), arr));
  });
});
