import { ContourMap } from '../../engine/contour-map.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { FIELDS, grad, gradMag, steepestAngle, directional, angleGap, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "gradient & directional derivative" ---- */

// Start the probe off-centre: every field except the plane has ∇f = 0 at the
// origin, where no direction is steepest and the challenge would be degenerate.
const START = { xf: 0.45, yf: -0.3 };
// Win when the dial is within this many degrees of straight uphill.
const ALIGN_TOL_DEG = 4;
// Below this |∇f| the field is effectively flat and "steepest ascent" is
// meaningless — the direction of a vanishing gradient is numerical noise, and
// letting the challenge clear there would award a win for aiming at nothing.
// steepestAngle() only returns null at exactly zero, which a dragged probe
// essentially never hits, so the playground needs its own floor.
const FLAT_EPS = 0.05;
// The keys a shareable gradient link may carry, with their types.
const URL_SCHEMA = { field: 'string', x: 'number', y: 'number', thetaDeg: 'number' };

const map = new ContourMap(document.getElementById('map'));
const shell = new ScoreShell(createConfetti(), { slug: 'gradient' });
const state = { field: FIELDS[0], x: 0, y: 0, theta: 0 };

const explored = new Set([FIELDS[0].id]);

const meter = challengeMeter({
  format: v => v.toFixed(1) + '°',
  formatTol: t => t.toFixed(0) + '°',
  progress: linearProgress(10),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.field.id}`, 60);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Steepest ascent!', fresh ? 'Dᵤf reached |∇f| · +60' : 'Dᵤf reached |∇f| again', '🧭');
    shell.badge('aligned', 'Uphill', 'Aligned the dial with the gradient', '⛰️');
  },
});

function placeProbe(fd) {
  state.x = fd.a * START.xf;
  state.y = fd.a * START.yf;
}
placeProbe(state.field);
map.setField(state.field);

const fieldButtons = buttonGroup('fbtns', FIELDS, fd => {
  state.field = fd;
  placeProbe(fd);
  map.setField(fd);
  meter.reset();
  shell.award(`explore:${fd.id}`, 5);
  explored.add(fd.id);
  if (explored.size === FIELDS.length) shell.badge('explorer', 'Surveyor', 'Mapped every field', '🗺️');
  render();
});

let dialTouched = false;
const dial = slider('theta', {
  onInput: deg => { state.theta = deg * Math.PI / 180; dialTouched = true; render(); pushUrl(); },
});

s('snap').onclick = () => {
  const best = steepestAngle(state.field, state.x, state.y);
  if (best === null) return;
  const deg = (best * 180 / Math.PI + 360) % 360;
  state.theta = deg * Math.PI / 180;
  dial.set(deg);
  shell.badge('cheat', 'Compass', 'Used snap-to-gradient at least once', '🧲');
  render();
  pushUrl();
};

s('reset').onclick = () => { placeProbe(state.field); meter.reset(); render(); pushUrl(); };

/* drag the probe around the map */
const cv = document.getElementById('map');
let dragging = false;
function moveProbe(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  const a = state.field.a;
  state.x = Math.max(-a, Math.min(a, map.ux(clientX - r.left)));
  state.y = Math.max(-a, Math.min(a, map.uy(clientY - r.top)));
  render();
  pushUrl();
}
cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); moveProbe(e.clientX, e.clientY); });
cv.addEventListener('pointermove', e => { if (dragging) moveProbe(e.clientX, e.clientY); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

map.onresize = render;

function render() {
  const fd = state.field, { x, y, theta } = state;

  map.clear();
  map.heat();
  map.contours(11);
  map.axes();

  const [gx, gy] = grad(fd, x, y);
  const mag = gradMag(fd, x, y);
  const best = steepestAngle(fd, x, y);
  const du = directional(fd, x, y, theta);

  // Scale arrows to the domain so they stay readable on every field.
  const unit = fd.a * 0.30;
  const gScale = mag > 1e-9 ? unit / mag : 0;

  // Gradient first, the student's own direction on top — otherwise the two
  // coincide at the moment of success and the mint arrow vanishes under it.
  if (mag > 1e-9) {
    map.arrow(x, y, x + gx * gScale, y + gy * gScale,
      { color: getCSS('--error'), width: 3.5, head: 12, dash: [7, 5] });
  }
  map.arrow(x, y, x + Math.cos(theta) * unit, y + Math.sin(theta) * unit,
    { color: getCSS('--approx'), width: 3, head: 11 });
  map.dot(x, y, getCSS('--gold'));

  drawDialInset(fd, x, y, theta, mag, best);

  const gapDeg = best === null ? null : angleGap(theta, best) * 180 / Math.PI;

  s('readout').innerHTML =
    `at (<b>${fmt(x)}</b>, <b>${fmt(y)}</b>) &nbsp;·&nbsp; ∇f = <b>(${fmt(gx)}, ${fmt(gy)})</b>` +
    ` &nbsp;·&nbsp; |∇f| = <b>${fmt(mag)}</b>` +
    ` &nbsp;·&nbsp; D<sub>u</sub>f = <span class="pd">${fmt(du)}</span>`;

  s('theta-val').textContent = ((theta * 180 / Math.PI) % 360).toFixed(0) + '°';
  s('du-val').textContent = fmt(du);
  s('mag-val').textContent = fmt(mag);

  if (best === null || mag < FLAT_EPS) {
    // ∇f ≈ 0: every direction is equally flat, so alignment is meaningless.
    meter.update({
      value: 180, tol: ALIGN_TOL_DEG,
      goal: `Turn the dial until <b>D<sub>u</sub>f</b> reaches <b>|∇f|</b> — ${fd.hint}.`,
      solvedText: '',
      hintText: '∇f ≈ 0 here — the surface is flat, so no direction is steepest. Drag the probe away from the critical point.',
    });
  } else {
    meter.update({
      value: gapDeg, tol: ALIGN_TOL_DEG,
      goal: `Turn the dial until <b>D<sub>u</sub>f</b> reaches <b>|∇f|</b> — ${fd.hint}.`,
      solvedText: `✓ Aligned — Dᵤf = ${fmt(du)} is the steepest slope here.`,
      hintText: dialTouched ? 'Keep turning — the mint arrow is not yet uphill.'
        : 'Turn the direction dial to point the mint arrow uphill.',
    });
  }
}

/** Inset: D_u f as θ sweeps a full turn — a cosine of amplitude |∇f|, peaking
 *  exactly where the dial aligns with the gradient. */
function drawDialInset(fd, x, y, theta, mag, best) {
  const cvI = s('inset'), ctx = cvI.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const w = cvI.clientWidth, h = cvI.clientHeight;
  cvI.width = w * dpr; cvI.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = 6;
  const amp = Math.max(mag, 1e-6);
  const SX = t => pad + t / (Math.PI * 2) * (w - 2 * pad);
  const SY = v => pad + (amp - v) / (2 * amp) * (h - 2 * pad);

  ctx.strokeStyle = getCSS('--grid'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, SY(0)); ctx.lineTo(w - pad, SY(0)); ctx.stroke();

  ctx.strokeStyle = getCSS('--true'); ctx.lineWidth = 2; ctx.beginPath();
  for (let k = 0; k <= 160; k++) {
    const t = Math.PI * 2 * k / 160;
    const X = SX(t), Y = SY(directional(fd, x, y, t));
    k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.stroke();

  if (best !== null) {
    const bt = (best + Math.PI * 2) % (Math.PI * 2);
    ctx.strokeStyle = getCSS('--error'); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(SX(bt), pad); ctx.lineTo(SX(bt), h - pad); ctx.stroke();
    ctx.setLineDash([]);
  }

  const t0 = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(SX(t0), SY(directional(fd, x, y, t0)), 3.6, 0, 7); ctx.fill();
}

render();

mountNav('gradient');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.field) {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) {
      state.field = fd;
      map.setField(fd);
      fieldButtons.select(FIELDS.indexOf(fd), { notify: false });
      placeProbe(fd);
    }
  }
  if (typeof st.x === 'number') state.x = st.x;
  if (typeof st.y === 'number') state.y = st.y;

  const best = steepestAngle(state.field, state.x, state.y);
  if (st.snap && best !== null) setTheta(best * 180 / Math.PI);
  else if (typeof st.thetaOffsetDeg === 'number' && best !== null) setTheta(best * 180 / Math.PI + st.thetaOffsetDeg);
  else if (typeof st.thetaDeg === 'number') setTheta(st.thetaDeg);

  meter.reset();
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({
  field: state.field.id,
  x: state.x, y: state.y,
  thetaDeg: (state.theta * 180 / Math.PI) % 360,
});
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'gradient', onJump: applyState });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};

function setTheta(deg) {
  const d = ((deg % 360) + 360) % 360;
  state.theta = d * Math.PI / 180;
  dial.set(d);
  dialTouched = true;
}
