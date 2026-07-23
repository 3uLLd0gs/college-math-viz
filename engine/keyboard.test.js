// engine/keyboard.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { keyboardControl } from './keyboard.js';

const key = (el, k, shift = false) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey: shift, bubbles: true, cancelable: true }));

let el;
beforeEach(() => { el = document.createElement('canvas'); document.body.appendChild(el); });

describe('keyboardControl', () => {
  it('makes the element focusable', () => {
    keyboardControl(el, {});
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('arrow keys nudge in the four directions', () => {
    const nudge = vi.fn();
    keyboardControl(el, { nudge });
    key(el, 'ArrowRight'); key(el, 'ArrowLeft'); key(el, 'ArrowUp'); key(el, 'ArrowDown');
    expect(nudge.mock.calls.map(c => [c[0], c[1]])).toEqual([[1, 0], [-1, 0], [0, 1], [0, -1]]);
  });

  it('Shift makes a coarse nudge', () => {
    const nudge = vi.fn();
    keyboardControl(el, { nudge });
    key(el, 'ArrowRight', true);
    expect(nudge).toHaveBeenCalledWith(1, 0, true);
  });

  it('plus and minus step a scalar', () => {
    const step = vi.fn();
    keyboardControl(el, { step });
    key(el, '+'); key(el, '-'); key(el, ']'); key(el, '[');
    expect(step.mock.calls.map(c => c[0])).toEqual([1, -1, 1, -1]);
  });

  it('Home resets', () => {
    const home = vi.fn();
    keyboardControl(el, { home });
    key(el, 'Home');
    expect(home).toHaveBeenCalledOnce();
  });

  it('ignores keys it does not handle and does not prevent their default', () => {
    keyboardControl(el, { nudge: vi.fn() });
    const e = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('prevents default on keys it does handle, so the page does not scroll', () => {
    keyboardControl(el, { nudge: vi.fn() });
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('destroy() removes the listener', () => {
    const nudge = vi.fn();
    const { destroy } = keyboardControl(el, { nudge });
    destroy();
    key(el, 'ArrowRight');
    expect(nudge).not.toHaveBeenCalled();
  });
});
