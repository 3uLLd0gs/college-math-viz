import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav, neighbours } from '../../engine/sequencer.js';
import { mountLesson } from '../../engine/lesson.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt, mountPresenter } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { SCENARIOS, byId, solveFor, missBy, stateSpeed, LESSON } from './content.js';

const URL_SCHEMA = { scenario: 'string', s: 'number', drive: 'number' };

/* ---- PLAYGROUND: thin wiring specific to "related rates" ----
   The scene is drawn directly rather than through Grapher2D: these are physical
   pictures — a ladder, a tank, a lamp — not plots of a function, and forcing
   them through a graph's coordinate system would fight it the whole way. The
   inset IS a plot, and shows the derived rate against the state variable. */

const cv = document.getElementById('scene');
const ctx = cv.getContext('2d');
const shell = new ScoreShell(createConfetti(), { slug: 'related-rates' });
const state = { sc: SCENARIOS[0], s: SCENARIOS[0].sVar.start, drive: SCENARIOS[0].drive.start };

const explored = new Set([SCENARIOS[0].id]);

const meter = challengeMeter({
  format: v => (v === Infinity ? '—' : v.toFixed(3)),
  formatTol: t => t.toFixed(3),
  progress: linearProgress(10),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.sc.id}`, 65);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Rates matched', fresh ? `${state.sc.derived.symbol} on target · +65` : 'On target again', '⏱️');
    shell.badge('related', 'Chain Reaction', 'Hit a target on a derived rate', '⛓️');
  },
});

const scButtons = buttonGroup('fbtns', SCENARIOS, sc => {
  useScenario(sc);
  shell.award(`explore:${sc.id}`, 5);
  explored.add(sc.id);
  if (explored.size === SCENARIOS.length) shell.badge('explorer', 'Rate Hunter', 'Ran every scenario', '🗺️');
  render();
  pushUrl();
});

const sSlider = slider('sval', { onInput: v => { state.s = v; render(); pushUrl(); } });
const dSlider = slider('drive', { onInput: v => { state.drive = v; render(); pushUrl(); } });

function useScenario(sc) {
  state.sc = sc;
  state.s = sc.sVar.start;
  state.drive = sc.drive.start;
  sSlider.range({ min: sc.sVar.min, max: sc.sVar.max, step: sc.sVar.step, value: sc.sVar.start });
  dSlider.range({ min: sc.drive.min, max: sc.drive.max, step: sc.drive.step, value: sc.drive.start });
  meter.reset();
}
useScenario(SCENARIOS[0]);

s('reset').onclick = () => { useScenario(state.sc); render(); pushUrl(); };

/* Let time run: the state advances at exactly the driving rate, which is the
   point — the driver is constant and the derived rate is not. */
ticker('play', {
  intervalMs: 40,
  playLabel: '▸ Let time run',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.s = state.sc.sVar.min + 1e-6; sSlider.set(state.s); render(); pushUrl(); },
  onTick: () => {
    const sc = state.sc;
    const next = state.s + stateSpeed(sc, state.s, state.drive) * 0.04;
    if (next >= sc.sVar.max) { state.s = sc.sVar.max; sSlider.set(state.s); render(); pushUrl(); return false; }
    state.s = next; sSlider.set(state.s); render();
    pushUrl();
  },
});

window.addEventListener('resize', render);

keyboardControl(cv, {
  nudge: (dx, dy, big) => {
    const sv = state.sc.sVar;
    const d = (big ? 5 : 1) * sv.step;
    state.s = Math.max(sv.min, Math.min(sv.max, state.s + dx * d));
    sSlider.set(state.s);
    render(); pushUrl();
  },
  step: (delta, big) => {
    const sv = state.sc.sVar;
    const d = (big ? 5 : 1) * sv.step;
    state.s = Math.max(sv.min, Math.min(sv.max, state.s + delta * d));
    sSlider.set(state.s);
    render(); pushUrl();
  },
});

/* ---- scene drawing ---- */
function layout() {
  const dpr = window.devicePixelRatio || 1;
  const box = cv.parentElement.getBoundingClientRect();
  cv.width = box.width * dpr; cv.height = box.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Inset the drawing area: the graph tag and legend sit across the top and the
  // readout across the bottom, and a scene drawn to the canvas edge disappears
  // underneath both of them.
  const m = { top: 54, bottom: 78, side: 44 };
  return {
    W: box.width, H: box.height,
    x0: m.side, y0: m.top,
    w: Math.max(60, box.width - m.side * 2),
    h: Math.max(60, box.height - m.top - m.bottom),
    cx: box.width / 2,
    cy: m.top + Math.max(60, box.height - m.top - m.bottom) / 2,
  };
}

const DRAW = {
  ladder(L, sc) {
    const x = state.s, y = sc.height(x);
    const span = Math.min(L.w, L.h) / 5.6;
    const ox = L.cx - span * 2.7, oy = L.y0 + L.h;
    const P = (a, b) => [ox + a * span, oy - b * span];
    ctx.strokeStyle = getCSS('--line'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(...P(0, 5.4)); ctx.lineTo(...P(0, 0)); ctx.lineTo(...P(5.4, 0)); ctx.stroke();
    ctx.save();
    ctx.strokeStyle = getCSS('--gold'); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.shadowColor = getCSS('--gold'); ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(...P(x, 0)); ctx.lineTo(...P(0, y)); ctx.stroke();
    ctx.restore();
    arrow(P(x, 0), [1, 0], span * 0.9 * state.drive / sc.drive.max + 18, getCSS('--approx'));
    const dy = sc.rate(x, state.drive);
    arrow(P(0, y), [0, -1], Math.min(span * 1.6, 18 + Math.abs(dy) * 14), getCSS('--error'));
    label(P(x / 2, 0), `x = ${fmt(x)} m`, getCSS('--muted'), 0, 16);
    label(P(0, y / 2), `y = ${fmt(y)} m`, getCSS('--muted'), -6, 0, 'right');
  },
  balloon(L, sc) {
    const r = state.s, span = Math.min(L.w, L.h) / 6.8;
    const cx = L.cx, cy = L.cy;
    ctx.save();
    const g = ctx.createRadialGradient(cx - r * span * 0.3, cy - r * span * 0.3, 2, cx, cy, r * span);
    g.addColorStop(0, 'rgba(255,180,84,.55)'); g.addColorStop(1, 'rgba(255,93,115,.25)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * span, 0, 7); ctx.fill();
    ctx.strokeStyle = getCSS('--gold'); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
    for (let k = 0; k < 8; k++) {
      const a = Math.PI * 2 * k / 8;
      arrow([cx + Math.cos(a) * r * span, cy + Math.sin(a) * r * span], [Math.cos(a), Math.sin(a)],
        10 + sc.rate(r, state.drive) * 90, getCSS('--error'));
    }
    label([cx, cy], `r = ${fmt(r)} m`, getCSS('--ink'), 0, 4, 'center');
  },
  ripple(L, sc) {
    const r = state.s, span = Math.min(L.w, L.h) / 6.8;
    const cx = L.cx, cy = L.cy;
    ctx.save();
    ctx.fillStyle = 'rgba(122,162,255,.13)';
    ctx.beginPath(); ctx.arc(cx, cy, r * span, 0, 7); ctx.fill();
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(122,162,255,${0.55 - k * 0.16})`;
      ctx.lineWidth = 2 - k * 0.4;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, r * span - k * 9), 0, 7); ctx.stroke();
    }
    ctx.restore();
    for (let k = 0; k < 10; k++) {
      const a = Math.PI * 2 * k / 10;
      arrow([cx + Math.cos(a) * r * span, cy + Math.sin(a) * r * span], [Math.cos(a), Math.sin(a)],
        10 + state.drive * 22, getCSS('--approx'));
    }
    label([cx, cy], `r = ${fmt(r)} m`, getCSS('--ink'), 0, 4, 'center');
  },
  cone(L, sc) {
    const h = state.s, span = Math.min(L.w, L.h) / 4.6;
    const cx = L.cx, top = L.cy - span * 2, bot = top + span * 4;
    const halfTop = span * 2;
    ctx.save();
    ctx.strokeStyle = getCSS('--line'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - halfTop, top); ctx.lineTo(cx, bot); ctx.lineTo(cx + halfTop, top); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, top, halfTop, halfTop * 0.22, 0, 0, 7); ctx.stroke();
    const wy = bot - h * span, wr = (h / 4) * halfTop;
    ctx.fillStyle = 'rgba(122,162,255,.30)';
    ctx.beginPath(); ctx.moveTo(cx - wr, wy); ctx.lineTo(cx, bot); ctx.lineTo(cx + wr, wy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(122,162,255,.55)';
    ctx.beginPath(); ctx.ellipse(cx, wy, wr, wr * 0.22, 0, 0, 7); ctx.fill();
    ctx.restore();
    arrow([cx + wr + 6, wy], [0, -1], 14 + sc.rate(h, state.drive) * 40, getCSS('--error'));
    label([cx, wy], `h = ${fmt(h)} m`, getCSS('--ink'), 0, -10, 'center');
  },
  shadow(L, sc) {
    const x = state.s, sl = sc.shadowLength(x);
    const span = L.w / 15;
    const ground = L.y0 + L.h * 0.86, ox = L.x0 + 18;
    ctx.save();
    ctx.strokeStyle = getCSS('--line'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox - 20, ground); ctx.lineTo(L.W - 20, ground); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, ground); ctx.lineTo(ox, ground - 6 * span); ctx.stroke();
    ctx.fillStyle = getCSS('--gold');
    ctx.beginPath(); ctx.arc(ox, ground - 6 * span, 7, 0, 7); ctx.fill();
    const px = ox + x * span, tip = ox + (x + sl) * span;
    ctx.strokeStyle = getCSS('--approx'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, ground); ctx.lineTo(px, ground - 1.8 * span); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,215,106,.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ox, ground - 6 * span); ctx.lineTo(tip, ground); ctx.stroke();
    ctx.strokeStyle = getCSS('--error'); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(px, ground); ctx.lineTo(tip, ground); ctx.stroke();
    ctx.restore();
    label([(px + tip) / 2, ground], `s = ${fmt(sl)} m`, getCSS('--muted'), 0, 18, 'center');
    label([px, ground - 1.8 * span], `x = ${fmt(x)} m`, getCSS('--muted'), 0, -10, 'center');
  },
};

