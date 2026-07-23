import { VectorFieldView, rk4Step, outwardFlux, circulation } from '../../engine/vector-field.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { FIELDS, readingsAt, stillness, canGoStill, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "curl & divergence" ---- */

const DOMAIN = 2;
const STILL_TOL = 0.12;       // |div| and |curl| both under this counts as still
const RING_POINTS = 44;
const RING_PERIOD = 2600;     // ms before the tracer ring is re-seeded
// A strongly divergent field grows the ring exponentially — e^(div·t) — so after
// a couple of seconds it fills the canvas and reads as nothing at all. Re-seed
// once it has visibly changed size instead, which keeps the loop legible and
// makes the RATE the thing you perceive.
const RING_GROW_MAX = 6;
const RING_GROW_MIN = 0.16;

const view = new VectorFieldView(document.getElementById('field'));
const shell = new ScoreShell(createConfetti(), { slug: 'curl-divergence' });
const state = { field: null, x: -1.3, y: 1.2, r: 0.32, wheel: 0, ring: null, ringAge: 0 };

const explored = new Set();

const meter = challengeMeter({
  format: v => v.toFixed(3),
  formatTol: t => t.toFixed(2),
  progress: linearProgress(8),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.field.id}`, 70);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Everything still', fresh
      ? 'No spin, no spread · +70' : 'Still again', '🧊');
    shell.badge('still', 'Dead Calm', 'Found a point with no spin and no spread', '🧿');
  },
});

function useField(fd) {
  state.field = { ...fd, a: DOMAIN };
  view.setField(state.field);
  seedRing();
  meter.reset();
}

const fieldButtons = buttonGroup('fbtns', FIELDS, fd => {
  useField(fd);
  shell.award(`explore:${fd.id}`, 5);
  explored.add(fd.id);
  if (explored.size === FIELDS.length) shell.badge('explorer', 'Flow Reader', 'Studied every field', '🗺️');
  render();
});

const radius = slider('radius', { onInput: v => { state.r = v; seedRing(); render(); } });

s('reset').onclick = () => { state.x = -1.3; state.y = 1.2; seedRing(); meter.reset(); render(); };

/* drag the probe */
const cv = document.getElementById('field');
let dragging = false;
function moveProbe(clientX, clientY) {
  const b = cv.getBoundingClientRect();
  state.x = Math.max(-DOMAIN, Math.min(DOMAIN, view.ux(clientX - b.left)));
  state.y = Math.max(-DOMAIN, Math.min(DOMAIN, view.uy(clientY - b.top)));
  seedRing();
  render();
}
cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); moveProbe(e.clientX, e.clientY); });
cv.addEventListener('pointermove', e => { if (dragging) moveProbe(e.clientX, e.clientY); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

view.onresize = render;

/** A fresh circle of tracer particles around the probe. */
function seedRing() {
  state.ring = Array.from({ length: RING_POINTS }, (_, k) => {
    const t = Math.PI * 2 * k / RING_POINTS;
    return [state.x + state.r * Math.cos(t), state.y + state.r * Math.sin(t)];
  });
  state.ringAge = 0;
}

/** Shoelace area of the tracer ring — this is what divergence changes. */
function ringArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a) / 2;
}

/* ---- the live animation: the wheel turns at curl/2, the ring rides the flow ---- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const fd = state.field;
  const { omega } = readingsAt(fd, state.x, state.y);

  state.wheel += omega * dt;

  // Advect in the probe's own frame: subtract the flow AT the probe so the ring
  // deforms in place instead of being carried off downstream. Divergence and
  // curl are properties of the velocity gradient, not of the velocity, so the
  // uniform part is exactly what should be removed — and a ring that drifts out
  // from under the paddle wheel is impossible to read against it.
  const P0 = fd.P(state.x, state.y), Q0 = fd.Q(state.x, state.y);
  const relative = { P: (x, y) => fd.P(x, y) - P0, Q: (x, y) => fd.Q(x, y) - Q0 };

  state.ringAge += dt * 1000;
  state.ring = state.ring.map(([x, y]) => rk4Step(relative, x, y, dt * 0.9));

  const ratio = ringArea(state.ring) / (Math.PI * state.r * state.r);
  const runaway = state.ring.some(p => !Number.isFinite(p[0]) || Math.abs(p[0]) > 6);
  if (state.ringAge > RING_PERIOD || ratio > RING_GROW_MAX || ratio < RING_GROW_MIN || runaway) seedRing();

  render();
  requestAnimationFrame(frame);
}

function render() {
  const fd = state.field, { x, y, r } = state;

  view.clear();
  view.axes();
  view.arrows(15);

  const c = view.ctx;
  const px = view.sx(x), py = view.sy(y);
  const pr = Math.abs(view.sx(x + r) - px);

  // the tracer ring, and the circle it started as
  c.save();
  c.strokeStyle = getCSS('--accent'); c.globalAlpha = 0.4; c.lineWidth = 1; c.setLineDash([4, 4]);
  c.beginPath(); c.arc(px, py, pr, 0, 7); c.stroke();
  c.restore();

  c.save();
  c.strokeStyle = getCSS('--approx'); c.lineWidth = 2.4;
  c.shadowColor = getCSS('--approx'); c.shadowBlur = 8;
  c.beginPath();
  state.ring.forEach(([rx, ry], i) => (i ? c.lineTo(view.sx(rx), view.sy(ry)) : c.moveTo(view.sx(rx), view.sy(ry))));
  c.closePath(); c.stroke(); c.restore();

  // the paddle wheel: four spokes turning at curl / 2
  c.save();
  c.translate(px, py); c.rotate(-state.wheel);
  c.strokeStyle = getCSS('--gold'); c.lineWidth = 3; c.lineCap = 'round';
  c.shadowColor = getCSS('--gold'); c.shadowBlur = 8;
  for (let k = 0; k < 4; k++) {
    const ang = Math.PI / 2 * k;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(ang) * pr * 0.72, Math.sin(ang) * pr * 0.72);
    c.stroke();
  }
  c.restore();
  view.dot(x, y, getCSS('--gold'), 4);

  const { div, curl, omega } = readingsAt(fd, x, y);
  const area = Math.PI * r * r;
  const fluxRatio = outwardFlux(fd, x, y, r) / area;
  const circRatio = circulation(fd, x, y, r) / area;
  const grow = ringArea(state.ring) / area;

  s('div-val').textContent = fmt(div);
  s('curl-val').textContent = fmt(curl);
  s('omega-val').textContent = fmt(omega);
  s('flux-val').textContent = fmt(fluxRatio);
  s('circ-val').textContent = fmt(circRatio);
  s('rad-val').textContent = fmt(r);
  s('grow-val').textContent = (grow * 100).toFixed(0) + '%';
  s('note').textContent = fd.note;
  s('readout').innerHTML =
    `at (<b>${fmt(x)}</b>, <b>${fmt(y)}</b>) &nbsp;·&nbsp; div F = <span class="dv">${fmt(div)}</span>` +
    ` &nbsp;·&nbsp; curl F = <span class="cl">${fmt(curl)}</span>` +
    ` &nbsp;·&nbsp; wheel spins at <b>${fmt(omega)}</b> rad/s`;

  if (!canGoStill(fd)) {
    meter.update({
      value: 9, tol: STILL_TOL,
      goal: `<b>${fd.note}</b>`,
      solvedText: '',
      hintText: 'Nothing to find on this field — the wheel turns at the same rate everywhere.',
    });
  } else {
    meter.update({
      value: stillness(fd, x, y), tol: STILL_TOL,
      goal: `Park the probe where the wheel stops turning <b>and</b> the ring stops changing size — where <b>div F</b> and <b>curl F</b> are both zero.`,
      solvedText: '✓ Still: no spin, no spread. Both div F and curl F vanish here.',
      hintText: 'Watch both readouts — one of them is still non-zero.',
    });
  }
}

useField(FIELDS[0]);
explored.add(FIELDS[0].id);
render();
requestAnimationFrame(frame);

mountNav('curl-divergence');

mountLesson(LESSON, {
  slug: 'curl-divergence',
  onJump: st => {
    if (st.field) {
      const fd = FIELDS.find(f => f.id === st.field);
      if (fd) { useField(fd); fieldButtons.select(FIELDS.indexOf(fd), { notify: false }); }
    }
    if (typeof st.x === 'number') state.x = st.x;
    if (typeof st.y === 'number') state.y = st.y;
    if (typeof st.r === 'number') { state.r = st.r; radius.set(st.r); }
    seedRing();
    render();
  },
});
