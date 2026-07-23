import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { getCSS, fmtAxis as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, logProgress } from '../../engine/challenge-meter.js';
import { FUNCTIONS, polyAt, formula } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "Taylor series" ---- */
const MAX_TERMS = 14;   // must match the #terms slider max in index.html

const g = new Grapher2D(document.getElementById('graph'));
const shell = new ScoreShell(createConfetti(), { slug: 'taylor-series' });
let state = { fn: FUNCTIONS[0], N: 1, probe: 2 };

const meter = challengeMeter({
  format: v => v.toExponential(2),
  formatTol: t => t.toExponential(0),
  progress: logProgress(6),
  onSolve: () => {
    const bonus = Math.max(10, 60 - state.N * 4);
    const fresh = shell.award(`solve:${state.fn.id}`, 50 + bonus);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Target hit!', fresh
      ? `Solved with ${state.N} terms · +${50 + bonus}`
      : `Solved again with ${state.N} terms`, '🎯');
    if (state.N <= 4) shell.badge('efficient', 'Efficient', 'Solved in ≤ 4 terms', '⚡');
    shell.badge('sharp', 'Sharpshooter', 'Cleared a precision challenge', '🎯');
  },
});
g.setView(state.fn.view);

buttonGroup('fbtns', FUNCTIONS, fn => selectFn(fn));

const nLab = document.getElementById('n-lab');

const terms = slider('terms', {
  onInput: n => {
    state.N = n;
    if (state.N >= 1) shell.badge('first', 'First Term', 'You started an approximation', '✳️');
    if (state.N === MAX_TERMS) shell.badge('deep', 'Convergence Master', `Pushed to ${MAX_TERMS} terms`, '♾️');
    render();
  },
});

function selectFn(fn) {
  state.fn = fn; state.probe = fn.challenge.x0; meter.reset();
  g.setView(fn.view);
  shell.award(`explore:${fn.id}`, 5);
  markExplored(fn.id);
  render();
}

const explored = new Set(['exp']);
function markExplored(id) {
  explored.add(id);
  if (explored.size === FUNCTIONS.length) shell.badge('explorer', 'Explorer', 'Tried every function', '🧭');
}

document.getElementById('reset').onclick = () => { state.N = 1; terms.set(1); render(); };

ticker('build', {
  intervalMs: 260,
  playLabel: '▸ Animate build',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.N = 0; terms.set(0); render(); },
  onTick: () => {
    if (state.N >= MAX_TERMS) return false;
    state.N++; terms.set(state.N); render();
  },
});

const gc = document.getElementById('graph');
let dragging = false;
function setProbe(clientX) {
  const r = gc.getBoundingClientRect();
  let x = g.ux(clientX - r.left);
  x = Math.max(state.fn.view.xmin + 0.02, Math.min(state.fn.view.xmax - 0.02, x));
  state.probe = x; render();
}
gc.addEventListener('pointerdown', e => { dragging = true; gc.setPointerCapture(e.pointerId); setProbe(e.clientX); });
gc.addEventListener('pointermove', e => { if (dragging) setProbe(e.clientX); });
gc.addEventListener('pointerup', () => dragging = false);
gc.addEventListener('pointercancel', () => dragging = false);

g.onresize = render;

function render() {
  const fn = state.fn, N = state.N, px = state.probe;
  nLab.innerHTML = `${N}<small> deg</small>`;

  g.clear(); g.grid();
  g.plot(x => fn.f(x), { color: getCSS('--true'), width: 2.6 });
  g.plot(x => polyAt(fn, N, x), { color: getCSS('--approx'), width: 2.6, glow: 9 });

  const yt = fn.f(px), ya = polyAt(fn, N, px), err = Math.abs(yt - ya);
  g.vline(px, getCSS('--muted'));
  if (Number.isFinite(yt) && Number.isFinite(ya)) g.gap(px, yt, ya, getCSS('--error'));
  g.dot(px, yt, getCSS('--true')); g.dot(px, ya, getCSS('--approx'));

  document.getElementById('readout').innerHTML =
    `at x = <b>${fmt(px)}</b> &nbsp;·&nbsp; f = <b>${Number.isFinite(yt) ? yt.toFixed(4) : '—'}</b>` +
    ` &nbsp;·&nbsp; P<sub>${N}</sub> = <b>${Number.isFinite(ya) ? ya.toFixed(4) : '—'}</b>` +
    ` &nbsp;·&nbsp; error = <b class="er">${Number.isFinite(err) ? err.toExponential(2) : '—'}</b>`;

  document.getElementById('f-rhs').innerHTML = formula(fn, N);

  const ch = fn.challenge;
  const cErr = Math.abs(fn.f(ch.x0) - polyAt(fn, N, ch.x0));
  meter.update({
    value: cErr, tol: ch.tol,
    goal: `Approximate <b>${ch.label}</b> at x = ${fmt(ch.x0)} to within the target error.`,
    solvedText: `✓ Within target with ${N} terms.`,
    hintText: 'Add terms — error still above target.',
  });
}

render();

mountNav('taylor-series');