function arrow([px, py], [ux, uy], len, color) {
  const L = Math.max(10, Math.min(len, 90));
  const ex = px + ux * L, ey = py + uy * L, a = Math.atan2(uy, ux);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex, ey);
  ctx.lineTo(ex - 9 * Math.cos(a - 0.42), ey - 9 * Math.sin(a - 0.42));
  ctx.lineTo(ex - 9 * Math.cos(a + 0.42), ey - 9 * Math.sin(a + 0.42));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function label([px, py], text, color, dx = 0, dy = 0, align = 'left') {
  ctx.save();
  ctx.fillStyle = color; ctx.font = '11px "JetBrains Mono"';
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(text, px + dx, py + dy);
  ctx.restore();
}

/** Inset: the derived rate across the whole range of the state variable. */
function drawInset(sc) {
  const c = s('inset'), g = c.getContext('2d');
  const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const pad = 7, { min, max } = sc.sVar;
  const pts = [];
  for (let i = 0; i <= 140; i++) {
    const sv = min + (max - min) * i / 140;
    pts.push([sv, Math.abs(sc.rate(sv, state.drive))]);
  }
  const cap = Math.min(Math.max(...pts.map(p => p[1])), Math.abs(sc.rate(min + (max - min) * 0.03, state.drive)) * 3 + 1);
  const SX = v => pad + (v - min) / (max - min) * (w - 2 * pad);
  const SY = v => h - pad - Math.min(v, cap) / cap * (h - 2 * pad);
  g.strokeStyle = getCSS('--grid'); g.lineWidth = 1;
  g.beginPath(); g.moveTo(pad, h - pad); g.lineTo(w - pad, h - pad); g.stroke();
  if (sc.challenge && !sc.challenge.equalRates) {
    g.strokeStyle = getCSS('--error'); g.setLineDash([4, 4]); g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(pad, SY(sc.challenge.target)); g.lineTo(w - pad, SY(sc.challenge.target)); g.stroke();
    g.setLineDash([]);
  }
  g.strokeStyle = getCSS('--approx'); g.lineWidth = 2; g.beginPath();
  pts.forEach(([sv, r], i) => (i ? g.lineTo(SX(sv), SY(r)) : g.moveTo(SX(sv), SY(r))));
  g.stroke();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(SX(state.s), SY(Math.abs(sc.rate(state.s, state.drive))), 3.6, 0, 7); g.fill();
}

