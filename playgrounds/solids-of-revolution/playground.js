import { Revolve3D, volumeSum, methodFor } from '../../engine/revolve-3d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, linearProgress } from '../../engine/challenge-meter.js';
import { REGIONS, AXES, methodReason, isExactAtAnyN } from './content.js';

/* ---- PLAYGROUND: thin wiring specific to "solids of revolution" ---- */

const N_MAX = 40;
const TOL_FRAC = 0.005;   // within 0.5% of the exact volume clears it

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

buttonGroup('fbtns', REGIONS, r => {
  state.region = r;
  useRegion();
  shell.award(`explore:${r.id}`, 5);
  explored.add(r.id);
  if (explored.size === REGIONS.length) shell.badge('explorer', 'Turner', 'Revolved every region', '🗺️');
  render();
});

buttonGroup('axes', AXES, ax => {
  state.axis = ax.id;
  useRegion();
  render();
}, { className: 'tbtn' });

const nSlider = slider('n', { onInput: v => { state.n = v; render(); } });

s('reset').onclick = () => { view.cam.home(); state.n = 2; nSlider.set(2); meter.reset(); render(); };

ticker('refine', {
  intervalMs: 110,
  playLabel: '▸ Refine n → ∞',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.n = 2; nSlider.set(2); render(); },
  onTick: () => {
    if (state.n >= N_MAX) return false;
    state.n++; nSlider.set(state.n); render();
  },
});

view.onresize = render;
view.onrender = render;
useRegion();

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
