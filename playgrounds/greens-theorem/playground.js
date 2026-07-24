import { VectorFieldView, circulation, curlFlux, curlAt } from '../../engine/vector-field.js';
import { isoSegments } from '../../engine/contour-map.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { FIELDS, curlGrid, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "Green's theorem" ---- */

const DOMAIN = 2;
const CANCEL_TOL = 0.12;      // |∮F·dr| below this counts as cancelled
const URL_SCHEMA = { field: 'string', x: 'number', y: 'number', r: 'number' };
const CURL_GRID = 72;         // resolution used to trace the curl = 0 locus
const START = { x: 0.8, y: 0.6, r: 0.7 };

const view = new VectorFieldView(document.getElementById('field'));
const shell = new ScoreShell(createConfetti(), { slug: 'greens-theorem' });
const state = { field: null, x: START.x, y: START.y, r: START.r };

const explored = new Set();

const meter = challengeMeter({
  format: v => v.toFixed(3),
  formatTol: t => t.toFixed(2),
  progress: linearProgress(8),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.field.id}`, 75);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Perfectly balanced', fresh
      ? 'Positive and negative curl cancel · +75'
      : 'Cancelled again', '⚖️');
    shell.badge('cancel', 'Zero Net Spin', 'Cancelled a loop’s circulation', '🔄');
  },
});

function useField(fd) {
  state.field = { ...fd, a: DOMAIN };
  state.x = START.x; state.y = START.y;
  view.setField(state.field);
  meter.reset();
}
useField(FIELDS[0]);
explored.add(FIELDS[0].id);

const fieldButtons = buttonGroup('fbtns', FIELDS, fd => {
  useField(fd);
  shell.award(`explore:${fd.id}`, 5);
  explored.add(fd.id);
  if (explored.size === FIELDS.length) shell.badge('explorer', 'Circuit Rider', 'Tested every field', '🗺️');
  render();
  pushUrl();
});

const radius = slider('radius', {
  onInput: v => { state.r = v; render(); pushUrl(); },
});

s('reset').onclick = () => { state.x = START.x; state.y = START.y; state.r = START.r; radius.set(START.r); meter.reset(); render(); pushUrl(); };

/* drag the loop */
const cv = document.getElementById('field');
let dragging = false;
function moveLoop(clientX, clientY) {
  const b = cv.getBoundingClientRect();
  state.x = Math.max(-DOMAIN, Math.min(DOMAIN, view.ux(clientX - b.left)));
  state.y = Math.max(-DOMAIN, Math.min(DOMAIN, view.uy(clientY - b.top)));
  render();
  pushUrl();
}
cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); moveLoop(e.clientX, e.clientY); });
cv.addEventListener('pointermove', e => { if (dragging) moveLoop(e.clientX, e.clientY); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

keyboardControl(cv, {
  nudge: (dx, dy, big) => {
    const d = (big ? 0.2 : 0.05) * DOMAIN;
    state.x = Math.max(-DOMAIN, Math.min(DOMAIN, state.x + dx * d));
    state.y = Math.max(-DOMAIN, Math.min(DOMAIN, state.y + dy * d));
    render(); pushUrl();
  },
  step: (delta, big) => {
    const d = (big ? 0.1 : 0.02) * delta;
    state.r = Math.max(0.2, Math.min(1.4, state.r + d));
    radius.set(state.r);
    render(); pushUrl();
  },
});

view.onresize = render;

/** Tint the disc by the sign of the curl inside it, so cancellation is visible
 *  as red and blue patches balancing rather than only as a number. */
function shadeInterior(fd, cx, cy, r) {
  const c = view.ctx;
  const px = view.sx(cx), py = view.sy(cy);
  const pr = Math.abs(view.sx(cx + r) - px);
  c.save();
  c.beginPath(); c.arc(px, py, pr, 0, 7); c.clip();

  const n = 26, step = (2 * r) / n;
  let peak = 1e-9;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = Math.abs(fd.curl(cx - r + (i + 0.5) * step, cy - r + (j + 0.5) * step));
      if (v > peak) peak = v;
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = cx - r + (i + 0.5) * step, y = cy - r + (j + 0.5) * step;
      const t = Math.max(-1, Math.min(1, fd.curl(x, y) / peak));
      c.fillStyle = t >= 0
        ? `rgba(61,242,192,${0.10 + 0.40 * t})`
        : `rgba(255,93,115,${0.10 + 0.40 * -t})`;
      const sx0 = view.sx(x - step / 2), sy0 = view.sy(y + step / 2);
      c.fillRect(sx0, sy0, Math.abs(view.sx(x + step / 2) - sx0) + 1,
        Math.abs(view.sy(y - step / 2) - sy0) + 1);
    }
  }
  c.restore();
}

/** The curl = 0 locus, traced from the field itself by marching squares so it
 *  can never drift out of step with the declared description. */
function drawZeroCurl(fd) {
  const z = curlGrid(fd, DOMAIN, CURL_GRID);
  const segs = isoSegments(z, 0);
  if (!segs.length) return;
  const c = view.ctx;
  const w = gi => view.sx(-DOMAIN + 2 * DOMAIN * gi / CURL_GRID);
  const h = gj => view.sy(-DOMAIN + 2 * DOMAIN * gj / CURL_GRID);
  c.save();
  c.strokeStyle = getCSS('--gold'); c.lineWidth = 1.5; c.setLineDash([6, 5]); c.globalAlpha = 0.75;
  c.beginPath();
  for (const [p, q] of segs) { c.moveTo(w(p[0]), h(p[1])); c.lineTo(w(q[0]), h(q[1])); }
  c.stroke(); c.restore();
}

function render() {
  const fd = state.field, { x, y, r } = state;

  view.clear();
  view.axes();
  shadeInterior(fd, x, y, r);
  view.arrows(15);
  drawZeroCurl(fd);

  // the loop itself, drawn counter-clockwise with a direction marker
  const c = view.ctx;
  const px = view.sx(x), py = view.sy(y), pr = Math.abs(view.sx(x + r) - px);
  c.save();
  c.strokeStyle = getCSS('--gold'); c.lineWidth = 3;
  c.shadowColor = getCSS('--gold'); c.shadowBlur = 10;
  c.beginPath(); c.arc(px, py, pr, 0, 7); c.stroke();
  c.restore();
  view.dot(x, y, getCSS('--gold'), 4);

  const line = circulation(fd, x, y, r);
  const area = curlFlux(fd, x, y, r);
  const gap = Math.abs(line - area);

  s('line-val').textContent = fmt(line);
  s('area-val').textContent = fmt(area);
  s('gap-val').textContent = gap.toExponential(1);
  s('rad-val').textContent = fmt(r);
  s('note').textContent = fd.note;
  s('readout').innerHTML =
    `loop at (<b>${fmt(x)}</b>, <b>${fmt(y)}</b>), r = <b>${fmt(r)}</b>` +
    ` &nbsp;·&nbsp; ∮ F·dr = <span class="pd">${fmt(line)}</span>` +
    ` &nbsp;·&nbsp; ∬ curl dA = <span class="pd">${fmt(area)}</span>` +
    ` &nbsp;·&nbsp; curl at centre = <b>${fmt(curlAt(fd, x, y))}</b>`;

  if (!fd.zeroLine) {
    meter.update({
      value: 9, tol: CANCEL_TOL,
      goal: `<b>Curl is zero everywhere here.</b> ${fd.note}. Every loop you can draw has zero circulation — that is what "conservative" means, and Green's theorem makes it obvious.`,
      solvedText: '',
      hintText: 'Nothing to balance on this field — try one whose curl changes sign.',
    });
  } else {
    meter.update({
      value: Math.abs(line), tol: CANCEL_TOL,
      goal: `Place the loop so the spin cancels — <b>∮ F·dr = 0</b>. Straddle ${fd.zeroLine} (dashed) so the green and red areas balance.`,
      solvedText: `✓ Cancelled — equal spin each way, so the boundary integral is zero.`,
      hintText: 'Straddle the dashed line so the green and red patches balance.',
    });
  }
}

render();

mountNav('greens-theorem');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.field) {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) { useField(fd); fieldButtons.select(FIELDS.indexOf(fd), { notify: false }); }
  }
  if (typeof st.x === 'number') state.x = st.x;
  if (typeof st.y === 'number') state.y = st.y;
  if (typeof st.r === 'number') { state.r = st.r; radius.set(st.r); }
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ field: state.field.id, x: state.x, y: state.y, r: state.r });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'greens-theorem', onJump: applyState });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
