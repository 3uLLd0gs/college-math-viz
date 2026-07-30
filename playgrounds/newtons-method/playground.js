import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav, neighbours } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt, mountPresenter } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, logProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams, syncedUrl } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { FUNCTIONS, newtonRun, nearestRoot, LESSON } from './content.js';

const MAX_N = 12;   // must match the #n slider max in index.html
const URL_SCHEMA = { fn: 'string', x0: 'number', n: 'number' };

const g = new Grapher2D(document.getElementById('graph'));
const shell = new ScoreShell(createConfetti(), { slug: 'newtons-method' });
const state = { fn: FUNCTIONS[0], x0: FUNCTIONS[0].start, n: 0 };
g.setView(state.fn.view);

const explored = new Set([FUNCTIONS[0].id]);

const meter = challengeMeter({
  format: v => v.toExponential(2),
  formatTol: t => t.toExponential(0),
  progress: logProgress(5),
  onSolve: () => {
    const bonus = Math.max(10, 60 - 6 * state.n);
    const fresh = shell.award(`solve:${state.fn.id}`, 40 + bonus);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Root found!', fresh
      ? `|f(xₙ)| below target in ${state.n} step${state.n === 1 ? '' : 's'} · +${40 + bonus}`
      : 'On target again', '🎯');
    if (state.n <= 4) shell.badge('fast', 'Quadratic', 'Reached a root in ≤ 4 steps', '⚡');
    shell.badge('root', 'Root Finder', 'Cleared a Newton challenge', '🎯');
  },
});

function clampX0(x) { return Math.max(state.fn.view.xmin + 0.1, Math.min(state.fn.view.xmax - 0.1, x)); }

const fnButtons = buttonGroup('fbtns', FUNCTIONS, fn => {
  state.fn = fn; state.x0 = fn.start; state.n = 0;
  nSlider.set(0); g.setView(fn.view); meter.reset();
  shell.award(`explore:${fn.id}`, 5);
  explored.add(fn.id);
  if (explored.size === FUNCTIONS.length) shell.badge('explorer', 'Solver', 'Tried every function', '🧭');
  render(); pushUrl();
});

const nSlider = slider('n', {
  onInput: v => {
    state.n = v;
    if (state.n === MAX_N) shell.badge('patient', 'Full Run', `Iterated ${MAX_N} steps`, '♾️');
    render(); pushUrl();
  },
});

s('reset').onclick = () => { state.x0 = state.fn.start; state.n = 0; nSlider.set(0); meter.reset(); render(); pushUrl(); };

ticker('iterate', {
  intervalMs: 260,
  playLabel: '▸ Iterate → root',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.n = 0; nSlider.set(0); render(); pushUrl(); },
  onTick: () => {
    if (state.n >= MAX_N) return false;
    state.n++; nSlider.set(state.n); render();
    pushUrl();
  },
});

g.onresize = render;

keyboardControl(document.getElementById('graph'), {
  nudge: (dx, _dy, big) => { state.x0 = clampX0(state.x0 + dx * (big ? 0.25 : 0.05)); state.n = 0; nSlider.set(0); render(); pushUrl(); },
  step: (delta, big) => { state.n = Math.max(0, Math.min(MAX_N, state.n + delta * (big ? 3 : 1))); nSlider.set(state.n); render(); pushUrl(); },
  home: () => { state.x0 = state.fn.start; state.n = 0; nSlider.set(0); render(); pushUrl(); },
});

// drag along x to set the starting point
let dragging = false;
const graph = document.getElementById('graph');
const setFromEvent = e => {
  const r = graph.getBoundingClientRect();
  state.x0 = clampX0(g.ux(e.clientX - r.left));
  state.n = 0; nSlider.set(0); render(); pushUrl();
};
graph.addEventListener('pointerdown', e => { dragging = true; graph.setPointerCapture(e.pointerId); setFromEvent(e); });
graph.addEventListener('pointermove', e => { if (dragging) setFromEvent(e); });
graph.addEventListener('pointerup', e => { dragging = false; graph.releasePointerCapture(e.pointerId); });

function statusWord(seq, xn) {
  const flung = seq.length < state.n + 1;
  if (flung) return 'flung — the tangent was nearly flat';
  if (state.n >= 4 && seq.length >= 5) {
    const a = seq[seq.length - 1], b = seq[seq.length - 2];   // adjacent iterates alternate in a period-2 cycle
    if (Math.abs(a - b) > 0.3 && Math.abs(state.fn.f(xn)) > 0.1) return 'cycling — it loops without converging';
  }
  if (Math.abs(state.fn.f(xn)) < state.fn.challenge.tol) return 'converged';
  return 'converging';
}

