import { Surface3D } from '../../engine/surface-3d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { SURFACES, sliceStart, probeStart } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "partial derivatives" ---- */
const eng = new Surface3D(document.getElementById('scene'));
const shell = new ScoreShell(createConfetti(), { slug: 'partial-derivatives' });
let state = { surf: SURFACES[0], axis: 'x', slice: sliceStart(SURFACES[0]), probe: probeStart(SURFACES[0]) };

const meter = challengeMeter({
  format: v => v.toFixed(3),
  formatTol: t => t.toFixed(2),
  progress: linearProgress(6),
  onSolve: () => {
    const sym = state.axis === 'x' ? '∂f/∂x' : '∂f/∂y';
    const fresh = shell.award(`solve:${state.surf.id}:${state.axis}`, 60);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Critical point!', sym + (fresh ? ' ≈ 0 · +60' : ' ≈ 0 again'), '🎯');
    shell.badge('flat', 'Flatliner', 'Zeroed a partial derivative', '📐');
  },
});
function point() { return state.axis === 'x' ? { x0: state.probe, y0: state.slice } : { x0: state.slice, y0: state.probe }; }
function partial(x0, y0) { return state.axis === 'x' ? state.surf.fx(x0, y0) : state.surf.fy(x0, y0); }

buttonGroup('fbtns', SURFACES, sf => pickSurface(sf));

const sliceSlider = slider('slice', { onInput: v => { state.slice = v; eng.schedule(); } });
const probeSlider = slider('probe', { onInput: v => { state.probe = v; eng.schedule(); } });

const explored = new Set(['parab']);
function pickSurface(sf) {
  state.surf = sf; state.slice = sliceStart(sf); state.probe = probeStart(sf); meter.reset();
  eng.setSurface(sf); setSliderRanges(sf); shell.award(`explore:${sf.id}`, 5);
  explored.add(sf.id); if (explored.size === SURFACES.length) shell.badge('explorer', 'Cartographer', 'Explored every surface', '🗺️');
  eng.schedule();
}
function setSliderRanges(sf) {
  const bounds = { min: -sf.a, max: sf.a, step: sf.a / 100 };
  sliceSlider.range({ ...bounds, value: sliceStart(sf) });
  probeSlider.range({ ...bounds, value: probeStart(sf) });
}
const usedAxes = new Set(['x']);
function setAxis(ax) {
  state.axis = ax; meter.reset();
  s('ax-x').classList.toggle('on', ax === 'x'); s('ax-y').classList.toggle('on', ax === 'y');
  s('slice-name').textContent = ax === 'x' ? 'hold y =' : 'hold x =';
  s('probe-name').textContent = ax === 'x' ? 'move x =' : 'move y =';
  s('ins-cap').textContent = ax === 'x' ? 'z = f(x, y₀)' : 'z = f(x₀, y)';
  usedAxes.add(ax); if (usedAxes.size === 2) shell.badge('both', 'Ambidextrous', 'Sliced both directions', '🔀');
  eng.schedule();
}
s('ax-x').onclick = () => setAxis('x'); s('ax-y').onclick = () => setAxis('y');
s('reset').onclick = () => { eng.az = -0.75; eng.el = 0.52; eng.dist = 7; eng.schedule(); };

