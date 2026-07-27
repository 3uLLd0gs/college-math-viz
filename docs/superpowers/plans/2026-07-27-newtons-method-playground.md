# Newton's Method Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new Newton's-method playground (Calc 1, `Grapher2D`) with full feature parity — deep-linking, keyboard/ARIA, presenter/print, a lesson with a self-check and cross-links, scoreboard/challenge, sequencer/landing/nav, and the full test+E2E treatment.

**Architecture:** Templated on `secant-tangent` (Grapher2D, analytic `df`, an inset). A pure math layer (`content.js`: `FUNCTIONS`, `newtonStep`/`newtonRun`/`nearestRoot`, `LESSON`) drives a thin wiring layer (`playground.js`). Four registry functions showcase convergence and the three classic failure modes (fling, basins, 2-cycle).

**Tech Stack:** Vanilla JS ES modules, Vitest + happy-dom (unit), Playwright (E2E), Vite multi-page build. No runtime dependencies.

## Global Constraints

- **No runtime network calls inside a playground; no backend.** Math is Unicode in `<code>`.
- **Design system fixed.** Colours from `engine/tokens.css`; `engine/chrome.css` linked (never `@import`ed); page-specific CSS in the page's own `<style>`.
- **TDD for the pure math layer** (`content.js` via `content.test.js`); canvas behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `newtons-method-playground`. **Slug:** `newtons-method` (verbatim). **Course:** `calc1`. **Prereq:** `secant-tangent`.

---

## File Structure

- Create `playgrounds/newtons-method/content.js` — `FUNCTIONS`, math helpers, `LESSON`.
- Create `playgrounds/newtons-method/content.test.js` — math correctness (TDD).
- Create `playgrounds/newtons-method/index.html` — the page.
- Create `playgrounds/newtons-method/playground.js` — wiring.
- Modify `engine/sequencer.js` — catalogue entry (with `prereq`).
- Modify `vite.config.js` — build input.
- Modify `e2e/jumps.spec.js`, `e2e/deep-link.spec.js` — add slug; Create `e2e/newtons-method.spec.js`.

---

## Task 1: `content.js` math + `content.test.js`

**Files:**
- Create: `playgrounds/newtons-method/content.js`
- Create: `playgrounds/newtons-method/content.test.js`

**Interfaces:**
- Produces: `FUNCTIONS` (array of `{ id, label, tex, f, df, roots, start, view, challenge, note? }`); `newtonStep(fn, x) -> number` (NaN when flat); `newtonRun(fn, x0, steps) -> number[]`; `nearestRoot(fn, x) -> number`.

- [ ] **Step 1: Write the failing tests**

```js
// playgrounds/newtons-method/content.test.js
import { describe, it, expect } from 'vitest';
import { FUNCTIONS, newtonStep, newtonRun, nearestRoot } from './content.js';

const fn = id => FUNCTIONS.find(f => f.id === id);

describe('every declared derivative is the real one', () => {
  const numDf = (f, x, h = 1e-6) => (f(x + h) - f(x - h)) / (2 * h);
  FUNCTIONS.forEach(f => {
    [f.start, f.start + 0.5, f.start - 0.3].forEach(x => {
      it(`${f.id}: f' at ${x.toFixed(2)} matches a central difference`, () => {
        expect(f.df(x)).toBeCloseTo(numDf(f.f, x), 5);
      });
    });
  });
});

describe('every declared root is a root', () => {
  FUNCTIONS.forEach(f => {
    f.roots.forEach(r => {
      it(`${f.id}: f(${r.toFixed(4)}) ≈ 0`, () => {
        expect(Math.abs(f.f(r))).toBeLessThan(1e-9);
      });
    });
  });
});

describe('newtonStep and newtonRun', () => {
  it('one step of x²−2 from 2 moves toward √2', () => {
    expect(newtonStep(fn('quad'), 2)).toBeCloseTo(1.5, 12);   // 2 − 2/4
  });
  it('x²−2 converges to √2 from x0=2', () => {
    const seq = newtonRun(fn('quad'), 2, 8);
    expect(seq[seq.length - 1]).toBeCloseTo(Math.SQRT2, 6);
  });
  it('cos x − x converges to its root from x0=-0.5', () => {
    const seq = newtonRun(fn('cosx'), -0.5, 10);
    expect(seq[seq.length - 1]).toBeCloseTo(0.7390851332, 6);
  });
  it('a flat tangent (f′=0) flings: newtonStep returns NaN and the run stops', () => {
    expect(Number.isNaN(newtonStep(fn('quad'), 0))).toBe(true);   // f'(0)=0
    expect(newtonRun(fn('quad'), 0, 5)).toEqual([0]);             // breaks immediately
  });
  it('x³−2x+2 from x0=0 cycles 0↔1 forever and never reaches the real root', () => {
    const seq = newtonRun(fn('cycle'), 0, 8);
    expect(seq).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0]);
    const root = fn('cycle').roots[0];                            // ≈ -1.769
    expect(Math.abs(seq[seq.length - 1] - root)).toBeGreaterThan(1);
  });
});

