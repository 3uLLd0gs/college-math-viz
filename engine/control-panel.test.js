import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { buttonGroup, slider, ticker } from './control-panel.js';

describe('buttonGroup', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="box"></div><div id="box2"></div>'; });

  const ITEMS = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];

  it('renders one button per item with label and data-id', () => {
    const g = buttonGroup('box', ITEMS, () => {});
    expect(g.buttons.map(b => b.textContent)).toEqual(['A', 'B', 'C']);
    expect(g.buttons.map(b => b.dataset.id)).toEqual(['a', 'b', 'c']);
    expect(g.buttons.every(b => b.className === 'fbtn' || b.className === 'fbtn on')).toBe(true);
  });

  it('marks the first item active without firing the callback', () => {
    const onSelect = vi.fn();
    const g = buttonGroup('box', ITEMS, onSelect);
    expect(g.buttons[0].classList.contains('on')).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(g.index).toBe(0);
  });

  it('honours an explicit initial selection', () => {
    const g = buttonGroup('box', ITEMS, () => {}, { selected: 2 });
    expect(g.buttons[2].classList.contains('on')).toBe(true);
    expect(g.item.id).toBe('c');
  });

  it('moves the active class and reports the item on click', () => {
    const onSelect = vi.fn();
    const g = buttonGroup('box', ITEMS, onSelect);
    g.buttons[1].click();
    expect(onSelect).toHaveBeenCalledWith(ITEMS[1], 1);
    expect(g.buttons[0].classList.contains('on')).toBe(false);
    expect(g.buttons[1].classList.contains('on')).toBe(true);
    expect(g.item.id).toBe('b');
  });

  it('scopes selection to its own container', () => {
    const g1 = buttonGroup('box', ITEMS, () => {});
    const g2 = buttonGroup('box2', ITEMS, () => {});
    g2.buttons[1].click();
    // selecting in g2 must not clear g1's active button
    expect(g1.buttons[0].classList.contains('on')).toBe(true);
    expect(g2.buttons[1].classList.contains('on')).toBe(true);
  });

  it('accepts a custom class name', () => {
    const g = buttonGroup('box', ITEMS, () => {}, { className: 'tbtn' });
    expect(g.buttons[0].className).toBe('tbtn on');
  });
});

describe('slider', () => {
  beforeEach(() => { document.body.innerHTML = '<input type="range" id="r">'; });

  it('derives --fill from the element min/max', () => {
    const s = slider('r', { min: 0, max: 10, value: 2.5 });
    expect(s.el.style.getPropertyValue('--fill')).toBe('25%');
  });

  it('handles a negative-to-positive range', () => {
    const s = slider('r', { min: -2, max: 2, step: 0.02, value: 0 });
    expect(s.el.style.getPropertyValue('--fill')).toBe('50%');
    s.set(1.2);
    expect(s.el.style.getPropertyValue('--fill')).toBe('80%');
  });

  it('reports the value as a number', () => {
    const s = slider('r', { min: 0, max: 14, value: 7 });
    expect(s.value).toBe(7);
    expect(typeof s.value).toBe('number');
  });

  it('fires onInput with the numeric value on user input', () => {
    const onInput = vi.fn();
    const s = slider('r', { min: 0, max: 14, value: 1, onInput });
    s.el.value = 9;
    s.el.dispatchEvent(new Event('input'));
    expect(onInput).toHaveBeenCalledWith(9);
    expect(s.el.style.getPropertyValue('--fill')).toBe(String(9 / 14 * 100) + '%');
  });

  it('set() updates value and fill without firing onInput', () => {
    const onInput = vi.fn();
    const s = slider('r', { min: 0, max: 10, value: 0, onInput });
    s.set(5);
    expect(s.value).toBe(5);
    expect(s.el.style.getPropertyValue('--fill')).toBe('50%');
    expect(onInput).not.toHaveBeenCalled();
  });

  it('range() rescales bounds and repaints', () => {
    const onInput = vi.fn();
    const s = slider('r', { min: -2, max: 2, step: 0.02, value: 0, onInput });
    s.range({ min: -3, max: 3, step: 0.03, value: 1.8 });
    expect(s.el.min).toBe('-3');
    expect(s.el.max).toBe('3');
    expect(s.value).toBe(1.8);
    expect(s.el.style.getPropertyValue('--fill')).toBe('80%');
    expect(onInput).not.toHaveBeenCalled();
  });

  it('does not divide by zero on a degenerate range', () => {
    const s = slider('r', { min: 5, max: 5, value: 5 });
    expect(s.el.style.getPropertyValue('--fill')).toBe('0%');
  });
});

describe('ticker', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="play"></button>';
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('starts idle showing the play label', () => {
    const t = ticker('play', { playLabel: '▸ Go', pauseLabel: '⏸ Stop' });
    expect(t.el.textContent).toBe('▸ Go');
    expect(t.running).toBe(false);
  });

  it('click starts ticking, swaps the label, and calls onStart before any tick', () => {
    const calls = [];
    const t = ticker('play', {
      intervalMs: 100, playLabel: '▸ Go', pauseLabel: '⏸ Stop',
      onStart: () => calls.push('start'), onTick: () => { calls.push('tick'); },
    });
    t.el.click();
    expect(t.el.textContent).toBe('⏸ Stop');
    expect(calls).toEqual(['start']);
    vi.advanceTimersByTime(250);
    expect(calls).toEqual(['start', 'tick', 'tick']);
    expect(t.running).toBe(true);
  });

  it('a second click pauses and restores the play label', () => {
    const onTick = vi.fn();
    const t = ticker('play', { intervalMs: 100, playLabel: '▸ Go', pauseLabel: '⏸ Stop', onTick });
    t.el.click();
    vi.advanceTimersByTime(100);
    t.el.click();
    expect(t.running).toBe(false);
    expect(t.el.textContent).toBe('▸ Go');
    const seen = onTick.mock.calls.length;
    vi.advanceTimersByTime(500);
    expect(onTick.mock.calls.length).toBe(seen);
  });

  it('onTick returning false stops the ticker and restores the label', () => {
    let n = 0;
    const t = ticker('play', {
      intervalMs: 100, playLabel: '▸ Go', pauseLabel: '⏸ Stop',
      onTick: () => { if (n >= 3) return false; n++; },
    });
    t.el.click();
    vi.advanceTimersByTime(1000);
    expect(n).toBe(3);
    expect(t.running).toBe(false);
    expect(t.el.textContent).toBe('▸ Go');
  });

  it('a falsy-but-not-false return keeps it running', () => {
    const t = ticker('play', { intervalMs: 100, onTick: () => undefined });
    t.el.click();
    vi.advanceTimersByTime(300);
    expect(t.running).toBe(true);
    t.stop();
  });
});