eng.onrender = function () {
  const proj = eng.projector(); const sf = state.surf;
  eng.renderBase(proj, { axis: state.axis, slice: state.slice });
  const c = eng.ctx; const { x0, y0 } = point(); const a = sf.a;
  c.save(); c.strokeStyle = getCSS('--true'); c.lineWidth = 3; c.lineJoin = 'round';
  c.shadowColor = getCSS('--true'); c.shadowBlur = 8; c.beginPath(); let pen = false;
  for (let k = 0; k <= 160; k++) {
    const t = -a + 2 * a * k / 160;
    const P = state.axis === 'x' ? eng.w(t, y0) : eng.w(x0, t);
    const q = proj(P); if (!q.ok) { pen = false; continue; }
    if (!pen) { c.moveTo(q.x, q.y); pen = true; } else c.lineTo(q.x, q.y);
  }
  c.stroke(); c.restore();
  const f0 = sf.f(x0, y0), m = partial(x0, y0), h = Math.min(0.9, a * 0.42);
  const e1 = state.axis === 'x' ? eng.wz(x0 - h, y0, f0 - m * h) : eng.wz(x0, y0 - h, f0 - m * h);
  const e2 = state.axis === 'x' ? eng.wz(x0 + h, y0, f0 + m * h) : eng.wz(x0, y0 + h, f0 + m * h);
  const t1 = proj(e1), t2 = proj(e2);
  if (t1.ok && t2.ok) {
    c.save(); c.strokeStyle = getCSS('--error'); c.lineWidth = 3.5; c.lineCap = 'round';
    c.shadowColor = getCSS('--error'); c.shadowBlur = 10; c.beginPath(); c.moveTo(t1.x, t1.y); c.lineTo(t2.x, t2.y); c.stroke(); c.restore();
  }
  const pp = proj(eng.w(x0, y0));
  if (pp.ok) {
    c.save(); c.fillStyle = '#fff'; c.shadowColor = getCSS('--error'); c.shadowBlur = 12;
    c.beginPath(); c.arc(pp.x, pp.y, 5, 0, 7); c.fill();
    c.fillStyle = getCSS('--error'); c.beginPath(); c.arc(pp.x, pp.y, 2.4, 0, 7); c.fill(); c.restore();
  }
  drawInset(sf, x0, y0, m); updatePanel(sf, x0, y0, m);
};

function drawInset(sf, x0, y0, m) {
  const cv = s('inset'), ctx = cv.getContext('2d'); const dpr = devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const a = sf.a, pad = 6; const sVar = state.axis === 'x' ? x0 : y0;
  const zmin = eng.zmin, zmax = eng.zmax, zspan = Math.max(zmax - zmin, 1e-6);
  const SX = v => pad + (v + a) / (2 * a) * (w - 2 * pad); const SY = v => pad + (zmax - v) / zspan * (h - 2 * pad);
  ctx.strokeStyle = getCSS('--grid'); ctx.lineWidth = 1;
  if (zmin < 0 && zmax > 0) { ctx.beginPath(); ctx.moveTo(pad, SY(0)); ctx.lineTo(w - pad, SY(0)); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(SX(0), pad); ctx.lineTo(SX(0), h - pad); ctx.stroke();
  ctx.strokeStyle = getCSS('--true'); ctx.lineWidth = 2; ctx.beginPath();
  for (let k = 0; k <= 140; k++) {
    const v = -a + 2 * a * k / 140; const z = state.axis === 'x' ? sf.f(v, y0) : sf.f(x0, v);
    const X = SX(v), Y = SY(z); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.stroke();
  const f0 = sf.f(x0, y0), hh = a * 0.5;
  ctx.strokeStyle = getCSS('--error'); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(SX(sVar - hh), SY(f0 - m * hh)); ctx.lineTo(SX(sVar + hh), SY(f0 + m * hh)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(SX(sVar), SY(f0), 3.4, 0, 7); ctx.fill();
}

function updatePanel(sf, x0, y0, m) {
  s('slice-val').textContent = fmt(state.slice); s('probe-val').textContent = fmt(state.probe);
  const f0 = sf.f(x0, y0), sym = state.axis === 'x' ? '∂f/∂x' : '∂f/∂y';
  s('readout').innerHTML = 'at (' + fmt(x0) + ', ' + fmt(y0) + ') &nbsp;·&nbsp; f = <b>' + f0.toFixed(3) +
    '</b> &nbsp;·&nbsp; ' + sym + ' = <span class="pd">' + m.toFixed(3) + '</span>';
  const ch = sf.challenge, av = Math.abs(m);
  meter.update({
    value: av, tol: ch.tol,
    goal: 'Make the highlighted tangent <b>flat</b> (' + sym + ' = 0) — try ' + ch.hint + '.',
    solvedText: '✓ Tangent is flat — ' + sym + ' ≈ 0 here.',
    hintText: 'Slope still ' + (m > 0 ? 'positive' : 'negative') + ' — keep moving the probe.',
  });
}

eng.setSurface(state.surf); setSliderRanges(state.surf); setAxis('x'); eng.schedule();

mountNav('partial-derivatives');