function render() {
  const { fn, x0, n } = state;
  const seq = newtonRun(fn, x0, n);
  const xn = seq[seq.length - 1];
  const flung = seq.length < n + 1;

  g.clear(); g.grid();
  for (const r of fn.roots) g.dot(r, 0, getCSS('--muted'));
  g.plot(x => fn.f(x), { color: getCSS('--true'), width: 2.6, glow: 6 });

  const c = g.ctx;
  // iteration path: tangent segment from (xi, f(xi)) to (x_{i+1}, 0), then a drop to the curve
  c.save();
  for (let i = 0; i < seq.length - 1; i++) {
    const xi = seq[i], yi = fn.f(xi), xnext = seq[i + 1];
    c.strokeStyle = getCSS('--error'); c.globalAlpha = 0.85; c.lineWidth = 1.6; c.setLineDash([6, 4]);
    c.beginPath(); c.moveTo(g.sx(xi), g.sy(yi)); c.lineTo(g.sx(xnext), g.sy(0)); c.stroke();
    c.globalAlpha = 0.4; c.setLineDash([2, 3]);
    c.beginPath(); c.moveTo(g.sx(xnext), g.sy(0)); c.lineTo(g.sx(xnext), g.sy(fn.f(xnext))); c.stroke();
  }
  c.restore();
  for (let i = 0; i < seq.length; i++) g.dot(seq[i], fn.f(seq[i]), getCSS('--approx'));
  g.dot(x0, fn.f(x0), getCSS('--gold'));
  if (Number.isFinite(xn)) g.dot(xn, 0, getCSS('--gold'));

  const err = Math.abs(fn.f(xn));
  s('n-val').textContent = String(n);
  s('xn-val').textContent = flung ? '∞' : fmt(xn);
  s('err-val').textContent = flung ? '—' : err.toExponential(2);
  const status = statusWord(seq, xn);
  s('readout').innerHTML =
    `f(x) = <b>${fn.tex}</b> &nbsp;·&nbsp; start x₀ = <b>${fmt(x0)}</b>` +
    ` &nbsp;·&nbsp; after ${n} step${n === 1 ? '' : 's'}: x${n === 0 ? '₀' : 'ₙ'} = <span class="pd">${flung ? '∞' : fmt(xn)}</span>` +
    ` &nbsp;·&nbsp; |f(xₙ)| = <b class="er">${flung ? '∞' : err.toExponential(2)}</b> &nbsp;·&nbsp; <b>${status}</b>`;

  drawInset(seq);

  const solvable = !flung;
  meter.update({
    value: flung ? 9e9 : err, tol: fn.challenge.tol,
    goal: `Iterate until the curve touches the axis — drive <b>|f(xₙ)|</b> below the target. This start heads for the root near <b>${fmt(nearestRoot(fn, xn))}</b>.`,
    solvedText: `✓ Root found — |f(xₙ)| ≈ ${flung ? '' : err.toExponential(1)} after ${n} steps.`,
    hintText: solvable ? 'Add steps — each tangent lands closer to the root.'
      : 'This start flings off a flat tangent — drag x₀ away from where f′ = 0.',
  });
}

function drawInset(seq) {
  const cv = s('inset'), ctx = cv.getContext('2d'); const dpr = devicePixelRatio || 1;
  const w = cv.clientWidth, hh = cv.clientHeight;
  cv.width = w * dpr; cv.height = hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hh);
  const pad = 8;
  const errs = seq.map(x => Math.max(Math.abs(state.fn.f(x)), 1e-16));
  const logs = errs.map(e => Math.log10(e));
  const kmax = Math.max(seq.length - 1, 1);
  const lo = Math.min(-16, ...logs), hi = Math.max(1, ...logs);
  const SX = k => pad + (k / kmax) * (w - 2 * pad);
  const SY = l => pad + (hi - l) / (hi - lo) * (hh - 2 * pad);
  // target line
  ctx.strokeStyle = getCSS('--error'); ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
  const tl = Math.log10(state.fn.challenge.tol);
  ctx.beginPath(); ctx.moveTo(pad, SY(tl)); ctx.lineTo(w - pad, SY(tl)); ctx.stroke(); ctx.setLineDash([]);
  // the |f(xk)| trace
  ctx.strokeStyle = getCSS('--approx'); ctx.lineWidth = 2; ctx.beginPath();
  logs.forEach((l, k) => (k ? ctx.lineTo(SX(k), SY(l)) : ctx.moveTo(SX(k), SY(l))));
  ctx.stroke();
  ctx.fillStyle = getCSS('--approx');
  logs.forEach((l, k) => { ctx.beginPath(); ctx.arc(SX(k), SY(l), 2.6, 0, 7); ctx.fill(); });
}

render();
mountNav('newtons-method');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.fn) {
    const fn = FUNCTIONS.find(f => f.id === st.fn);
    if (fn) { state.fn = fn; fnButtons.select(FUNCTIONS.indexOf(fn), { notify: false }); g.setView(fn.view); state.x0 = fn.start; }
  }
  if (typeof st.x0 === 'number') state.x0 = clampX0(st.x0);
  if (typeof st.n === 'number') { state.n = Math.max(0, Math.min(MAX_N, st.n)); nSlider.set(state.n); }
  meter.reset();
  render();
  pushUrl();
}

const urlState = () => ({ fn: state.fn.id, x0: state.x0, n: state.n });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'newtons-method', onJump: applyState, links: neighbours('newtons-method') });

const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()))}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};

mountPresenter();
