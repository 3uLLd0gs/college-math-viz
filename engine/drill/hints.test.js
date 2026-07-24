import { describe, it, expect } from 'vitest';
import { makeHintLadder } from './hints.js';

describe('makeHintLadder', () => {
  it('reveals one step at a time, then reports done', () => {
    const L = makeHintLadder(['a', 'b', 'c']);
    expect(L.done).toBe(false);
    expect(L.remaining).toBe(3);
    expect(L.reveal()).toBe('a');
    expect(L.revealed).toEqual(['a']);
    expect(L.reveal()).toBe('b');
    expect(L.reveal()).toBe('c');
    expect(L.done).toBe(true);
    expect(L.remaining).toBe(0);
    expect(L.reveal()).toBeNull();
    expect(L.revealed).toEqual(['a', 'b', 'c']);
  });
});
