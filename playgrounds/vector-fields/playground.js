import { VectorFieldView, streamline, divergenceAt, curlAt } from '../../engine/vector-field.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { FIELDS, speed, classify, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "vector fields" ---- */

const DOMAIN = 2;                 // half-extent of the visible square
const FIND_TOL = 0.12;            // |F| below this counts as finding the equilibrium
const START = { x: -1.5, y: 1.5 };  // a corner, well away from every equilibrium
const URL_SCHEMA = { field: 'string', x: 'number', y: 'number' };

const view = new VectorFieldView(document.getElementById('field'));
const shell = new ScoreShell(createConfetti(), { slug: 'vector-fields' });
const state = { field: FIELDS[0], x: START.x, y: START.y, arrows: 17, trace: [] };

const explored = new Set([FIELDS[0].id]);
const seenKinds = new Set();

const meter = challengeMeter({
  format: v => v.toFixed(3),
  formatTol: t => t.toFixed(2),
  progress: linearProgress(8),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.field.id}`, 70);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Equilibrium found!', fresh
      ? `${state.field.kind} · F = 0 here · +70`
      : `${state.field.kind} · found again`, '🎯');
    shell.badge('still', 'Dead Calm', 'Located a stagnation point', '🧿');
  },
});

function useField(fd) {
  state.field = { ...fd, a: DOMAIN };
  state.x = START.x; state.y = START.y;
  view.setField(state.field);
  meter.reset();
}
useField(FIELDS[0]);

const fieldButtons = buttonGroup('fbtns', FIELDS, fd => {
  useField(fd);
  shell.award(`explore:${fd.id}`, 5);
  explored.add(fd.id);
  seenKinds.add(fd.kind);
  if (explored.size === FIELDS.length) shell.badge('explorer', 'Field Marshal', 'Surveyed every field', '🗺️');
  if (seenKinds.size >= 4) shell.badge('taxonomy', 'Taxonomist', 'Saw four kinds of flow', '🔬');
  render();
  pushUrl();
});

const density = slider('density', {
  onInput: v => { state.arrows = v; render(); },
});

/* Release a particle from the probe and watch it ride the flow. */
let anim = null;
ticker('release', {
  intervalMs: 28,
  playLabel: '▸ Release particle',
  pauseLabel: '⏸ Stop',
  onStart: () => {
    anim = { pts: streamline(state.field, state.x, state.y, { h: 0.02, steps: 900, bound: DOMAIN * 1.05 }), i: 1 };
    shell.badge('flow', 'Go With the Flow', 'Released a particle into the field', '🌊');
    render();
  },
  onTick: () => {
    if (!anim || anim.i >= anim.pts.length) { anim = null; render(); return false; }
    anim.i += 3;
    render();
  },
});

s('reset').onclick = () => { state.x = START.x; state.y = START.y; anim = null; meter.reset(); render(); pushUrl(); };

/* drag the probe */
const cv = document.getElementById('field');
let dragging = false;
function moveProbe(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  state.x = Math.max(-DOMAIN, Math.min(DOMAIN, view.ux(clientX - r.left)));
  state.y = Math.max(-DOMAIN, Math.min(DOMAIN, view.uy(clientY - r.top)));
  anim = null;
  render();
  pushUrl();
}
cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); moveProbe(e.clientX, e.clientY); });
cv.addEventListener('pointermove', e => { if (dragging) moveProbe(e.clientX, e.clientY); });
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('pointercancel', () => { dragging = false; });

view.onresize = render;

function render() {
  const fd = state.field, { x, y } = state;

  view.clear();
  view.axes();
  view.arrows(state.arrows);

  // The streamline through the probe, traced both ways so the probe sits on it
  // rather than at one end of it.
  const opts = { h: 0.02, steps: 500, bound: DOMAIN * 1.05 };
  view.path(streamline(fd, x, y, { ...opts, dir: -1 }), { color: getCSS('--accent'), width: 2, alpha: 0.55 });
  view.path(streamline(fd, x, y, opts), { color: getCSS('--accent'), width: 2, alpha: 0.55 });

  if (anim) {
    const trail = anim.pts.slice(0, Math.min(anim.i, anim.pts.length));
    view.path(trail, { color: getCSS('--gold'), width: 3, glow: 10 });
    const head = trail[trail.length - 1];
    if (head) view.dot(head[0], head[1], getCSS('--gold'), 5.5);
  }

  view.dot(x, y, getCSS('--approx'));

  const px = fd.P(x, y), py = fd.Q(x, y);
  const sp = speed(fd, x, y);
  const dv = divergenceAt(fd, x, y);
  const cl = curlAt(fd, x, y);

  s('readout').innerHTML =
    `at (<b>${fmt(x)}</b>, <b>${fmt(y)}</b>) &nbsp;·&nbsp; F = <b>(${fmt(px)}, ${fmt(py)})</b>` +
    ` &nbsp;·&nbsp; |F| = <span class="pd">${fmt(sp)}</span>`;

  s('dens-val').textContent = state.arrows + '×' + state.arrows;
  s('div-val').textContent = fmt(dv);
  s('curl-val').textContent = fmt(cl);
  s('kind-val').textContent = classify(dv, cl);
  s('blurb').textContent = fd.blurb;

  if (!fd.at) {
    // shear has a whole line of equilibria, so "find the point" is the wrong task
    meter.update({
      value: 9, tol: FIND_TOL,
      goal: `<b>${fd.kind}.</b> This field has no isolated equilibrium — F = 0 along an entire line. Read the curl instead: parallel flow can still rotate a paddle wheel.`,
      solvedText: '',
      hintText: 'No single point to find here — try another field.',
    });
  } else {
    meter.update({
      value: sp, tol: FIND_TOL,
      goal: `Drag the probe to where the flow stops — <b>|F| = 0</b>. Read the arrows: ${fd.blurb}.`,
      solvedText: `✓ Found it — this is a ${fd.kind.toLowerCase()} at (${fmt(fd.at[0])}, ${fmt(fd.at[1])}).`,
      hintText: 'Follow the arrows inward — |F| shrinks as you approach.',
    });
  }
}

render();

mountNav('vector-fields');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.field) {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) { useField(fd); fieldButtons.select(FIELDS.indexOf(fd), { notify: false }); }
  }
  if (typeof st.x === 'number') state.x = st.x;
  if (typeof st.y === 'number') state.y = st.y;
  anim = null;
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ field: state.field.id, x: state.x, y: state.y });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'vector-fields', onJump: applyState });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