describe('nearestRoot', () => {
  it('picks the closest registry root', () => {
    expect(nearestRoot(fn('cubic'), 0.4)).toBe(0);
    expect(nearestRoot(fn('cubic'), 0.7)).toBe(1);
    expect(nearestRoot(fn('cubic'), -0.8)).toBe(-1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run playgrounds/newtons-method/content.test.js`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the math half of `content.js`**

```js
/* ---- CONTENT: the FUNCTIONS registry — the only part that changes per concept ----
   Each row carries f, its analytic derivative df, its real roots, and a `start`
   where the iteration begins. Four functions cover the whole story: one that
   always converges, and the three classic ways Newton's method fails. */
export const FUNCTIONS = [
  { id: 'cosx', label: 'cos x − x', tex: 'cos x − x',
    f: x => Math.cos(x) - x, df: x => -Math.sin(x) - 1,
    roots: [0.7390851332151607], start: -0.5,
    view: { xmin: -2, xmax: 3, ymin: -3, ymax: 2 }, challenge: { tol: 1e-4 } },

  { id: 'quad', label: 'x² − 2', tex: 'x² − 2',
    f: x => x * x - 2, df: x => 2 * x,
    roots: [-Math.SQRT2, Math.SQRT2], start: 2,
    view: { xmin: -3, xmax: 3, ymin: -3, ymax: 4 }, challenge: { tol: 1e-4 },
    note: 'Start exactly at x = 0 and the tangent is flat — the estimate is flung to infinity.' },

  { id: 'cubic', label: 'x³ − x', tex: 'x³ − x',
    f: x => x * x * x - x, df: x => 3 * x * x - 1,
    roots: [-1, 0, 1], start: 1.2,
    view: { xmin: -2, xmax: 2, ymin: -1.6, ymax: 1.6 }, challenge: { tol: 1e-4 },
    note: 'Nudge the start just a little and Newton lands on a different one of the three roots.' },

  { id: 'cycle', label: 'x³ − 2x + 2', tex: 'x³ − 2x + 2',
    f: x => x * x * x - 2 * x + 2, df: x => 3 * x * x - 2,
    roots: [-1.7692923542386314], start: -2.4,
    view: { xmin: -3, xmax: 2, ymin: -3, ymax: 6 }, challenge: { tol: 1e-4 },
    note: 'Start at x = 0 and Newton cycles 0 → 1 → 0 → 1 forever, never reaching the root.' },
];

const FLAT = 1e-7;   // |f′| below this is a flat tangent — the next estimate flings off

/** One Newton iteration x − f(x)/f′(x). Returns NaN when the tangent is flat
   (division would fling the estimate to infinity), so callers can stop cleanly. */
export function newtonStep(fn, x) {
  const d = fn.df(x);
  if (!Number.isFinite(d) || Math.abs(d) < FLAT) return NaN;
  const next = x - fn.f(x) / d;
  return Number.isFinite(next) ? next : NaN;
}

/** The sequence [x0, x1, …] of up to `steps` Newton iterations. Stops early
   (returns a shorter array) as soon as a step flings — so `seq.length < steps+1`
   is exactly the "flung" signal. */
export function newtonRun(fn, x0, steps) {
  const seq = [x0];
  for (let i = 0; i < steps; i++) {
    const next = newtonStep(fn, seq[seq.length - 1]);
    if (!Number.isFinite(next)) break;
    seq.push(next);
  }
  return seq;
}

/** The registry root nearest x — used to report which root the iteration is
   heading for (and, for the cubic, which basin a start belongs to). */
export function nearestRoot(fn, x) {
  return fn.roots.reduce((best, r) => (Math.abs(r - x) < Math.abs(best - x) ? r : best), fn.roots[0]);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run playgrounds/newtons-method/content.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add playgrounds/newtons-method/content.js playgrounds/newtons-method/content.test.js
git commit -m "feat: Newton's-method registry and iteration math with tests"
```

---

## Task 2: `content.js` — the `LESSON` teaching layer

**Files:**
- Modify: `playgrounds/newtons-method/content.js` (append `LESSON`)

**Interfaces:**
- Produces: `LESSON` — `{ title, intro, steps: [...] }`. Prose steps carry `{ level, title, body, state, jump }`; the self-check step carries `{ level, check: { q, options:[{text, correct?, why}], state } }`. `level` ∈ `intuition`/`use`/`advanced`/`real` (the lesson panel groups by these). Every `state` uses only `URL_SCHEMA` keys `{ fn, x0, n }`.

- [ ] **Step 1: Append `LESSON` to `content.js`**

Append verbatim:

```js
/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'A root is a fixed point you can chase with tangents',
  intro: `Solving <code>f(x) = 0</code> exactly is usually impossible. Newton's method gives up on
    exact and iterates instead: stand at a guess, slide down the <b>tangent</b> to where it crosses the
    axis, and use that as the next guess. When it works it is breathtakingly fast — and when it fails,
    it fails in three memorable ways this page lets you trigger on purpose.`,
  steps: [
    { level: 'intuition', title: 'One tangent, one better guess',
      body: `Start at <code>x₀</code> on <code>x² − 2</code>. Draw the tangent there and follow it down
        to the axis — that crossing is <code>x₁</code>, already closer to <code>√2</code>. That is the
        whole idea: replace the hard curve with its easy tangent line, and solve the line instead.`,
      state: { fn: 'quad', x0: 2, n: 1 }, jump: 'Show me the first step' },

    { level: 'intuition', title: 'Repeat, and watch it race in',
      body: `Feed <code>x₁</code> back in and repeat. Each tangent lands nearer the root than the last —
        the error roughly <em>squares</em> every step, so correct digits double. Three or four steps
        take you from a rough guess to machine precision.`,
      state: { fn: 'quad', x0: 2, n: 6 }, jump: 'Iterate to the root' },

    { level: 'use', title: 'It solves things algebra cannot',
      body: `<code>cos x − x = 0</code> has no closed-form solution, but Newton does not care — it only
        needs <code>f</code> and <code>f′</code>. From <code>x₀ = −0.5</code> it converges on
        <code>0.739…</code> in a handful of steps. This is how calculators actually compute roots,
        reciprocals and square roots under the hood.`,
      state: { fn: 'cosx', x0: -0.5, n: 6 }, jump: 'Solve cos x = x' },

    { level: 'use', check: {
      q: 'You start Newton’s method exactly at a point where f′(x₀) = 0 — the tangent is perfectly flat. What happens to the next estimate x₁?',
      options: [
        { text: 'It flies off toward infinity — a flat tangent never crosses the axis nearby', correct: true,
          why: 'Right. x₁ = x₀ − f/f′ divides by f′ ≈ 0, so the step blows up. On x² − 2 starting at x = 0 there is no finite next guess at all — the method has nothing to follow.' },
        { text: 'It stays at x₀ forever, since the slope is zero', why: 'A zero slope does not pin the estimate — it does the opposite. Dividing f by a near-zero f′ makes the correction enormous, not zero.' },
        { text: 'It jumps straight to the nearest root', why: 'Only a lucky accident would do that. A flat tangent gives no useful direction; generically the estimate is flung far away.' },
      ],
      state: { fn: 'quad', x0: 0, n: 1 },
    } },

    { level: 'advanced', title: 'Failure one: the flat-tangent fling',
      body: `Set the function to <code>x² − 2</code> and drag the start to <code>x₀ = 0</code>. The
        tangent is horizontal, so it never meets the axis and the next estimate is undefined — the run
        simply stops. Any <code>x₀</code> that lands near a place where <code>f′ ≈ 0</code> gets thrown
        wildly off course.`,
      state: { fn: 'quad', x0: 0, n: 1 }, jump: 'Trigger the fling' },

    { level: 'advanced', title: 'Failure two: the wrong basin',
      body: `<code>x³ − x</code> has three roots at <code>−1, 0, 1</code>. Which one Newton finds depends
        delicately on where you start — the "basins of attraction" interlock, and near their boundaries a
        tiny change in <code>x₀</code> flips the destination. Drag the start slowly and watch the landing
        root jump.`,
      state: { fn: 'cubic', x0: 0.5, n: 8 }, jump: 'Land on a surprising root' },

    { level: 'advanced', title: 'Failure three: the eternal cycle',
      body: `<code>x³ − 2x + 2</code> from <code>x₀ = 0</code> is the textbook trap: the tangent sends you
        to <code>1</code>, the tangent there sends you back to <code>0</code>, and Newton loops
        <code>0 → 1 → 0 → 1</code> forever without ever approaching the real root near <code>−1.77</code>.
        Convergence is never guaranteed — only fast when it happens.`,
      state: { fn: 'cycle', x0: 0, n: 8 }, jump: 'Show me the 2-cycle' },

    { level: 'real', title: 'Where this actually runs',
      body: `Newton and its cousins power the solvers underneath almost everything numeric: a GPS receiver
        trilaterating your position, an optimiser training a model (that is Newton on the gradient),
        a CAD kernel intersecting surfaces, a power-grid load-flow. The quadratic convergence is why they
        can afford to solve millions of these per second — and the failure modes here are exactly the
        edge cases that production code has to damp, bracket, or fall back from.`,
      figure: `<svg viewBox="0 0 260 120" role="img" aria-label="A guess sliding down a tangent to a better guess, twice">
  <path d="M14 96 H246" stroke="#7e98c4" stroke-opacity=".4"/>
  <path d="M28 20 Q150 150 236 60" fill="none" stroke="#ffb454" stroke-width="2"/>
  <g stroke="#3df2c0" stroke-width="2"><path d="M60 74 L150 96"/><path d="M150 40 L200 96"/></g>
  <g fill="#ffd76a"><circle cx="60" cy="74" r="4"/><circle cx="150" cy="40" r="4"/></g>
  <g fill="#3df2c0"><circle cx="150" cy="96" r="3.2"/><circle cx="200" cy="96" r="3.2"/></g>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab">
    <text x="60" y="112" text-anchor="middle" fill="#ffd76a">x₀</text>
    <text x="150" y="112" text-anchor="middle">x₁</text>
    <text x="200" y="112" text-anchor="middle" fill="#3df2c0">x₂</text>
  </g>
</svg>`,
      state: { fn: 'cosx', x0: -0.5, n: 3 }, jump: 'Watch two clean steps' },
  ],
};
```

- [ ] **Step 2: Run the suite; commit**

Run: `npm test` (the `content.test.js` from Task 1 still passes — `LESSON` is data, exercised by the E2E lesson-jump invariant in Task 5). `npm run build` is not needed yet (no page).
Expected: green.

```bash
git add playgrounds/newtons-method/content.js
git commit -m "content: Newton's-method lesson with self-check and failure-mode jumps"
```

---

## Task 3: `index.html` + `playground.js` (the page + full wiring)

**Files:**
- Create: `playgrounds/newtons-method/index.html`
- Create: `playgrounds/newtons-method/playground.js`

**Interfaces:**
- Consumes: `FUNCTIONS`, `newtonRun`, `nearestRoot`, `LESSON` (`content.js`); `Grapher2D`; `ScoreShell`; `mountNav`, `neighbours` (`sequencer.js`); `createConfetti`; `s`, `getCSS`, `fmtNum`, `mountPresenter` (`dom.js`); `buttonGroup`, `slider`, `ticker` (`control-panel.js`); `challengeMeter`, `logProgress` (`challenge-meter.js`); `mountLesson`; `readState`, `makeUrlSync`, `stateToParams`, `syncedUrl` (`deep-link.js`); `keyboardControl`.

- [ ] **Step 1: Create `index.html`** (mirrors the standard playground anatomy — header with brand + `#present` + scoreboard, `#fx` confetti canvas, `.toast-wrap`, graph card with `#graph` canvas + readout, panel with controls + facts + inset + challenge, lesson mounts in JS)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Newton's Method · Follow the Tangent to the Root</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../engine/chrome.css">
<style>
  :root{ --graph-min:450px; --graph-min-sm:340px; --readout-max:470px; --fbtn-cols:2; --panel-gap:15px; }
  #graph{display:block;width:100%;height:100%;touch-action:none;cursor:col-resize}
  .readout .pd{color:var(--approx);font-weight:700}
  .readout .er{color:var(--error)}
  .slabel{display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px;color:var(--muted);margin-bottom:7px}
  .slabel b{color:var(--ink);font-family:"Fraunces",serif;font-weight:700;font-size:16px}
  .facts{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .fact{background:#080b12;border:1px solid var(--line);border-radius:10px;padding:9px 11px}
  .fact .k{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .fact .v{font-family:"Fraunces",serif;font-weight:700;font-size:17px;margin-top:2px}
  .fact.xn .v{color:var(--approx)}
  .fact.err .v{color:var(--error)}
  .inset-wrap{background:#080b12;border:1px solid var(--line);border-radius:11px;padding:10px 12px 6px}
  .inset-wrap .cap{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .inset-wrap .cap b{color:var(--error);font-weight:500}
  #inset{display:block;width:100%;height:104px}
</style>
</head>
<body>
<canvas id="fx"></canvas>
<div class="toast-wrap" id="toasts"></div>
<div class="wrap">
  <header>
    <div class="brand">
      <div class="kicker">Math · Visual Studio</div>
      <h1>Newton's <em>Method</em></h1>
    </div>
    <button class="chip" id="present" type="button" title="Presenter mode" aria-pressed="false" style="cursor:pointer">Present</button>
    <div class="scoreboard">
      <div class="chip pts"><div class="lab">Points</div><div class="val" id="s-pts">0</div></div>
      <div class="chip streak"><div class="lab">Streak</div><div class="val" id="s-streak">0</div></div>
      <div class="chip"><div class="lab">Badges</div><div class="val" id="s-badges">0</div></div>
    </div>
  </header>
  <div class="studio">
    <div class="card graph-card">
      <canvas id="graph" role="img" aria-label="Newton's method graph. Arrow keys move the starting point x-zero; plus and minus add or remove iteration steps." aria-describedby="readout"></canvas>
      <div class="graph-tag">drag left ⟷ right to set the starting point x₀</div>
      <div class="legend">
        <span><i class="swatch" style="background:var(--true)"></i> f(x)</span>
        <span><i class="swatch" style="background:var(--approx)"></i> iterates xₙ</span>
        <span><i class="swatch" style="background:var(--gold)"></i> current guess</span>
      </div>
      <div class="readout" id="readout" role="status" aria-live="polite"></div>
    </div>
    <div class="card panel">
      <div>
        <div class="sect-lab">Function f(x)</div>
        <div class="fbtns" id="fbtns"></div>
      </div>
      <div>
        <div class="slabel"><span>steps n</span> <b id="n-val">0</b></div>
        <input type="range" class="mint" id="n" min="0" max="12" value="0" step="1" aria-label="Number of Newton iterations">
        <div class="row" style="margin-top:12px">
          <button class="action primary" id="iterate">▸ Iterate → root</button>
          <button class="action" id="reset">Reset</button>
          <button class="action" id="copylink">Copy link</button>
        </div>
      </div>
      <div class="facts">
        <div class="fact xn"><div class="k">current xₙ</div><div class="v" id="xn-val">—</div></div>
        <div class="fact err"><div class="k">|f(xₙ)|</div><div class="v" id="err-val">—</div></div>
      </div>
      <div class="inset-wrap">
        <div class="cap">|f(xₖ)| by step k — the race to <b>zero</b></div>
        <canvas id="inset"></canvas>
      </div>
      <div class="challenge">
        <div class="lab">◆ Root challenge</div>
        <div class="goal" id="c-goal"></div>
        <div class="cmeter"><span>|f(xₙ)| <b id="c-val">—</b></span><span>target <b id="c-tol">—</b></span></div>
        <div class="cbar"><i id="c-bar"></i></div>
        <div class="cstate" id="c-state">Set a start, then iterate until the curve touches zero.</div>
      </div>
    </div>
  </div>
</div>
<script type="module" src="./playground.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `playground.js`**

```js
import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { mountNav, neighbours } from '../../engine/sequencer.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt, mountPresenter } from '../../engine/dom.js';
import { buttonGroup, slider, ticker } from '../../engine/control-panel.js';
import { challengeMeter, logProgress } from '../../engine/challenge-meter.js';
import { mountLesson } from '../../engine/lesson.js';
import { readState, makeUrlSync, stateToParams, syncedUrl } from '../../engine/deep-link.js';
import { keyboardControl } from '../../engine/keyboard.js';
import { FUNCTIONS, newtonRun, nearestRoot, LESSON } from './content.js';

const MAX_N = 12;   // must match the #n slider max in index.html
const URL_SCHEMA = { fn: 'string', x0: 'number', n: 'number' };

const g = new Grapher2D(document.getElementById('graph'));
const shell = new ScoreShell(createConfetti(), { slug: 'newtons-method' });
const state = { fn: FUNCTIONS[0], x0: FUNCTIONS[0].start, n: 0 };
g.setView(state.fn.view);

const explored = new Set([FUNCTIONS[0].id]);

const meter = challengeMeter({
  format: v => v.toExponential(2),
  formatTol: t => t.toExponential(0),
  progress: logProgress(5),
  onSolve: () => {
    const bonus = Math.max(10, 60 - 6 * state.n);
    const fresh = shell.award(`solve:${state.fn.id}`, 40 + bonus);
    shell.hitStreak(); shell.celebrate();
    shell.toast('Root found!', fresh
      ? `|f(xₙ)| below target in ${state.n} step${state.n === 1 ? '' : 's'} · +${40 + bonus}`
      : 'On target again', '🎯');
    if (state.n <= 4) shell.badge('fast', 'Quadratic', 'Reached a root in ≤ 4 steps', '⚡');
    shell.badge('root', 'Root Finder', 'Cleared a Newton challenge', '🎯');
  },
});

function clampX0(x) { return Math.max(state.fn.view.xmin + 0.1, Math.min(state.fn.view.xmax - 0.1, x)); }

const fnButtons = buttonGroup('fbtns', FUNCTIONS, fn => {
  state.fn = fn; state.x0 = fn.start; state.n = 0;
  nSlider.set(0); g.setView(fn.view); meter.reset();
  shell.award(`explore:${fn.id}`, 5);
  explored.add(fn.id);
  if (explored.size === FUNCTIONS.length) shell.badge('explorer', 'Solver', 'Tried every function', '🧭');
  render(); pushUrl();
});

const nSlider = slider('n', {
  onInput: v => {
    state.n = v;
    if (state.n === MAX_N) shell.badge('patient', 'Full Run', `Iterated ${MAX_N} steps`, '♾️');
    render(); pushUrl();
  },
});

s('reset').onclick = () => { state.x0 = state.fn.start; state.n = 0; nSlider.set(0); meter.reset(); render(); pushUrl(); };

ticker('iterate', {
  intervalMs: 260,
  playLabel: '▸ Iterate → root',
  pauseLabel: '⏸ Pause',
  onStart: () => { state.n = 0; nSlider.set(0); render(); pushUrl(); },
  onTick: () => {
    if (state.n >= MAX_N) return false;
    state.n++; nSlider.set(state.n); render();
    pushUrl();
  },
});

g.onresize = render;

keyboardControl(document.getElementById('graph'), {
  nudge: (dx, _dy, big) => { state.x0 = clampX0(state.x0 + dx * (big ? 0.25 : 0.05)); state.n = 0; nSlider.set(0); render(); pushUrl(); },
  step: (delta, big) => { state.n = Math.max(0, Math.min(MAX_N, state.n + delta * (big ? 3 : 1))); nSlider.set(state.n); render(); pushUrl(); },
  home: () => { state.x0 = state.fn.start; state.n = 0; nSlider.set(0); render(); pushUrl(); },
});

// drag along x to set the starting point
let dragging = false;
const graph = document.getElementById('graph');
const setFromEvent = e => {
  const r = graph.getBoundingClientRect();
  state.x0 = clampX0(g.ux(e.clientX - r.left));
  state.n = 0; nSlider.set(0); render(); pushUrl();
};
graph.addEventListener('pointerdown', e => { dragging = true; graph.setPointerCapture(e.pointerId); setFromEvent(e); });
graph.addEventListener('pointermove', e => { if (dragging) setFromEvent(e); });
graph.addEventListener('pointerup', e => { dragging = false; graph.releasePointerCapture(e.pointerId); });

function statusWord(seq, xn) {
  const flung = seq.length < state.n + 1;
  if (flung) return 'flung — the tangent was nearly flat';
  if (state.n >= 4 && seq.length >= 5) {
    const a = seq[seq.length - 1], b = seq[seq.length - 3];
    if (Math.abs(a - b) > 0.3 && Math.abs(state.fn.f(xn)) > 0.1) return 'cycling — it loops without converging';
  }
  if (Math.abs(state.fn.f(xn)) < state.fn.challenge.tol) return 'converged';
  return 'converging';
}

function render() {
  const { fn, x0, n } = state;
  const seq = newtonRun(fn, x0, n);
  const xn = seq[seq.length - 1];
  const flung = seq.length < n + 1;

  g.clear(); g.grid();
  for (const r of fn.roots) g.dot(r, 0, getCSS('--muted'));
  g.plot(x => fn.f(x), { color: getCSS('--true'), width: 2.6, glow: 6 });

  const c = g.ctx;
  // iteration path: tangent segment from (xi, f(xi)) to (x_{i+1}, 0), then a drop to the curve
  c.save();
  for (let i = 0; i < seq.length - 1; i++) {
    const xi = seq[i], yi = fn.f(xi), xnext = seq[i + 1];
    c.strokeStyle = getCSS('--error'); c.globalAlpha = 0.85; c.lineWidth = 1.6; c.setLineDash([6, 4]);
    c.beginPath(); c.moveTo(g.sx(xi), g.sy(yi)); c.lineTo(g.sx(xnext), g.sy(0)); c.stroke();
    c.globalAlpha = 0.4; c.setLineDash([2, 3]);
    c.beginPath(); c.moveTo(g.sx(xnext), g.sy(0)); c.lineTo(g.sx(xnext), g.sy(fn.f(xnext))); c.stroke();
  }
  c.restore();
  for (let i = 0; i < seq.length; i++) g.dot(seq[i], fn.f(seq[i]), getCSS('--approx'));
  g.dot(x0, fn.f(x0), getCSS('--gold'));
  if (Number.isFinite(xn)) g.dot(xn, 0, getCSS('--gold'));

  const err = Math.abs(fn.f(xn));
  s('n-val').textContent = String(n);
  s('xn-val').textContent = flung ? '∞' : fmt(xn);
  s('err-val').textContent = flung ? '—' : err.toExponential(2);
  const status = statusWord(seq, xn);
  s('readout').innerHTML =
    `f(x) = <b>${fn.tex}</b> &nbsp;·&nbsp; start x₀ = <b>${fmt(x0)}</b>` +
    ` &nbsp;·&nbsp; after ${n} step${n === 1 ? '' : 's'}: x${n === 0 ? '₀' : 'ₙ'} = <span class="pd">${flung ? '∞' : fmt(xn)}</span>` +
    ` &nbsp;·&nbsp; |f(xₙ)| = <b class="er">${flung ? '∞' : err.toExponential(2)}</b> &nbsp;·&nbsp; <b>${status}</b>`;

  drawInset(seq);

  const solvable = !flung;
  meter.update({
    value: flung ? 9e9 : err, tol: fn.challenge.tol,
    goal: `Iterate until the curve touches the axis — drive <b>|f(xₙ)|</b> below the target. This start heads for the root near <b>${fmt(nearestRoot(fn, xn))}</b>.`,
    solvedText: `✓ Root found — |f(xₙ)| ≈ ${flung ? '' : err.toExponential(1)} after ${n} steps.`,
    hintText: solvable ? 'Add steps — each tangent lands closer to the root.'
      : 'This start flings off a flat tangent — drag x₀ away from where f′ = 0.',
  });
}

function drawInset(seq) {
  const cv = s('inset'), ctx = cv.getContext('2d'); const dpr = devicePixelRatio || 1;
  const w = cv.clientWidth, hh = cv.clientHeight;
  cv.width = w * dpr; cv.height = hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hh);
  const pad = 8;
  const errs = seq.map(x => Math.max(Math.abs(state.fn.f(x)), 1e-16));
  const logs = errs.map(e => Math.log10(e));
  const kmax = Math.max(seq.length - 1, 1);
  const lo = Math.min(-16, ...logs), hi = Math.max(1, ...logs);
  const SX = k => pad + (k / kmax) * (w - 2 * pad);
  const SY = l => pad + (hi - l) / (hi - lo) * (hh - 2 * pad);
  // target line
  ctx.strokeStyle = getCSS('--error'); ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
  const tl = Math.log10(state.fn.challenge.tol);
  ctx.beginPath(); ctx.moveTo(pad, SY(tl)); ctx.lineTo(w - pad, SY(tl)); ctx.stroke(); ctx.setLineDash([]);
  // the |f(xk)| trace
  ctx.strokeStyle = getCSS('--approx'); ctx.lineWidth = 2; ctx.beginPath();
  logs.forEach((l, k) => (k ? ctx.lineTo(SX(k), SY(l)) : ctx.moveTo(SX(k), SY(l))));
  ctx.stroke();
  ctx.fillStyle = getCSS('--approx');
  logs.forEach((l, k) => { ctx.beginPath(); ctx.arc(SX(k), SY(l), 2.6, 0, 7); ctx.fill(); });
}

render();
mountNav('newtons-method');

/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.fn) {
    const fn = FUNCTIONS.find(f => f.id === st.fn);
    if (fn) { state.fn = fn; fnButtons.select(FUNCTIONS.indexOf(fn), { notify: false }); g.setView(fn.view); state.x0 = fn.start; }
  }
  if (typeof st.x0 === 'number') state.x0 = clampX0(st.x0);
  if (typeof st.n === 'number') { state.n = Math.max(0, Math.min(MAX_N, st.n)); nSlider.set(state.n); }
  meter.reset();
  render();
  pushUrl();
}

const urlState = () => ({ fn: state.fn.id, x0: state.x0, n: state.n });
const pushUrl = makeUrlSync(() => stateToParams(urlState()));

mountLesson(LESSON, { slug: 'newtons-method', onJump: applyState, links: neighbours('newtons-method') });

const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);

s('copylink').onclick = async () => {
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()))}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};

mountPresenter();
```

- [ ] **Step 3: Verify wiring**

The page cannot build until Task 4 adds it to the Vite input and the sequencer entry (so `mountNav('newtons-method')` / `neighbours('newtons-method')` resolve). Confirm by reading: every import resolves to a real export; `#graph`/`#present`/`#fx`/`#s-pts`/`#n`/`#iterate`/`#reset`/`#copylink`/`#c-goal` exist. Do NOT commit yet — commit with Task 4 so the branch never has an unwired page. Proceed to Task 4.

---

## Task 4: sequencer + Vite integration

**Files:**
- Modify: `engine/sequencer.js`
- Modify: `vite.config.js`

**Interfaces:**
- Consumes: the page from Task 3. Produces: the catalogue entry `{ slug:'newtons-method', course:'calc1', kind implicit playground, title, tag, blurb, prereq:'secant-tangent' }`.

- [ ] **Step 1: Add the sequencer entry (with prereq)**

In `engine/sequencer.js`, in the `PLAYGROUNDS` array, insert this entry immediately AFTER the `secant-tangent` entry (so Newton follows Secant→Tangent in the Calc 1 teaching order):

```js
  {
    slug: 'newtons-method', course: 'calc1',
    title: "Newton's Method",
    tag: 'Follow the tangent to the root',
    blurb: 'Chase a root by sliding down tangent lines. Watch it converge in a few quadratic steps — then trigger the three classic ways it fails: the flat-tangent fling, the wrong basin, and the eternal cycle.',
    prereq: 'secant-tangent',
  },
```

- [ ] **Step 2: Add the Vite build input**

In `vite.config.js`, in `rollupOptions.input`, after the `secant-tangent` line, add:

```js
        'secant-tangent': resolve(__dirname, 'playgrounds/secant-tangent/index.html'),
        'newtons-method': resolve(__dirname, 'playgrounds/newtons-method/index.html'),
```

- [ ] **Step 3: Build + suite; commit Tasks 3 + 4 together**

Run: `npm test && npm run build`
Expected: unit suite green; build emits `dist/playgrounds/newtons-method/index.html` with no error. Spot-check by trace: `mountNav('newtons-method')` finds the entry (course `calc1`), `neighbours('newtons-method')` returns `{ prereq: secant-tangent, next: … }`, and the landing page renders a Calc 1 card for it.

```bash
git add playgrounds/newtons-method/index.html playgrounds/newtons-method/playground.js engine/sequencer.js vite.config.js
git commit -m "feat: Newton's Method playground wired into Calc 1"
```

---

## Task 5: E2E — parity coverage + a Newton spec

**Files:**
- Modify: `e2e/jumps.spec.js`, `e2e/deep-link.spec.js`
- Create: `e2e/newtons-method.spec.js`

- [ ] **Step 1: Add the slug to the shared E2E invariants**

In `e2e/jumps.spec.js`, add `'newtons-method'` to the `SLUGS` array (the per-playground "every lesson jump yields a distinct state, no console error" loop). In `e2e/deep-link.spec.js`, if it has a per-slug list, add `'newtons-method'`; otherwise leave it (the Newton-specific deep-link is covered below). Read each file first to place the slug in the existing array verbatim.

- [ ] **Step 2: Write the Newton-specific spec**

```js
// e2e/newtons-method.spec.js
import { test, expect } from '@playwright/test';

test('a deep-linked converged run shows a tiny residual', async ({ page }) => {
  await page.goto('/playgrounds/newtons-method/?fn=quad&x0=2&n=8');
  const readout = (await page.locator('#readout').textContent()) ?? '';
  expect(readout).toContain('converged');
  // current xₙ ≈ √2 ≈ 1.414
  await expect(page.locator('#xn-val')).toContainText('1.41');
});

test('the Iterate control advances the step count and drives the residual down', async ({ page }) => {
  await page.goto('/playgrounds/newtons-method/?fn=quad&x0=2&n=1');
  const before = (await page.locator('#err-val').textContent()) ?? '';
  await page.locator('#n').fill('7');            // step the slider up
  await page.locator('#n').dispatchEvent('input');
  await expect(page.locator('#n-val')).toHaveText('7');
  const after = (await page.locator('#err-val').textContent()) ?? '';
  expect(after).not.toBe(before);                // the residual changed as steps grew
  expect(page.locator('#readout')).toContainText(/converg/);
});

test('the 2-cycle case reports cycling, not convergence', async ({ page }) => {
  await page.goto('/playgrounds/newtons-method/?fn=cycle&x0=0&n=8');
  await expect(page.locator('#readout')).toContainText('cycling');
  await expect(page.locator('#challenge')).toBeVisible();
});

test('the flat-tangent fling is reported, not crashed', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/playgrounds/newtons-method/?fn=quad&x0=0&n=3');
  await expect(page.locator('#readout')).toContainText('flung');
  expect(errors).toEqual([]);
});

test('Copy-link round-trips fn / x0 / n', async ({ page, context }) => {
  await page.goto('/playgrounds/newtons-method/?fn=cosx&x0=-0.5&n=6');
  const url = page.url();
  expect(url).toContain('fn=cosx');
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#readout')).toContainText('converged');
});
```

- [ ] **Step 3: Run E2E**

Run: `npm run test:e2e`
Expected: PASS — the new specs plus all existing E2E (the `jumps`/`deep-link` invariants now cover `newtons-method` too). If a Newton lesson jump does not move the readout (the `jumps` distinct-state invariant), fix the lesson `state` in `content.js` rather than weakening the test. If a readout substring differs from real output, adjust it to the real value but keep the assertion meaningful.

- [ ] **Step 4: Commit**

```bash
git add e2e/jumps.spec.js e2e/deep-link.spec.js e2e/newtons-method.spec.js
git commit -m "test: end-to-end coverage for the Newton's Method playground"
```

---

## Playground close

- [ ] Full unit suite (`npm test`) and E2E (`npm run test:e2e`) green; `npm run build` clean and the page emits.
- [ ] Merge decision is the user's (auto-deploys). Spot-check the live page: drag x₀, iterate to a root, trigger the fling/cycle, open a `?fn=…&x0=…&n=…` link, toggle presenter, print preview.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-27-newtons-method-playground-design.md`):
1. Registry + Newton math + tests → Task 1. ✓
2. LESSON (intuition/use/advanced/real levels + one self-check + failure-mode jumps) → Task 2; cross-links via `prereq` (Task 4) + `neighbours()` (Task 3 wiring). ✓
3. Grapher2D rendering (curve, iterates, tangent+drop, inset), readout, controls (fbtns, n slider, iterate ticker, drag x₀, reset, copylink) → Task 3. ✓
4. Feature parity: deep-link (`URL_SCHEMA`/`applyState`/`pushUrl`/copylink/readState) ✓, keyboard+ARIA (`keyboardControl` + canvas `role/aria`) ✓, presenter (`#present`+`mountPresenter`) ✓, scoreboard+challenge+badges (`ScoreShell`+`challengeMeter`) ✓, lesson+self-check+links ✓ — all Task 3. Sequencer/landing/nav + Vite → Task 4. Tests+E2E → Tasks 1 + 5. ✓
5. Error handling: fling (NaN, reported), cycle/diverge (status word), clamped x0/n → Tasks 1 + 3. ✓

**Placeholder scan:** every code step carries complete code; the E2E step-1 note to "read each file and place the slug in the existing array" is a real instruction (the array's exact contents must be read, not guessed), with the added slug fully specified. No `TODO`/`TBD`. ✓

**Type/name consistency:** `newtonStep`/`newtonRun(fn,x0,steps)`/`nearestRoot(fn,x)` defined in Task 1, consumed in Task 3. `FUNCTIONS` entry shape `{id,label,tex,f,df,roots,start,view,challenge,note?}` consistent between Task 1 (registry) and Task 3 (`state.fn.start`/`.view`/`.roots`/`.tex`/`.challenge.tol`). `LESSON` step `state` keys `{fn,x0,n}` = `URL_SCHEMA` = `urlState()` = `applyState` handling. Slug `newtons-method`, course `calc1`, `prereq:'secant-tangent'` consistent across Tasks 2/3/4/5. Element ids match between index.html (Task 3 Step 1) and playground.js (`s('n-val')`, `#xn-val`, `#err-val`, `#iterate`, `#c-goal`, …). ✓
