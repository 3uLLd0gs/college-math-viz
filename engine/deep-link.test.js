// engine/deep-link.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stateToParams, paramsToState, readState, makeUrlSync, syncedUrl } from './deep-link.js';

describe('stateToParams', () => {
  it('encodes strings, numbers and booleans', () => {
    const p = stateToParams({ fn: 'sin', N: 7, snap: true, off: false });
    expect(p.get('fn')).toBe('sin');
    expect(p.get('N')).toBe('7');
    expect(p.get('snap')).toBe('1');
    expect(p.get('off')).toBe('0');
  });
  it('rounds noisy floats to 4 dp', () => {
    expect(stateToParams({ x: 0.123456789 }).get('x')).toBe('0.1235');
  });
  it('skips null and undefined', () => {
    const p = stateToParams({ a: null, b: undefined, c: 3 });
    expect(p.has('a')).toBe(false);
    expect(p.has('b')).toBe(false);
    expect(p.get('c')).toBe('3');
  });
});

describe('paramsToState', () => {
  const schema = { fn: 'string', N: 'number', snap: 'boolean' };
  it('coerces each key to its declared type', () => {
    const st = paramsToState(new URLSearchParams('fn=cos&N=5&snap=1'), schema);
    expect(st).toEqual({ fn: 'cos', N: 5, snap: true });
  });
  it('ignores keys not in the schema', () => {
    const st = paramsToState(new URLSearchParams('fn=cos&evil=9'), schema);
    expect(st).toEqual({ fn: 'cos' });
  });
  it('drops a number that will not parse', () => {
    const st = paramsToState(new URLSearchParams('N=notanumber'), schema);
    expect(st).toEqual({});
  });
  it('reads false from 0 and true from 1', () => {
    expect(paramsToState(new URLSearchParams('snap=0'), schema).snap).toBe(false);
    expect(paramsToState(new URLSearchParams('snap=1'), schema).snap).toBe(true);
  });
  it('is empty when nothing matches', () => {
    expect(paramsToState(new URLSearchParams(''), schema)).toEqual({});
  });
});

describe('readState', () => {
  it('reads from the current location', () => {
    const orig = window.location;
    delete window.location;
    window.location = { search: '?fn=sin&N=3' };
    expect(readState({ fn: 'string', N: 'number' })).toEqual({ fn: 'sin', N: 3 });
    window.location = orig;
  });
});

describe('syncedUrl', () => {
  it('preserves a foreign param (e.g. present=1) not in the schema params', () => {
    window.history.replaceState(null, '', '/p/?present=1');
    const url = syncedUrl(new URLSearchParams({ deg: '120' }));
    expect(url).toContain('present=1');
    expect(url).toContain('deg=120');
  });

  it('overwrites a schema key already present in the URL while keeping foreign params', () => {
    window.history.replaceState(null, '', '/p/?deg=5&present=1');
    const url = syncedUrl(new URLSearchParams({ deg: '120' }));
    expect(url).toContain('deg=120');
    expect(url).not.toContain('deg=5');
    expect(url).toContain('present=1');
  });
});

describe('makeUrlSync', () => {
  beforeEach(() => vi.useFakeTimers());
  it('debounces and writes the current state to the URL without a history entry', () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    const sync = makeUrlSync(st => stateToParams(st), { delay: 100 });
    sync({ N: 1 }); sync({ N: 2 }); sync({ N: 3 });
    expect(spy).not.toHaveBeenCalled();     // debounced
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);    // once, with the last state
    const url = spy.mock.calls[0][2];
    expect(url).toContain('N=3');
    spy.mockRestore();
    vi.useRealTimers();
  });

  it('preserves a foreign present=1 param when auto-syncing schema state', () => {
    window.history.replaceState(null, '', '/p/?present=1');
    const spy = vi.spyOn(window.history, 'replaceState');
    const sync = makeUrlSync(st => stateToParams(st), { delay: 100 });
    sync({ N: 3 });
    vi.advanceTimersByTime(100);
    const url = spy.mock.calls[0][2];
    expect(url).toContain('present=1');
    expect(url).toContain('N=3');
    spy.mockRestore();
    vi.useRealTimers();
  });
});
