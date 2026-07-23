import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { TRACES, TWO_PI, MAX_ANGLE, wrap, valueAt, missBy, solutionsHit, deg, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "unit circle unwrap" ----
   The circle and the wave share ONE canvas and, crucially, ONE vertical scale:
   the radius of the circle is exactly the height of value 1 on the graph. That
   is what makes the connector line read as an unwrapping rather than as two
   unrelated pictures side by side. */

const HIT_TOL = 0.02;     // |value − target| that clears the challenge
const START = 0.35;       // opening angle: away from every solution
const URL_SCHEMA = { trace: 'string', deg: 'number' };

const cv = document.getElementById('scene');
const ctx = cv.getContext('2d');
const shell = new ScoreShell(createConfetti(), { slug: 'unit-circle' });
const state = { trace: TRACES[0], theta: START, visited: [START] };

const explored = new Set([TRACES[0].id]);

const meter = challengeMeter({
  format: v => (v === Infinity ? '—' : v.toFixed(3)),
  formatTol: t => t.toFixed(2),
  progress: linearProgress(10),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.trace.id}`, 60);
    shell.hitStreak(); shell.celebrate();
    shell.toast('On target', fresh
      ? `${state.trace.tex} = ${state.trace.targetTex} at ${deg(wrap(state.theta)).toFixed(0)}° · +60`
      : 'On target again', '🎯');
    shell.badge('angle', 'Angle Finder', 'Hit an exact trig value', '📐');
  },
});

const traceButtons = buttonGroup('fbtns', TRACES, t => {
  state.trace = t;
  state.theta = START;
  state.visited = [START];
  dial.set(deg(START));
  meter.reset();
  shell.award(`explore:${t.id}`, 5);
  explored.add(t.id);
  if (explored.size === TRACES.length) shell.badge('explorer', 'Circle Rider', 'Unwrapped all three', '🧭');
  render();
  pushUrl();
});

const dial = slider('theta', {
  onInput: d => { setTheta(d * Math.PI / 180); render(); pushUrl(); },
});

function setTheta(t) {
  state.theta = Math.max(0, Math.min(MAX_ANGLE, t));
  state.visited.push(state.theta);
  if (state.visited.length > 4000) state.visited = state.visited.slice(-2000);
}

s('reset').onclick = () => {
  state.theta = START; state.visited = [START];
  dial.set(deg(START)); meter.reset(); render();
  pushUrl();
};

ticker('sweep', {
  intervalMs: 26,
  playLabel: '▸ Sweep the angle',
  pauseLabel: '⏸ Pause',
  onStart: () => { setTheta(0); dial.set(0); render(); pushUrl(); },
  onTick: () => {
    if (state.theta >= MAX_ANGLE - 1e-9) return false;
    setTheta(state.theta + 0.035);
    dial.set(deg(state.theta));
    render();
    pushUrl();
  },
});

/* drag anywhere on the circle pane to set the angle */
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); dragging = true; grab(e); });
cv.addEventListener('pointermove', e => { if (dragging) grab(e); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });
let dragging = false;

function grab(e) {
  const b = cv.getBoundingClientRect();
  const L = layout();
  const x = e.clientX - b.left, y = e.clientY - b.top;
  if (x > L.split) return;                       // only the circle pane drags
  const a = Math.atan2(L.cy - y, x - L.ccx);
  // keep the turn the student is already on, so dragging past 360° continues
  const turn = Math.floor(state.theta / TWO_PI);
  let next = wrap(a) + turn * TWO_PI;
  if (next - state.theta > Math.PI) next -= TWO_PI;
  if (state.theta - next > Math.PI) next += TWO_PI;
  setTheta(next);
  render();
  pushUrl();
}

/** Geometry of the two panes, recomputed each frame so resizing just works. */
function layout() {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.parentElement.getBoundingClientRect().width;
  const H = cv.parentElement.getBoundingClientRect().height;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = 18;
  const circleW = Math.min(W * 0.40, H - pad * 2);
  // Radius is bounded by TWO things: the width of the circle pane, and the
  // height the graph needs, since value `range` must fit in half the canvas at
  // the same scale. Taking the smaller keeps the shared scale honest.
  const R = Math.min((circleW - pad * 2) / 2, (H / 2 - pad) / state.trace.range);
  const ccx = pad + circleW / 2, cy = H / 2;
  const split = pad + circleW + 8;
  return { W, H, pad, R, ccx, cy, split, graphW: W - split - pad };
}

function render() {
  const L = layout();
  const tr = state.trace, th = state.theta;
  ctx.clearRect(0, 0, L.W, L.H);

  // shared vertical scale: value 1 is exactly one circle radius
  const vy = v => L.cy - v * L.R;
  const gx = a => L.split + (a / MAX_ANGLE) * L.graphW;

  /* ---- left pane: the unit circle ---- */
  ctx.save();
  ctx.strokeStyle = getCSS('--grid'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L.ccx - L.R * 1.3, L.cy); ctx.lineTo(L.ccx + L.R * 1.3, L.cy);
  ctx.moveTo(L.ccx, L.cy - L.R * 1.3); ctx.lineTo(L.ccx, L.cy + L.R * 1.3); ctx.stroke();
  ctx.strokeStyle = getCSS('--line'); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(L.ccx, L.cy, L.R, 0, TWO_PI); ctx.stroke();
  ctx.restore();

  const px = L.ccx + Math.cos(th) * L.R, py = L.cy - Math.sin(th) * L.R;

  // the swept sector, so the angle itself is visible as an amount
  ctx.save();
  ctx.fillStyle = 'rgba(122,162,255,.13)';
  ctx.beginPath(); ctx.moveTo(L.ccx, L.cy);
  ctx.arc(L.ccx, L.cy, L.R * 0.34, 0, -wrap(th), true);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // the leg this trace reads off the circle
  ctx.save();
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  if (tr.id === 'cos') {
    ctx.strokeStyle = getCSS('--approx');
    ctx.beginPath(); ctx.moveTo(L.ccx, py); ctx.lineTo(px, py); ctx.stroke();
  } else {
    ctx.strokeStyle = getCSS('--approx');
    ctx.beginPath(); ctx.moveTo(px, L.cy); ctx.lineTo(px, py); ctx.stroke();
  }
  ctx.restore();

  // the radius
  ctx.save();
  ctx.strokeStyle = getCSS('--gold'); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(L.ccx, L.cy); ctx.lineTo(px, py); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.shadowColor = getCSS('--gold'); ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
  ctx.restore();

  /* ---- right pane: the unwrapped curve ---- */
  ctx.save();
  ctx.strokeStyle = getCSS('--grid'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L.split, L.cy); ctx.lineTo(L.split + L.graphW, L.cy); ctx.stroke();
  // a tick every quarter turn
  ctx.fillStyle = getCSS('--muted'); ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let k = 0; k <= 8; k++) {
    const a = k * Math.PI / 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(gx(a), L.cy - L.R * tr.range); ctx.lineTo(gx(a), L.cy + L.R * tr.range); ctx.stroke();
    ctx.globalAlpha = 1;
    if (k % 2 === 0 && k) ctx.fillText(`${k / 2}π`, gx(a), L.cy + 5);
  }
  ctx.restore();

  // the target level the challenge asks for
  ctx.save();
  ctx.strokeStyle = getCSS('--error'); ctx.setLineDash([5, 5]); ctx.lineWidth = 1.3; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(L.split, vy(tr.target)); ctx.lineTo(L.split + L.graphW, vy(tr.target)); ctx.stroke();
  ctx.restore();

  // the curve, drawn only as far as the angle has been swept
  ctx.save();
  ctx.strokeStyle = getCSS('--true'); ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
  ctx.shadowColor = getCSS('--true'); ctx.shadowBlur = 6;
  ctx.beginPath();
  let pen = false;
  const steps = 900;
  for (let i = 0; i <= steps; i++) {
    const a = th * i / steps;
    const v = valueAt(tr, a);
    if (v === null || Math.abs(v) > tr.range) { pen = false; continue; }
    const X = gx(a), Y = vy(v);
    pen ? ctx.lineTo(X, Y) : (ctx.moveTo(X, Y), pen = true);
  }
  ctx.stroke(); ctx.restore();

  // the connector: the circle's leg carried across to the curve
  const v = valueAt(tr, th);
  if (v !== null && Math.abs(v) <= tr.range) {
    ctx.save();
    ctx.strokeStyle = getCSS('--approx'); ctx.globalAlpha = 0.5;
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tr.id === 'cos' ? L.ccx : px, vy(v));
    ctx.lineTo(gx(th), vy(v));
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#fff'; ctx.shadowColor = getCSS('--approx'); ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(gx(th), vy(v), 5, 0, 7); ctx.fill();
    ctx.fillStyle = getCSS('--approx');
    ctx.beginPath(); ctx.arc(gx(th), vy(v), 2.4, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ---- panel ---- */
  const dTh = deg(state.theta);
  s('theta-val').textContent = dTh.toFixed(0) + '°';
  s('rad-val').textContent = (state.theta / Math.PI).toFixed(2) + 'π';
  s('val-val').textContent = v === null ? 'undefined' : fmt(v);
  s('sin-val').textContent = fmt(Math.sin(th));
  s('cos-val').textContent = fmt(Math.cos(th));
  s('reads').textContent = tr.reads;
  s('readout').innerHTML =
    `θ = <b>${dTh.toFixed(1)}°</b> = <b>${(state.theta / Math.PI).toFixed(2)}π</b>` +
    ` &nbsp;·&nbsp; ${tr.tex} = <span class="pd">${v === null ? 'undefined' : fmt(v)}</span>` +
    ` &nbsp;·&nbsp; the point sits at (<b>${fmt(Math.cos(th))}</b>, <b>${fmt(Math.sin(th))}</b>)`;

  const found = solutionsHit(tr, state.visited);
  s('found-val').textContent = `${found.length} / ${tr.solutions.length}`;
  if (found.length === tr.solutions.length) {
    shell.badge(`all-${tr.id}`, 'Every Answer', `Found all ${tr.solutions.length} angles for ${tr.tex}`, '🔁');
  }

  meter.update({
    value: missBy(tr, th), tol: HIT_TOL,
    goal: `Turn the angle until <b>${tr.tex} = ${tr.targetTex}</b> — the dashed line. There is more than one answer.`,
    solvedText: `✓ ${tr.tex} = ${tr.targetTex} at θ = ${dTh.toFixed(0)}°. Keep going — the curve repeats.`,
    hintText: 'Drag the radius, or sweep, until the curve meets the dashed line.',
  });
}

render();
window.addEventListener('resize', render);

mountNav('unit-circle');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.trace) {
    const t = TRACES.find(x => x.id === st.trace);
    if (t) {
      state.trace = t;
      traceButtons.select(TRACES.indexOf(t), { notify: false });
      state.visited = [];
      meter.reset();
    }
  }
  if (typeof st.deg === 'number') {
    setTheta(st.deg * Math.PI / 180);
    dial.set(st.deg);
  }
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ trace: state.trace.id, deg: state.theta * 180 / Math.PI });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'unit-circle', onJump: applyState });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
