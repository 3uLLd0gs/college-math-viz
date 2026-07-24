import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountDrill } from './drill-shell.js';

// A generator returning one fixed problem, so the test knows the answer.
const fixed = () => ({
  id: 'x', rule: 'product', promptText: 'x² · sin(x)',
  fExpr: '(x^2)*(sin(x))', answer: '(2*x)*(sin(x))+(x^2)*(cos(x))',
  steps: ['step one', 'step two', 'step three'],
});

let root, shell;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root');
  shell = { add: vi.fn(), hitStreak: vi.fn(), resetStreak: vi.fn() };
});

describe('mountDrill', () => {
  it('accepts a correct (rearranged) answer and rewards the streak', () => {
    mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-input').value = 'x*(2*sin(x)+x*cos(x))';
    root.querySelector('#drill-check').click();
    expect(root.querySelector('#drill-feedback').className).toContain('right');
    expect(shell.add).toHaveBeenCalled();
    expect(shell.hitStreak).toHaveBeenCalled();
  });
  it('rejects a wrong answer and resets the streak', () => {
    mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-input').value = '2*x';
    root.querySelector('#drill-check').click();
    expect(root.querySelector('#drill-feedback').className).toContain('wrong');
    expect(shell.resetStreak).toHaveBeenCalled();
  });
  it('shows an inline message for unreadable input without scoring', () => {
    mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-input').value = 'alert(1)';
    root.querySelector('#drill-check').click();
    expect(root.querySelector('#drill-feedback').className).toContain('warn');
    expect(shell.add).not.toHaveBeenCalled();
    expect(shell.resetStreak).not.toHaveBeenCalled();
  });
  it('reveals hints one at a time and loads a new problem', () => {
    const api = mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-hint').click();
    expect(root.querySelectorAll('#drill-hints li').length).toBe(1);
    root.querySelector('#drill-hint').click();
    expect(root.querySelectorAll('#drill-hints li').length).toBe(2);
    root.querySelector('#drill-next').click();
    expect(root.querySelectorAll('#drill-hints li').length).toBe(0);
    expect(api.current().promptText).toBe('x² · sin(x)');
  });
});
