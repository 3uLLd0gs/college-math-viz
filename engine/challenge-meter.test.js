import { describe, it, expect, beforeEach, vi } from 'vitest';
import { challengeMeter, linearProgress, logProgress } from './challenge-meter.js';

const dom = () => {
  document.body.innerHTML = `
    <div id="c-goal"></div><b id="c-val"></b><b id="c-tol"></b>
    <div class="cbar"><i id="c-bar"></i></div><div id="c-state"></div>`;
};
const bar = () => document.getElementById('c-bar').style.width;
const state = () => document.getElementById('c-state');

const args = (value, tol) => ({
  value, tol, goal: 'Hit the target',
  solvedText: 'cleared', hintText: 'keep going',
});

describe('challengeMeter rendering', () => {
  beforeEach(dom);

  it('writes goal, value, tolerance and status', () => {
    const m = challengeMeter();
    m.update(args(0.5, 0.01));
    expect(document.getElementById('c-goal').innerHTML).toBe('Hit the target');
    expect(document.getElementById('c-val').textContent).toBe('5.00e-1');
    expect(document.getElementById('c-tol').textContent).toBe('1.00e-2');
    expect(state().textContent).toBe('keep going');
    expect(state().className).toBe('cstate');
  });

  it('switches to the win state once value drops below tolerance', () => {
    const m = challengeMeter();
    expect(m.update(args(0.5, 0.01))).toBe(false);
    expect(m.update(args(0.001, 0.01))).toBe(true);
    expect(state().textContent).toBe('cleared');
    expect(state().className).toBe('cstate win');
  });

  it('treats exactly-at-tolerance as not yet cleared', () => {
    const m = challengeMeter();
    expect(m.update(args(0.01, 0.01))).toBe(false);
  });

  it('honours custom formatters', () => {
    const m = challengeMeter({ format: v => v.toFixed(3), formatTol: t => t.toFixed(2) });
    m.update(args(0.4669, 0.05));
    expect(document.getElementById('c-val').textContent).toBe('0.467');
    expect(document.getElementById('c-tol').textContent).toBe('0.05');
  });

  it('leaves the goal untouched when none is supplied', () => {
    const m = challengeMeter();
    document.getElementById('c-goal').innerHTML = 'preset';
    m.update({ value: 1, tol: 0.1, solvedText: 'a', hintText: 'b' });
    expect(document.getElementById('c-goal').innerHTML).toBe('preset');
  });
});

describe('onSolve latching', () => {
  beforeEach(dom);

  it('fires once no matter how many renders stay cleared', () => {
    const onSolve = vi.fn();
    const m = challengeMeter({ onSolve });
    m.update(args(0.001, 0.01));
    m.update(args(0.0005, 0.01));
    m.update(args(0.0001, 0.01));
    expect(onSolve).toHaveBeenCalledTimes(1);
  });

  it('does not fire again when the value drifts back above and below', () => {
    const onSolve = vi.fn();
    const m = challengeMeter({ onSolve });
    m.update(args(0.001, 0.01));   // solve
    m.update(args(0.5, 0.01));     // back above target
    m.update(args(0.001, 0.01));   // below again
    expect(onSolve).toHaveBeenCalledTimes(1);
  });

  it('re-arms after reset(), as when the puzzle changes', () => {
    const onSolve = vi.fn();
    const m = challengeMeter({ onSolve });
    m.update(args(0.001, 0.01));
    expect(m.solved).toBe(true);
    m.reset();
    expect(m.solved).toBe(false);
    m.update(args(0.001, 0.01));
    expect(onSolve).toHaveBeenCalledTimes(2);
  });

  it('never fires if the target is never met', () => {
    const onSolve = vi.fn();
    const m = challengeMeter({ onSolve });
    m.update(args(5, 0.01));
    m.update(args(1, 0.01));
    expect(onSolve).not.toHaveBeenCalled();
  });

  it('still shows the win state after a reset that lands already-cleared', () => {
    const m = challengeMeter();
    m.update(args(0.001, 0.01));
    m.reset();
    expect(m.update(args(0.001, 0.01))).toBe(true);
    expect(state().className).toBe('cstate win');
  });
});

describe('bar fill', () => {
  beforeEach(dom);

  it('clamps to 0% when the value is far above tolerance', () => {
    const m = challengeMeter({ progress: linearProgress(6) });
    m.update(args(100, 0.01));
    expect(bar()).toBe('0%');
  });

  it('clamps to 100% when the value is far below tolerance', () => {
    const m = challengeMeter({ progress: logProgress(6) });
    m.update(args(1e-20, 0.01));
    expect(bar()).toBe('100%');
  });

  it('linearProgress empties at exactly span × tolerance', () => {
    const p = linearProgress(6);
    expect(p(0.06, 0.01)).toBeCloseTo(0, 12);
    expect(p(0.03, 0.01)).toBeCloseTo(0.5, 12);
    expect(p(0, 0.01)).toBe(1);
  });

  it('logProgress is half full exactly at the tolerance', () => {
    const p = logProgress(6);
    expect(p(0.01, 0.01)).toBeCloseTo(0.5, 12);
    expect(p(0.001, 0.01)).toBeCloseTo(0.5 + 1 / 6, 12);
  });

  it('logProgress does not blow up on a zero value', () => {
    const p = logProgress(6);
    expect(Number.isFinite(p(0, 0.01))).toBe(true);
  });

  it('bar width is monotonic as the value improves', () => {
    const m = challengeMeter({ progress: logProgress(6) });
    const widths = [1, 0.1, 0.01, 0.001].map(v => { m.update(args(v, 0.01)); return parseFloat(bar()); });
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1]);
  });
});
