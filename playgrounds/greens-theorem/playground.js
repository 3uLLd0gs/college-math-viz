import { VectorFieldView, circulation, curlFlux, curlAt } from '../../engine/vector-field.js';
import { isoSegments } from '../../engine/contour-map.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { FIELDS, curlGrid } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "Green's theorem" ---- */

const DOMAIN = 2;
const CANCEL_TOL = 0.12;      // |∮F·dr| below this counts as cancelled
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
    shell.add(75); shell.hitStreak(); shell.celebrate();
    shell.toast('Perfectly balanced', 'Positive and negative curl cancel · +75', '⚖️');
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

buttonGroup('fbtns', FIELDS, fd => {
  useField(fd);
  shell.add(5);
  explored.add(fd.id);
  if (explored.size === FIELDS.length) shell.badge('explorer', 'Circuit Rider', 'Tested every field', '🗺️');
  render();
});

const radius = slider('radius', {
  onInput: v => { state.r = v; render(); },
});

s('reset').onclick = () => { state.x = START.x; state.y = START.y; state.r = START.r; radius.set(START.r); meter.reset(); render(); };

/* drag the loop */
const cv = document.getElementById('field');
let dragging = false;
function moveLoop(clientX, clientY) {
  const b = cv.getBoundingClientRect();
  state.x = Math.max(-DOMAIN, Math.min(DOMAIN, view.ux(clientX - b.left)));
  state.y = Math.max(-DOMAIN, Math.min(DOMAIN, view.uy(clientY - b.top)));
  render();
}
cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); moveLoop(e.clientX, e.clientY); });
cv.addEventListener('pointermove', e => { if (dragging) moveLoop(e.clientX, e.clientY); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

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
