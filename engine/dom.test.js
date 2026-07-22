import { describe, it, expect } from 'vitest';
import { fmtAxis, fmtNum, s } from './dom.js';

describe('fmtAxis (compact, used for graph axis ticks)', () => {
  it('strips trailing zeros and normalizes -0', () => {
    expect(fmtAxis(2)).toBe('2');
    expect(fmtAxis(2.5)).toBe('2.5');
    expect(fmtAxis(-0.001)).toBe('0');
  });
});

describe('fmtNum (fixed 2dp, used for slider readouts)', () => {
  it('always shows two decimals and normalizes -0', () => {
    expect(fmtNum(2)).toBe('2.00');
    expect(fmtNum(2.5)).toBe('2.50');
    expect(fmtNum(-0.001)).toBe('0.00');
  });
});

describe('s', () => {
  it('is a getElementById shorthand', () => {
    document.body.innerHTML = '<div id="probe">x</div>';
    expect(s('probe').textContent).toBe('x');
  });
});
