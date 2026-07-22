import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreShell } from './score-shell.js';

function mockDom() {
  document.body.innerHTML = `
    <div id="s-pts">0</div><div id="s-streak">0</div><div id="s-badges">0</div>
    <div id="toasts"></div>
  `;
}

describe('ScoreShell', () => {
  beforeEach(mockDom);

  it('add() increments points and repaints', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.add(10);
    expect(shell.pts).toBe(10);
    expect(document.getElementById('s-pts').textContent).toBe('10');
  });

  it('badge() is idempotent per id and awards 25 points once', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.badge('first', 'First!', 'sub', '✳️');
    shell.badge('first', 'First!', 'sub', '✳️');
    expect(shell.pts).toBe(25);
    expect(shell.badges.size).toBe(1);
    expect(document.getElementById('toasts').children.length).toBe(1);
  });

  it('celebrate() delegates to the injected confetti burst', () => {
    const burst = vi.fn();
    const shell = new ScoreShell({ burst });
    shell.celebrate();
    expect(burst).toHaveBeenCalledOnce();
  });

  it('resetStreak() zeroes the streak', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.hitStreak(); shell.hitStreak();
    expect(shell.streak).toBe(2);
    shell.resetStreak();
    expect(shell.streak).toBe(0);
  });
});
