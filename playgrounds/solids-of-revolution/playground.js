import { Revolve3D, volumeSum, methodFor } from '../../engine/revolve-3d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav, neighbours } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { REGIONS, AXES, methodReason, isExactAtAnyN, LESSON } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "solids of revolution" ---- */

const N_MAX = 40;
const TOL_FRAC = 0.005;   // within 0.5% of the exact volume clears it
const URL_SCHEMA = { region: 'string', axis: 'string', n: 'number' };

const view = new Revolve3D(document.getElementById('solid'));
const shell = new ScoreShell(createConfetti(), { slug: 'solids-of-revolution' });
const state = { region: REGIONS[0], axis: 'x', n: 2 };

const explored = new Set([REGIONS[0].id]);
const methodsSeen = new Set();

const meter = challengeMeter({
  format: v => (v * 100).toFixed(2) + '%',
  formatTol: t => (t * 100).toFixed(1) + '%',
  progress: linearProgress(8),
  onSolve: () => {
    const fresh = shell.award(`solve:${state.region.id}:${state.axis}`, 70);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Volume converged!', fresh
      ? `${methodFor(state.region, state.axis)}s reached the exact volume · +70`
      : 'Converged again', '🥁');
    shell.badge('revolve', 'Lathe Operator', 'Converged a solid of revolution', '🌀');
  },
});

function useRegion() {
  view.setRegion(state.region, state.axis);
  methodsSeen.add(methodFor(state.region, state.axis));
  if (methodsSeen.size === 3) shell.badge('methods', 'All Three', 'Used disks, washers and shells', '🧰');
  meter.reset();
}

const regionButtons = buttonGroup('fbtns', REGIONS, r => {
  state.region = r;
  useRegion();
  shell.award(`explore:${r.id}`, 5);
  explored.add(r.id);
  if (explored.size === REGIONS.length) shell.badge('explorer', 'Turner', 'Revolved every region', '🗺️');
  render();
  pushUrl();
});

const axisButtons = buttonGroup('axes', AXES, ax => {
  state.axis = ax.id;
  useRegion();
  render();
  pushUrl();
}, { className: 'tbtn' });

const nSlider = slider('n', { onInput: v => { state.n = v; render(); pushUrl(); } });

s('reset').onclick = () => { view.cam.home(); state.n = 2; nSlider.set(2); meter.reset(); render(); pushUrl(); };

ticker('refine', {
  intervalMs: 110,
  playLabel: '▸ Refine n → ∞',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.n = 2; nSlider.set(2); render(); pushUrl(); },
  onTick: () => {
    if (state.n >= N_MAX) return false;
    state.n++; nSlider.set(state.n); render();
    pushUrl();
  },
});

view.onresize = render;
view.onrender = render;
useRegion();

keyboardControl(s('solid'), {
  nudge: (dx, dy, big) => {
    state.n = Math.max(1, Math.min(N_MAX, state.n + dx * (big ? 5 : 1)));
    nSlider.set(state.n);
    render(); pushUrl();
  },
  step: (delta, big) => {
    state.n = Math.max(1, Math.min(N_MAX, state.n + delta * (big ? 5 : 1)));
    nSlider.set(state.n);
    render(); pushUrl();
  },
});

function render() {
  const { region, axis, n } = state;

  view.clear();
  view.renderAxis();
  view.renderPieces(n, { fill: [58, 118, 158] });
  view.renderOutline(24, { color: 'rgba(255,180,84,.5)' });

  const approx = volumeSum(region, axis, n);
  const exact = region.exact[axis];
  const relErr = Math.abs(approx - exact) / Math.abs(exact);
  const [method, why] = methodReason(region, axis);

  s('n-lab').innerHTML = `${n}<small> ${method}${n === 1 ? '' : 's'}</small>`;
  s('approx-val').textContent = fmt(approx);
  s('exact-val').textContent = fmt(exact);
  s('method-val').textContent = method;
  s('method-why').textContent = why;
  s('note').textContent = region.note;
  s('readout').innerHTML =
    `${region.tex}, revolved <b>${axis === 'y' ? 'about the y-axis' : 'about the x-axis'}</b>` +
    ` &nbsp;·&nbsp; ${n} ${method}${n === 1 ? '' : 's'} = <span class="pd">${fmt(approx)}</span>` +
    ` &nbsp;·&nbsp; exact = <b>${fmt(exact)}</b>`;

  if (isExactAtAnyN(region, axis, volumeSum)) {
    // Nothing to converge — say why rather than award a free win.
    meter.update({
      value: 9, tol: TOL_FRAC,
      goal: `<b>Exact at every n.</b> Revolving ${region.tex} about the x-axis makes the integrand π(√x)² = πx — linear, and the midpoint rule is exact for a straight line. Even one ${method} gives the true volume.`,
      solvedText: '',
      hintText: 'No approximation to improve here — try another region or axis.',
    });
  } else {
    meter.update({
      value: relErr, tol: TOL_FRAC,
      goal: `Add ${method}s until their total volume reaches the exact <b>${fmt(exact)}</b>.`,
      solvedText: `✓ ${n} ${method}${n === 1 ? '' : 's'} land within 0.5% of the exact volume.`,
      hintText: `Add ${method}s — the staircase still overshoots and undershoots the true solid.`,
    });
  }
}

render();

mountNav('solids-of-revolution');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.region) {
    const r = REGIONS.find(x => x.id === st.region);
    if (r) { state.region = r; regionButtons.select(REGIONS.indexOf(r), { notify: false }); }
  }
  if (st.axis) {
    const i = AXES.findIndex(a => a.id === st.axis);
    if (i >= 0) { state.axis = st.axis; axisButtons.select(i, { notify: false }); }
  }
  useRegion();
  if (typeof st.n === 'number') { state.n = st.n; nSlider.set(st.n); }
  render();
  pushUrl();
}

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({ region: state.region.id, axis: state.axis, n: state.n });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'solids-of-revolution', onJump: applyState, links: neighbours('solids-of-revolution') });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
