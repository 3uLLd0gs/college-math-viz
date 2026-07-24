import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav, neighbours } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { getCSS, fmtAxis as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, logProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { FUNCTIONS, polyAt, formula, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "Taylor series" ---- */
const MAX_TERMS = 14;   // must match the #terms slider max in index.html
const URL_SCHEMA = { fn: 'string', N: 'number', probe: 'number' };

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

const fnButtons = buttonGroup('fbtns', FUNCTIONS, fn => selectFn(fn));

const nLab = document.getElementById('n-lab');

const terms = slider('terms', {
  onInput: n => {
    state.N = n;
    if (state.N >= 1) shell.badge('first', 'First Term', 'You started an approximation', '✳️');
    if (state.N === MAX_TERMS) shell.badge('deep', 'Convergence Master', `Pushed to ${MAX_TERMS} terms`, '♾️');
    render();
    pushUrl();
  },
});

function selectFn(fn) {
  state.fn = fn; state.probe = fn.challenge.x0; meter.reset();
  g.setView(fn.view);
  shell.award(`explore:${fn.id}`, 5);
  markExplored(fn.id);
  render();
  pushUrl();
}

const explored = new Set(['exp']);
function markExplored(id) {
  explored.add(id);
  if (explored.size === FUNCTIONS.length) shell.badge('explorer', 'Explorer', 'Tried every function', '🧭');
}

document.getElementById('reset').onclick = () => { state.N = 1; terms.set(1); render(); pushUrl(); };

ticker('build', {
  intervalMs: 260,
  playLabel: '▸ Animate build',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.N = 0; terms.set(0); render(); pushUrl(); },
  onTick: () => {
    if (state.N >= MAX_TERMS) return false;
    state.N++; terms.set(state.N); render();
    pushUrl();
  },
});

const gc = document.getElementById('graph');
let dragging = false;
function setProbe(clientX) {
  const r = gc.getBoundingClientRect();
  let x = g.ux(clientX - r.left);
  x = Math.max(state.fn.view.xmin + 0.02, Math.min(state.fn.view.xmax - 0.02, x));
  state.probe = x; render();
  pushUrl();
}
gc.addEventListener('pointerdown', e => { dragging = true; gc.setPointerCapture(e.pointerId); setProbe(e.clientX); });
gc.addEventListener('pointermove', e => { if (dragging) setProbe(e.clientX); });
gc.addEventListener('pointerup', () => dragging = false);
gc.addEventListener('pointercancel', () => dragging = false);

keyboardControl(gc, {
  nudge: (dx, dy, big) => {
    const view = state.fn.view;
    const d = (big ? 0.4 : 0.1) * (view.xmax - view.xmin);
    state.probe = Math.max(view.xmin + 0.02, Math.min(view.xmax - 0.02, state.probe + dx * d));
    render(); pushUrl();
  },
  step: (delta, big) => {
    state.N = Math.max(0, Math.min(MAX_TERMS, state.N + delta * (big ? 3 : 1)));
    terms.set(state.N);
    render(); pushUrl();
  },
});

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

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.fn) {
    const fn = FUNCTIONS.find(f => f.id === st.fn);
    if (fn) {
      state.fn = fn;
      fnButtons.select(FUNCTIONS.indexOf(fn), { notify: false });
      g.setView(fn.view);
      state.probe = fn.challenge.x0;
    }
  }
  if (typeof st.N === 'number') { state.N = st.N; terms.set(st.N); }
  if (typeof st.probe === 'number') state.probe = st.probe;
  meter.reset();
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ fn: state.fn.id, N: state.N, probe: state.probe });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'taylor-series', onJump: applyState, links: neighbours('taylor-series') });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

document.getElementById('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
