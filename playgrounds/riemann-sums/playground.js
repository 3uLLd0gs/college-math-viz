import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { createConfetti } from '../../engine/confetti.js';
import { getCSS, fmtAxis as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { INTEGRANDS, RULES, riemannSum, rectangles } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "Riemann sums" ---- */
const MAX_N = 80;   // must match the #n slider max in index.html

const g = new Grapher2D(document.getElementById('graph'));
const shell = new ScoreShell(createConfetti());
const state = { fn: INTEGRANDS[0], rule: RULES[0], n: 4 };

const meter = challengeMeter({
  format: v => v.toExponential(2),
  formatTol: t => t.toExponential(1),
  progress: linearProgress(8),
  onSolve: () => {
    const bonus = Math.max(10, 80 - state.n);
    shell.add(40 + bonus); shell.hitStreak(); shell.celebrate();
    shell.toast('Converged!', `${state.rule.label} sum on target at n = ${state.n} · +${40 + bonus}`, '🎯');
    if (state.n <= 12) shell.badge('smart', 'Smart Sampling', 'Hit the target with ≤ 12 rectangles', '🎯');
    shell.badge('converge', 'Convergence', 'Cleared a Riemann challenge', '🏅');
  },
});
g.setView(state.fn.view);

const explored = new Set(['square']);
const usedRules = new Set(['left']);

buttonGroup('fbtns', INTEGRANDS, fn => {
  state.fn = fn; meter.reset();
  g.setView(fn.view);
  shell.add(5);
  markExplored(fn.id);
  render();
});

buttonGroup('rules', RULES, rule => {
  state.rule = rule; meter.reset();
  usedRules.add(rule.id);
  if (usedRules.size === RULES.length) shell.badge('rules', 'Rule Breaker', 'Tried every sampling rule', '📐');
  render();
}, { className: 'tbtn' });

const nSlider = slider('n', {
  onInput: v => {
    state.n = v;
    if (state.n >= 20) shell.badge('fine', 'Fine Mesh', 'Pushed past 20 rectangles', '🧱');
    if (state.n === MAX_N) shell.badge('limit', 'To the Limit', `Reached ${MAX_N} rectangles`, '♾️');
    render();
  },
});

function markExplored(id) {
  explored.add(id);
  if (explored.size === INTEGRANDS.length) shell.badge('explorer', 'Integrator', 'Tried every function', '🧭');
}

document.getElementById('reset').onclick = () => { state.n = 4; nSlider.set(4); render(); };

ticker('refine', {
  intervalMs: 90,
  playLabel: '▸ Refine n → ∞',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.n = 1; nSlider.set(1); render(); },
  onTick: () => {
    if (state.n >= MAX_N) return false;
    state.n++; nSlider.set(state.n); render();
  },
});

g.onresize = render;

function render() {
  const { fn, rule, n } = state;

  g.clear(); g.grid();

  // rectangles first, so the curve reads on top of them
  for (const r of rectangles(fn, n, rule)) {
    g.bar(r.x0, r.x1, r.y, { fill: getCSS('--approx'), stroke: 'rgba(0,0,0,.45)', alpha: 0.34 });
  }
  g.plot(x => fn.f(x), { color: getCSS('--true'), width: 2.6, glow: 6 });
  g.vline(fn.a, getCSS('--muted'));
  g.vline(fn.b, getCSS('--muted'));

  const approx = riemannSum(fn, n, rule);
  const err = Math.abs(approx - fn.exact);

  document.getElementById('n-lab').innerHTML = `${n}<small> rect</small>`;
  document.getElementById('readout').innerHTML =
    `∫<sub>${fmt(fn.a)}</sub><sup>${fmt(fn.b)}</sup> ${fn.tex} dx` +
    ` &nbsp;·&nbsp; ${rule.label} sum = <b>${approx.toFixed(5)}</b>` +
    ` &nbsp;·&nbsp; exact = <b>${fn.exact.toFixed(5)}</b>` +
    ` &nbsp;·&nbsp; error = <b class="er">${err.toExponential(2)}</b>`;

  meter.update({
    value: err, tol: fn.tol,
    goal: `Squeeze the sum for <b>${fn.tex}</b> down to the target error — a smarter sampling rule gets there with far fewer rectangles.`,
    solvedText: `✓ On target with ${n} rectangles.`,
    hintText: 'Add rectangles — the sum is still off the true area.',
  });
}

render();
