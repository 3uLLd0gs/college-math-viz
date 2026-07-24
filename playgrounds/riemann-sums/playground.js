import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav, neighbours } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { getCSS, fmtAxis as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { INTEGRANDS, RULES, riemannSum, rectangles, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "Riemann sums" ---- */
const MAX_N = 80;   // must match the #n slider max in index.html
const URL_SCHEMA = { fn: 'string', rule: 'string', n: 'number' };

const g = new Grapher2D(document.getElementById('graph'));
const shell = new ScoreShell(createConfetti(), { slug: 'riemann-sums' });
const state = { fn: INTEGRANDS[0], rule: RULES[0], n: 4 };

const meter = challengeMeter({
  format: v => v.toExponential(2),
  formatTol: t => t.toExponential(1),
  progress: linearProgress(8),
  onSolve: () => {
    const bonus = Math.max(10, 80 - state.n);
    const fresh = shell.award(`solve:${state.fn.id}:${state.rule.id}`, 40 + bonus);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Converged!', fresh
      ? `${state.rule.label} sum on target at n = ${state.n} · +${40 + bonus}`
      : `${state.rule.label} sum on target again at n = ${state.n}`, '🎯');
    if (state.n <= 12) shell.badge('smart', 'Smart Sampling', 'Hit the target with ≤ 12 rectangles', '🎯');
    shell.badge('converge', 'Convergence', 'Cleared a Riemann challenge', '🏅');
  },
});
g.setView(state.fn.view);

const explored = new Set(['square']);
const usedRules = new Set(['left']);

const fnButtons = buttonGroup('fbtns', INTEGRANDS, fn => {
  state.fn = fn; meter.reset();
  g.setView(fn.view);
  shell.award(`explore:${fn.id}`, 5);
  markExplored(fn.id);
  render();
  pushUrl();
});

const ruleButtons = buttonGroup('rules', RULES, rule => {
  state.rule = rule; meter.reset();
  usedRules.add(rule.id);
  if (usedRules.size === RULES.length) shell.badge('rules', 'Rule Breaker', 'Tried every sampling rule', '📐');
  render();
  pushUrl();
}, { className: 'tbtn' });

const nSlider = slider('n', {
  onInput: v => {
    state.n = v;
    if (state.n >= 20) shell.badge('fine', 'Fine Mesh', 'Pushed past 20 rectangles', '🧱');
    if (state.n === MAX_N) shell.badge('limit', 'To the Limit', `Reached ${MAX_N} rectangles`, '♾️');
    render();
    pushUrl();
  },
});

function markExplored(id) {
  explored.add(id);
  if (explored.size === INTEGRANDS.length) shell.badge('explorer', 'Integrator', 'Tried every function', '🧭');
}

document.getElementById('reset').onclick = () => { state.n = 4; nSlider.set(4); render(); pushUrl(); };

ticker('refine', {
  intervalMs: 90,
  playLabel: '▸ Refine n → ∞',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.n = 1; nSlider.set(1); render(); pushUrl(); },
  onTick: () => {
    if (state.n >= MAX_N) return false;
    state.n++; nSlider.set(state.n); render();
    pushUrl();
  },
});

g.onresize = render;

keyboardControl(document.getElementById('graph'), {
  nudge: (dx, dy, big) => {
    state.n = Math.max(1, Math.min(MAX_N, state.n + dx * (big ? 5 : 1)));
    nSlider.set(state.n);
    render(); pushUrl();
  },
  step: (delta, big) => {
    state.n = Math.max(1, Math.min(MAX_N, state.n + delta * (big ? 5 : 1)));
    nSlider.set(state.n);
    render(); pushUrl();
  },
});

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

mountNav('riemann-sums');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.fn) {
    const fn = INTEGRANDS.find(f => f.id === st.fn);
    if (fn) { state.fn = fn; fnButtons.select(INTEGRANDS.indexOf(fn), { notify: false }); g.setView(fn.view); }
  }
  if (st.rule) {
    const r = RULES.find(x => x.id === st.rule);
    if (r) { state.rule = r; ruleButtons.select(RULES.indexOf(r), { notify: false }); }
  }
  if (typeof st.n === 'number') { state.n = st.n; nSlider.set(st.n); }
  meter.reset();
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ fn: state.fn.id, rule: state.rule.id, n: state.n });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'riemann-sums', onJump: applyState, links: neighbours('riemann-sums') });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

document.getElementById('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
