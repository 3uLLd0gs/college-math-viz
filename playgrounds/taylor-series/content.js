import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { createConfetti } from '../../engine/confetti.js';
import { fact, sup } from '../../engine/math.js';
import { getCSS, fmtAxis as fmt } from '../../engine/dom.js';

/* ---- CONTENT: the FUNCTIONS registry — the only part that changes per concept ---- */
const FUNCTIONS = [
  { id: 'exp', label: 'eˣ',
    f: x => Math.exp(x),
    coeff: n => 1 / fact(n),
    term: n => n === 0 ? { neg: false, body: '1' } : n === 1 ? { neg: false, body: 'x' } : { neg: false, body: `x${sup(n)}/${n}!` },
    view: { xmin: -3, xmax: 3.4, ymin: -1.6, ymax: 14 },
    challenge: { x0: 2, tol: 0.05, label: 'e²' } },

  { id: 'sin', label: 'sin x',
    f: x => Math.sin(x),
    coeff: n => n % 2 === 1 ? (((n - 1) / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
    term: n => { if (n % 2 === 0) return null; if (n === 1) return { neg: false, body: 'x' };
      return { neg: ((n - 1) / 2) % 2 !== 0, body: `x${sup(n)}/${n}!` }; },
    view: { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 },
    challenge: { x0: 3, tol: 0.02, label: 'sin 3' } },

  { id: 'cos', label: 'cos x',
    f: x => Math.cos(x),
    coeff: n => n % 2 === 0 ? ((n / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
    term: n => { if (n % 2 === 1) return null; if (n === 0) return { neg: false, body: '1' };
      return { neg: (n / 2) % 2 !== 0, body: `x${sup(n)}/${n}!` }; },
    view: { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 },
    challenge: { x0: 3, tol: 0.02, label: 'cos 3' } },

  { id: 'ln', label: 'ln(1+x)',
    f: x => x > -1 ? Math.log(1 + x) : NaN,
    coeff: n => n === 0 ? 0 : (n % 2 === 1 ? 1 : -1) / n,
    term: n => { if (n === 0) return null; if (n === 1) return { neg: false, body: 'x' };
      return { neg: n % 2 === 0, body: `x${sup(n)}/${n}` }; },
    view: { xmin: -0.95, xmax: 3, ymin: -4, ymax: 2.2 },
    challenge: { x0: 0.8, tol: 0.01, label: 'ln 1.8' } },

  { id: 'geo', label: '1/(1−x)',
    f: x => x < 1 ? 1 / (1 - x) : NaN,
    coeff: n => 1,
    term: n => n === 0 ? { neg: false, body: '1' } : n === 1 ? { neg: false, body: 'x' } : { neg: false, body: `x${sup(n)}` },
    view: { xmin: -3, xmax: 0.97, ymin: -2, ymax: 9 },
    challenge: { x0: 0.5, tol: 0.005, label: '1/(1−½) = 2' } },
];

function polyAt(fn, N, x) { let s = 0; for (let n = 0; n <= N; n++) s += fn.coeff(n) * Math.pow(x, n); return s; }

function formula(fn, N) {
  let parts = [], shown = 0;
  for (let n = 0; n <= N && shown < 7; n++) {
    const t = fn.term(n); if (!t) continue;
    if (parts.length === 0) parts.push((t.neg ? '−' : '') + t.body);
    else parts.push((t.neg ? ' − ' : ' + ') + t.body);
    shown++;
  }
  return parts.join('') + (moreTerms(fn, N) ? ' <span class="dots">+ …</span>' : '');
}
function moreTerms(fn, N) { let c = 0; for (let n = 0; n <= N; n++) if (fn.term(n)) c++; return c > 7; }

/* ---- PLAYGROUND: thin wiring specific to "Taylor series" ---- */
const g = new Grapher2D(document.getElementById('graph'));
const shell = new ScoreShell(createConfetti());
let state = { fn: FUNCTIONS[0], N: 1, probe: 2, solved: false };
g.setView(state.fn.view);

const fbox = document.getElementById('fbtns');
FUNCTIONS.forEach((fn, i) => {
  const b = document.createElement('button');
  b.className = 'fbtn' + (i === 0 ? ' on' : ''); b.textContent = fn.label; b.dataset.id = fn.id;
  b.onclick = () => selectFn(fn, b);
  fbox.appendChild(b);
});

const terms = document.getElementById('terms');
const nLab = document.getElementById('n-lab');

function selectFn(fn, btn) {
  state.fn = fn; state.probe = fn.challenge.x0; state.solved = false;
  document.querySelectorAll('.fbtn').forEach(x => x.classList.remove('on'));
  btn.classList.add('on');
  g.setView(fn.view);
  shell.add(5);
  markExplored(fn.id);
  render();
}

const explored = new Set(['exp']);
function markExplored(id) {
  explored.add(id);
  if (explored.size === FUNCTIONS.length) shell.badge('explorer', 'Explorer', 'Tried every function', '🧭');
}

terms.addEventListener('input', () => {
  state.N = +terms.value;
  if (state.N >= 1) shell.badge('first', 'First Term', 'You started an approximation', '✳️');
  if (state.N === 14) shell.badge('deep', 'Convergence Master', 'Pushed to 14 terms', '♾️');
  render();
});

document.getElementById('reset').onclick = () => { state.N = 1; terms.value = 1; render(); };

let building = null;
document.getElementById('build').onclick = (e) => {
  if (building) { clearInterval(building); building = null; e.target.textContent = '▸ Animate build'; return; }
  e.target.textContent = '⏸ Pause';
  state.N = 0; terms.value = 0; render();
  building = setInterval(() => {
    if (state.N >= 14) { clearInterval(building); building = null; e.target.textContent = '▸ Animate build'; return; }
    state.N++; terms.value = state.N; render();
  }, 260);
};

const gc = document.getElementById('graph');
let dragging = false;
function setProbe(clientX) {
  const r = gc.getBoundingClientRect();
  let x = g.ux(clientX - r.left);
  x = Math.max(state.fn.view.xmin + 0.02, Math.min(state.fn.view.xmax - 0.02, x));
  state.probe = x; render();
}
gc.addEventListener('pointerdown', e => { dragging = true; gc.setPointerCapture(e.pointerId); setProbe(e.clientX); });
gc.addEventListener('pointermove', e => { if (dragging) setProbe(e.clientX); });
gc.addEventListener('pointerup', () => dragging = false);
gc.addEventListener('pointercancel', () => dragging = false);

g.onresize = render;

function render() {
  const fn = state.fn, N = state.N, px = state.probe;
  nLab.innerHTML = `${N}<small> deg</small>`;
  terms.style.setProperty('--fill', (N / 14 * 100) + '%');

  g.clear(); g.grid();
  g.plot(x => fn.f(x), { color: getCSS('--true'), width: 2.6 });
  g.plot(x => polyAt(fn, N, x), { color: getCSS('--approx'), width: 2.6, glow: 9 });

  const yt = fn.f(px), ya = polyAt(fn, N, px), err = Math.abs(yt - ya);
  g.vline(px, getCSS('--muted'));
  if (Number.isFinite(yt) && Number.isFinite(ya)) g.gap(px, yt, ya, getCSS('--error'));
  g.dot(px, yt, getCSS('--true')); g.dot(px, ya, getCSS('--approx'));

  document.getElementById('readout').innerHTML =
    `at x = <b>${fmt(px)}</b> &nbsp;·&nbsp; f = <b>${Number.isFinite(yt) ? yt.toFixed(4) : '—'}</b>` +
    ` &nbsp;·&nbsp; P<sub>${N}</sub> = <b>${Number.isFinite(ya) ? ya.toFixed(4) : '—'}</b>` +
    ` &nbsp;·&nbsp; error = <b class="er">${Number.isFinite(err) ? err.toExponential(2) : '—'}</b>`;

  document.getElementById('f-rhs').innerHTML = formula(fn, N);

  const ch = fn.challenge;
  const cErr = Math.abs(fn.f(ch.x0) - polyAt(fn, N, ch.x0));
  document.getElementById('c-goal').innerHTML = `Approximate <b>${ch.label}</b> at x = ${fmt(ch.x0)} to within the target error.`;
  document.getElementById('c-err').textContent = cErr.toExponential(2);
  document.getElementById('c-tol').textContent = ch.tol.toExponential(0);
  const ratio = Math.min(1, Math.log10(ch.tol / Math.max(cErr, 1e-16)) / 6 + 0.5);
  document.getElementById('c-bar').style.width = (Math.max(0, ratio) * 100) + '%';
  const cst = document.getElementById('c-state');
  if (cErr < ch.tol) {
    if (!state.solved) {
      state.solved = true;
      const bonus = Math.max(10, 60 - state.N * 4);
      shell.add(50 + bonus); shell.hitStreak(); shell.celebrate();
      shell.toast('Target hit!', `Solved with ${state.N} terms · +${50 + bonus}`, '🎯');
      if (state.N <= 4) shell.badge('efficient', 'Efficient', 'Solved in ≤ 4 terms', '⚡');
      shell.badge('sharp', 'Sharpshooter', 'Cleared a precision challenge', '🎯');
    }
    cst.textContent = `✓ Within target with ${state.N} terms.`; cst.className = 'cstate win';
  } else {
    cst.textContent = `Add terms — error still above target.`; cst.className = 'cstate';
  }
}

render();
