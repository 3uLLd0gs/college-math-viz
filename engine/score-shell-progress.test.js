import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreShell, loadProgress, saveProgress, clearProgress, totalProgress } from './score-shell.js';

const dom = () => {
  document.body.innerHTML = `
    <div id="s-pts">0</div><div id="s-streak">0</div><div id="s-badges">0</div><div id="toasts"></div>`;
};

beforeEach(() => { dom(); localStorage.clear(); });

describe('progress round-trips through storage', () => {
  it('starts empty for an unknown playground', () => {
    expect(loadProgress('nothing-here')).toEqual({ pts: 0, streak: 0, badges: [], awards: [] });
  });

  it('saves and reloads points, streak and badges', () => {
    saveProgress('demo', { pts: 120, streak: 3, badges: new Set(['a', 'b']), awards: new Set(['k']) });
    expect(loadProgress('demo')).toEqual({ pts: 120, streak: 3, badges: ['a', 'b'], awards: ['k'] });
  });

  it('clearProgress removes it', () => {
    saveProgress('demo', { pts: 5, streak: 1, badges: [] });
    clearProgress('demo');
    expect(loadProgress('demo').pts).toBe(0);
  });

  it('keeps playgrounds separate', () => {
    saveProgress('one', { pts: 10, streak: 0, badges: ['x'] });
    saveProgress('two', { pts: 99, streak: 0, badges: [] });
    expect(loadProgress('one').pts).toBe(10);
    expect(loadProgress('two').pts).toBe(99);
  });

  it('survives corrupt stored data instead of throwing', () => {
    localStorage.setItem('cmv:progress:broken', '{not json');
    expect(loadProgress('broken')).toEqual({ pts: 0, streak: 0, badges: [], awards: [] });
  });

  it('rejects values of the wrong shape from an older build', () => {
    localStorage.setItem('cmv:progress:odd', JSON.stringify({ pts: 'lots', badges: 'nope', awards: 3 }));
    expect(loadProgress('odd')).toEqual({ pts: 0, streak: 0, badges: [], awards: [] });
  });

  it('drops non-string badge entries', () => {
    localStorage.setItem('cmv:progress:mixed', JSON.stringify({ pts: 1, streak: 0, badges: ['ok', 7, null] }));
    expect(loadProgress('mixed').badges).toEqual(['ok']);
  });
});

describe('ScoreShell persistence', () => {
  it('writes through on every change', () => {
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    shell.add(30);
    shell.hitStreak();
    expect(loadProgress('demo')).toEqual({ pts: 30, streak: 1, badges: [], awards: [] });
  });

  it('restores a previous session on construction', () => {
    saveProgress('demo', { pts: 80, streak: 2, badges: ['first'] });
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    expect(shell.pts).toBe(80);
    expect(shell.streak).toBe(2);
    expect(shell.badges.has('first')).toBe(true);
    expect(document.getElementById('s-pts').textContent).toBe('80');
    expect(document.getElementById('s-badges').textContent).toBe('1');
  });

  it('does not re-award or re-toast a badge earned in a past session', () => {
    saveProgress('demo', { pts: 25, streak: 0, badges: ['first'] });
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    shell.badge('first', 'First', 'sub', '★');
    expect(shell.pts).toBe(25);
    expect(document.getElementById('toasts').children).toHaveLength(0);
  });

  it('stays in memory only when no slug is given', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.add(40);
    expect(localStorage.length).toBe(0);
    expect(shell.pts).toBe(40);
  });

  it('reset() wipes both the object and the stored copy', () => {
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    shell.add(50); shell.badge('b', 't', 's');
    shell.reset();
    expect(shell.pts).toBe(0);
    expect(shell.badges.size).toBe(0);
    expect(loadProgress('demo').pts).toBe(0);
    expect(document.getElementById('s-pts').textContent).toBe('0');
  });

  it('paints without throwing when the scoreboard is absent', () => {
    document.body.innerHTML = '<div id="toasts"></div>';
    expect(() => new ScoreShell({ burst: vi.fn() }, { slug: 'demo' })).not.toThrow();
  });
});

describe('totalProgress', () => {
  it('sums points and badges and counts started playgrounds', () => {
    saveProgress('a', { pts: 40, streak: 0, badges: ['x', 'y'] });
    saveProgress('b', { pts: 10, streak: 0, badges: ['z'] });
    expect(totalProgress(['a', 'b', 'c'])).toEqual({ pts: 50, badges: 3, started: 2 });
  });

  it('is all zeroes before anything is played', () => {
    expect(totalProgress(['a', 'b'])).toEqual({ pts: 0, badges: 0, started: 0 });
  });
});

describe('award() — one-time, persisted point grants', () => {
  it('pays out the first time and never again in the same session', () => {
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    expect(shell.award('solve:exp', 90)).toBe(true);
    expect(shell.award('solve:exp', 90)).toBe(false);
    expect(shell.award('solve:exp', 90)).toBe(false);
    expect(shell.pts).toBe(90);
  });

  it('does not pay out again after a reload — the reload-farm is closed', () => {
    let shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    shell.award('solve:exp', 90);
    shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });   // fresh page load
    expect(shell.award('solve:exp', 90)).toBe(false);
    expect(shell.pts).toBe(90);
  });

  it('closes the alternate-click farm on exploration points', () => {
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    for (const id of ['sin', 'cos', 'sin', 'cos', 'sin']) shell.award(`explore:${id}`, 5);
    expect(shell.pts).toBe(10);   // two distinct fields, not five clicks
  });

  it('keeps distinct keys independent', () => {
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    shell.award('solve:exp', 50);
    shell.award('solve:sin', 50);
    expect(shell.pts).toBe(100);
  });

  it('awarded() reports past payouts, including from an earlier session', () => {
    let shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    shell.award('solve:exp', 90);
    expect(shell.awarded('solve:exp')).toBe(true);
    expect(shell.awarded('solve:cos')).toBe(false);
    shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    expect(shell.awarded('solve:exp')).toBe(true);
  });

  it('keeps playgrounds independent', () => {
    const a = new ScoreShell({ burst: vi.fn() }, { slug: 'one' });
    const b = new ScoreShell({ burst: vi.fn() }, { slug: 'two' });
    a.award('solve:x', 30);
    expect(b.award('solve:x', 30)).toBe(true);
    expect(b.pts).toBe(30);
  });

  it('reset() clears the award record so points can be earned again', () => {
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'demo' });
    shell.award('solve:exp', 90);
    shell.reset();
    expect(shell.awarded('solve:exp')).toBe(false);
    expect(shell.award('solve:exp', 90)).toBe(true);
    expect(shell.pts).toBe(90);
  });

  it('an in-memory shell still gates within its own session', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.award('k', 10);
    expect(shell.award('k', 10)).toBe(false);
    expect(shell.pts).toBe(10);
  });

  it('tolerates a stored record missing the awards field', () => {
    localStorage.setItem('cmv:progress:old', JSON.stringify({ pts: 40, streak: 1, badges: ['b'] }));
    const shell = new ScoreShell({ burst: vi.fn() }, { slug: 'old' });
    expect(shell.pts).toBe(40);
    expect(shell.awards.size).toBe(0);
    expect(shell.award('solve:x', 10)).toBe(true);
  });
});
