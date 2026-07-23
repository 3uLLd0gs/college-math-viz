import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, logProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { FUNCTIONS, secantSlope, slopeError, clampProbe, clampStep, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "secant → tangent" ---- */

const TOL = 0.02;          // |secant − tangent| that clears the challenge
const LOG_H_MIN = -3;      // h ranges over 10^-3 … 10^0.301, i.e. 0.001 … 2
const LOG_H_MAX = Math.log10(2);
const URL_SCHEMA = { fn: 'string', x0: 'number', h: 'number' };

const g = new Grapher2D(document.getElementById('graph'));
const shell = new ScoreShell(createConfetti(), { slug: 'secant-tangent' });
const state = { fn: FUNCTIONS[0], x0: FUNCTIONS[0].probe, logH: LOG_H_MAX };
g.setView(state.fn.view);

const explored = new Set([FUNCTIONS[0].id]);

const meter = challengeMeter({
  format: v => v.toExponential(2),
  formatTol: t => t.toExponential(0),
  // Error falls by orders of magnitude as h shrinks, so a linear bar would sit
  // pinned at one end for most of the journey.
  progress: logProgress(5),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.fn.id}`, 70);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Tangent reached!', fresh
      ? `Secant slope ≈ f′(x₀) at h = ${fmtH(h())} · +70`
      : 'Secant slope ≈ f′(x₀) again', '📉');
    shell.badge('limit', 'The Limit', 'Watched a secant become a tangent', '📐');
  },
});

const h = () => Math.pow(10, state.logH);
const fmtH = v => (v >= 0.01 ? v.toFixed(3) : v.toExponential(1));

const fnButtons = buttonGroup('fbtns', FUNCTIONS, fn => {
  state.fn = fn;
  state.x0 = fn.probe;
  state.logH = LOG_H_MAX;
  hSlider.set(LOG_H_MAX);
  g.setView(fn.view);
  meter.reset();
  shell.award(`explore:${fn.id}`, 5);
  explored.add(fn.id);
  if (explored.size === FUNCTIONS.length) shell.badge('explorer', 'Curve Sampler', 'Tried every function', '🧭');
  render();
  pushUrl();
});

const hSlider = slider('h', {
  onInput: v => { state.logH = v; render(); pushUrl(); },
});

s('reset').onclick = () => {
  state.x0 = state.fn.probe; state.logH = LOG_H_MAX;
  hSlider.set(LOG_H_MAX); meter.reset(); render();
  pushUrl();
};

ticker('shrink', {
  intervalMs: 55,
  playLabel: '▸ Shrink h → 0',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.logH = LOG_H_MAX; hSlider.set(LOG_H_MAX); render(); pushUrl(); },
  onTick: () => {
    if (state.logH <= LOG_H_MIN + 1e-9) return false;
    state.logH = Math.max(LOG_H_MIN, state.logH - 0.035);
    hSlider.set(state.logH); render();
    pushUrl();
  },
});

/* drag along the curve to move the tangent point */
const cv = document.getElementById('graph');
let dragging = false;
function moveProbe(clientX) {
  const r = cv.getBoundingClientRect();
  state.x0 = clampProbe(state.fn, g.ux(clientX - r.left));
  render();
  pushUrl();
}
cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); moveProbe(e.clientX); });
cv.addEventListener('pointermove', e => { if (dragging) moveProbe(e.clientX); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

keyboardControl(cv, {
  nudge: (dx, dy, big) => {
    const view = state.fn.view;
    const d = (big ? 0.4 : 0.1) * (view.xmax - view.xmin);
    state.x0 = clampProbe(state.fn, state.x0 + dx * d);
    render(); pushUrl();
  },
  step: (delta, big) => {
    state.logH = Math.max(LOG_H_MIN, Math.min(LOG_H_MAX, state.logH + delta * (big ? 0.3 : 0.1)));
    hSlider.set(state.logH);
    render(); pushUrl();
  },
});

g.onresize = render;

/** Straight line through (px, py) with the given slope, spanning the view. */
function drawLine(px, py, slope, opts) {
  g.plot(x => py + slope * (x - px), opts);
}

function render() {
  const fn = state.fn, x0 = state.x0;
  const step = clampStep(fn, x0, h());
  const y0 = fn.f(x0), y1 = fn.f(x0 + step);
  const mSec = secantSlope(fn, x0, step);
  const mTan = fn.df(x0);
  const err = Math.abs(mSec - mTan);

  g.clear(); g.grid();

  // tangent first, so the secant lands on top of it as it converges
  drawLine(x0, y0, mTan, { color: getCSS('--error'), width: 2, dash: [7, 5] });
  g.plot(x => fn.f(x), { color: getCSS('--true'), width: 2.6 });
  drawLine(x0, y0, mSec, { color: getCSS('--approx'), width: 2.4, glow: 8 });

  // the run/rise triangle that the quotient literally measures
  const c = g.ctx;
  c.save();
  c.strokeStyle = getCSS('--accent'); c.globalAlpha = 0.75; c.lineWidth = 1.4; c.setLineDash([4, 4]);
  c.beginPath();
  c.moveTo(g.sx(x0), g.sy(y0)); c.lineTo(g.sx(x0 + step), g.sy(y0));
  c.lineTo(g.sx(x0 + step), g.sy(y1)); c.stroke();
  c.restore();

  g.dot(x0, y0, getCSS('--gold'));
  g.dot(x0 + step, y1, getCSS('--approx'));

  drawInset(fn, x0, mTan);

  s('h-val').textContent = fmtH(step);
  s('sec-val').textContent = fmt(mSec);
  s('tan-val').textContent = fmt(mTan);
  s('readout').innerHTML =
    `x₀ = <b>${fmt(x0)}</b>, h = <b>${fmtH(step)}</b>` +
    ` &nbsp;·&nbsp; <span class="pd">[f(x₀+h) − f(x₀)] / h = ${fmt(mSec)}</span>` +
    ` &nbsp;·&nbsp; f′(x₀) = <b>${fmt(mTan)}</b>` +
    ` &nbsp;·&nbsp; gap = <b class="er">${err.toExponential(2)}</b>`;

  meter.update({
    value: err, tol: TOL,
    goal: `Shrink <b>h</b> until the secant through the two dots becomes the tangent — until the quotient reaches <b>f′(x₀) = ${fmt(mTan)}</b>.`,
    solvedText: `✓ At h = ${fmtH(step)} the secant is the tangent, to within ${TOL}.`,
    hintText: 'Slide h down — the second dot walks back toward the first.',
  });
}

/** Inset: the difference quotient against h on a log axis, flattening onto
 *  f′(x₀) as h → 0. This is the limit itself, plotted. */
function drawInset(fn, x0, mTan) {
  const cvI = s('inset'), ctx = cvI.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const w = cvI.clientWidth, hh = cvI.clientHeight;
  cvI.width = w * dpr; cvI.height = hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hh);

  const pad = 6;
  const samples = [];
  for (let k = 0; k <= 120; k++) {
    const lg = LOG_H_MIN + (LOG_H_MAX - LOG_H_MIN) * k / 120;
    const st = clampStep(fn, x0, Math.pow(10, lg));
    samples.push([lg, secantSlope(fn, x0, st)]);
  }
  const vals = samples.map(p => p[1]).filter(Number.isFinite).concat(mTan);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, 1e-6);
  const SX = lg => pad + (lg - LOG_H_MIN) / (LOG_H_MAX - LOG_H_MIN) * (w - 2 * pad);
  const SY = v => pad + (hi - v) / span * (hh - 2 * pad);

  // the limit the quotient is heading for
  ctx.strokeStyle = getCSS('--error'); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(pad, SY(mTan)); ctx.lineTo(w - pad, SY(mTan)); ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = getCSS('--approx'); ctx.lineWidth = 2; ctx.beginPath();
  samples.forEach(([lg, v], i) => (i ? ctx.lineTo(SX(lg), SY(v)) : ctx.moveTo(SX(lg), SY(v))));
  ctx.stroke();

  const cur = clampStep(fn, x0, h());
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(SX(Math.log10(cur)), SY(secantSlope(fn, x0, cur)), 3.6, 0, 7);
  ctx.fill();
}

render();

mountNav('secant-tangent');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.fn) {
    const fn = FUNCTIONS.find(f => f.id === st.fn);
    if (fn) {
      state.fn = fn;
      fnButtons.select(FUNCTIONS.indexOf(fn), { notify: false });
      g.setView(fn.view);
      state.x0 = fn.probe;
    }
  }
  if (typeof st.x0 === 'number') state.x0 = clampProbe(state.fn, st.x0);
  if (typeof st.h === 'number') {
    state.logH = Math.max(LOG_H_MIN, Math.min(LOG_H_MAX, Math.log10(st.h)));
    hSlider.set(state.logH);
  }
  meter.reset();
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ fn: state.fn.id, x0: state.x0, h: Math.pow(10, state.logH) });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'secant-tangent', onJump: applyState });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