function render() {
  const sc = state.sc, L = layout();
  ctx.clearRect(0, 0, L.W, L.H);
  DRAW[sc.id](L, sc);

  const r = sc.rate(state.s, state.drive);
  s('sval-lab').textContent = `${fmt(state.s)} ${sc.sVar.unit}`;
  s('drive-lab').textContent = `${fmt(state.drive)} ${sc.drive.unit}`;
  s('s-name').textContent = `${sc.sVar.label} (${sc.sVar.symbol})`;
  s('d-name').textContent = `${sc.drive.label} (${sc.drive.symbol})`;
  s('derived-k').textContent = `${sc.derived.label} (${sc.derived.symbol})`;
  s('derived-v').textContent = `${fmt(r)} ${sc.derived.unit}`;
  s('setup').textContent = sc.setup;
  s('constraint').textContent = sc.constraint;
  s('relation').textContent = sc.relation;
  s('note').textContent = sc.note;
  s('readout').innerHTML =
    `${sc.sVar.symbol} = <b>${fmt(state.s)} ${sc.sVar.unit}</b>` +
    ` &nbsp;·&nbsp; ${sc.drive.symbol} = <b>${fmt(state.drive)} ${sc.drive.unit}</b> (constant)` +
    ` &nbsp;·&nbsp; ${sc.derived.symbol} = <span class="pd">${fmt(r)} ${sc.derived.unit}</span>`;

  drawInset(sc);

  if (!sc.challenge) {
    meter.update({
      value: 9, tol: 1,
      goal: `<b>Nothing to find here.</b> ${sc.note}`,
      solvedText: '',
      hintText: 'Move the slider and watch the derived rate refuse to change.',
    });
  } else {
    const goal = sc.challenge.equalRates
      ? `${sc.challenge.prompt} That happens when the two lengths are equal.`
      : `${sc.challenge.prompt}`;
    meter.update({
      value: missBy(sc, state.s, state.drive), tol: sc.challenge.tol,
      goal,
      solvedText: `✓ ${sc.derived.symbol} = ${fmt(r)} ${sc.derived.unit} at ${sc.sVar.symbol} = ${fmt(state.s)} ${sc.sVar.unit}.`,
      hintText: `Slide ${sc.sVar.symbol} — the derived rate moves with it.`,
    });
  }
}

render();

mountNav('related-rates');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.scenario) {
    const sc = byId(st.scenario);
    if (sc) { useScenario(sc); scButtons.select(SCENARIOS.indexOf(sc), { notify: false }); }
  }
  if (typeof st.drive === 'number') { state.drive = st.drive; dSlider.set(st.drive); }
  if (st.solve) {
    const target = state.sc.challenge?.target ?? null;
    const sv = solveFor(state.sc, target, state.drive);
    if (sv !== null) { state.s = sv; sSlider.set(sv); }
  } else if (typeof st.s === 'number') { state.s = st.s; sSlider.set(st.s); }
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ scenario: state.sc.id, s: state.s, drive: state.drive });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'related-rates', onJump: applyState, links: neighbours('related-rates') });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};

mountPresenter();
