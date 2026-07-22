# College Math Viz — Phase 1 (Engine Extraction & Repo Bootstrap) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `college-math-viz` repo, extract the two templates' duplicated Engine code into shared ES modules, refactor both templates to import from that shared Engine while rendering identically to the originals, and prove the authoring → build → host loop by deploying one playground live.

**Architecture:** Three-layer split preserved exactly as specified in the kickoff brief — `engine/` (reusable rendering + gamification machinery, shared by every playground), `playgrounds/<slug>/content.js` (the only per-concept part: functions/coefficients/surfaces/challenge config), `playgrounds/<slug>/index.html` (thin per-concept wiring). Vite bundles each playground as an independent multi-page entry against shared ES modules; output is static HTML/CSS/JS with zero runtime dependencies.

**Tech Stack:** Vite (dev server + static build, multi-page mode), vanilla JS ES modules (no framework — brief explicitly says none needed), Vitest (unit tests for the deterministic-math layer), plain CSS custom properties for design tokens.

## Global Constraints

- No runtime API calls, no external runtime dependencies inside the playgrounds (source: kickoff brief, "Constraints").
- Google Fonts `<link>` is acceptable as-is for Phase 1; self-hosting as `woff2` is optional/deferred, not part of Phase 1's definition of done.
- Deterministic math: computed values (Taylor partial sums, analytic partials) must be verified against known references, not "eyeballed."
- Preserve the design system exactly — tokens, phosphor-on-ink aesthetic, gamification behavior unchanged in both refactored playgrounds.
- Each playground must work as an independent, offline-capable route once loaded.
- Responsive + keyboard-accessible; touch (orbit/drag/pinch) must keep working on `partial-derivatives`.
- Definition of done for Phase 1: repo scaffolded; one shared `engine/`; both playgrounds refactored to import from it and rendering identically to the two source HTML files; `dev` and `build` scripts working; one live deployed URL.
- **Stop after Phase 1.** Do not start Phase 2 (batch production against the build map) without explicit confirmation.

## Source-of-truth diff notes (read before extracting)

These are things I found by diffing the two source files line-by-line that affect how the extraction should be done — don't extract blindly:

- `:root` design tokens (12 custom properties: `--bg`, `--bg2`, `--panel`, `--panel-2`, `--line`, `--grid`, `--ink`, `--muted`, `--true`, `--approx`, `--error`, `--accent`, `--gold`, `--radius`, `--shadow`) are **byte-identical values** in both files — safe to extract verbatim.
- `ScoreShell` and `Confetti` are functionally identical between the two files but **not byte-identical text** — `partial-derivative-explorer.html` uses a `s(id)` shorthand and a particle field named `sz` where `taylor-series-studio.html` inlines `document.getElementById` and uses `s`. Behavior is the same; reconcile into one canonical version (below).
- **`fmt()` is NOT the same function in both files** — this is the one real behavioral drift:
  - Taylor (2D): `fmt(v){ const r=Math.round(v*100)/100; return Object.is(r,-0)?'0':String(r); }` — compact, trailing zeros stripped. Used for axis tick labels.
  - Partial derivatives (3D): `fmt(v){ const r=Math.round(v*100)/100; return Object.is(r,-0)?'0.00':r.toFixed(2); }` — fixed 2 decimals. Used for slider readouts.
  Both usages are legitimate and different on purpose (compact axis ticks vs. stable-width readouts). Do not force these into one function — export both as `fmtAxis` and `fmtNum` from `engine/dom.js` and call the one that matches the original usage at each call site.
- The 3D file's vector helpers `sub`, `cross`, `dot`, `norm` are generically useful (belong in `math.js`) but those bare names risk colliding with local variables in playground wiring (e.g. `dot`-product vs. a canvas "dot" drawing call). Export them prefixed: `vsub`, `vcross`, `vdot`, `vnorm`.
- Confetti's `#fx` canvas lookup happens at module-evaluation time in the originals (relies on the canvas already existing in the DOM before the script tag runs). Both playground HTML files already put `<canvas id="fx">` before the closing `</body>`/script — preserve that ordering in the refactored `index.html` files.

---

### Task 1: Repo scaffold + tooling

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `.gitignore`
- Create: `index.html` (root dev landing page, links to both playgrounds)
- Create: `playgrounds/.gitkeep` (placeholder until Task 9/10 populate it)

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run preview`, `npm run test` scripts that every later task relies on.

- [ ] **Step 1: Initialize git and Node project**

```bash
cd /Users/minsub/vscode/college_math
git init
npm init -y
```

- [ ] **Step 2: Install Vite and Vitest**

```bash
npm install --save-dev vite vitest
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 4: Write `package.json` scripts** (merge into the file `npm init -y` created)

```json
{
  "name": "college-math-viz",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 5: Write `vite.config.js`** (multi-page build — one entry per playground, plus the root landing page)

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'taylor-series': resolve(__dirname, 'playgrounds/taylor-series/index.html'),
        'partial-derivatives': resolve(__dirname, 'playgrounds/partial-derivatives/index.html'),
      },
    },
  },
});
```

- [ ] **Step 6: Write root `index.html`** (minimal dev landing page — not a playground, just navigation)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>College Math Viz — Playground Index</title>
</head>
<body>
  <h1>College Math Viz</h1>
  <ul>
    <li><a href="/playgrounds/taylor-series/">Taylor Series Studio</a></li>
    <li><a href="/playgrounds/partial-derivatives/">Partial Derivatives 3D</a></li>
  </ul>
</body>
</html>
```

- [ ] **Step 7: Verify dev server boots**

Run: `npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173/`); visiting it shows the two links (both 404 until Tasks 9–10 land — that's expected right now).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js .gitignore index.html
git commit -m "chore: scaffold Vite + Vitest project"
```

---

### Task 2: Extract `engine/math.js` + unit tests

**Files:**
- Create: `engine/math.js`
- Test: `engine/math.test.js`

**Interfaces:**
- Consumes: nothing (pure functions).
- Produces: `fact(n)`, `sup(n)`, `vsub(a,b)`, `vcross(a,b)`, `vdot(a,b)`, `vnorm(a)` — imported by `grapher-2d.js` (fact, sup), `surface-3d.js` (vsub/vcross/vdot/vnorm), and both `content.js` files (fact, sup).

- [ ] **Step 1: Write the failing tests**

```js
// engine/math.test.js
import { describe, it, expect } from 'vitest';
import { fact, sup, vsub, vcross, vdot, vnorm } from './math.js';

describe('fact', () => {
  it('computes factorials including the memoised path', () => {
    expect(fact(0)).toBe(1);
    expect(fact(1)).toBe(1);
    expect(fact(5)).toBe(120);
    expect(fact(10)).toBe(3628800);
  });
});

describe('sup', () => {
  it('converts digits to unicode superscripts', () => {
    expect(sup(0)).toBe('⁰');
    expect(sup(12)).toBe('¹²');
    expect(sup(304)).toBe('³⁰⁴');
  });
});

describe('vector helpers', () => {
  it('vsub subtracts componentwise', () => {
    expect(vsub([5, 5, 5], [1, 2, 3])).toEqual([4, 3, 2]);
  });
  it('vcross computes the standard cross product', () => {
    expect(vcross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
  it('vdot computes the standard dot product', () => {
    expect(vdot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
  it('vnorm returns a unit vector', () => {
    const [x, y, z] = vnorm([3, 4, 0]);
    expect(x).toBeCloseTo(0.6);
    expect(y).toBeCloseTo(0.8);
    expect(z).toBeCloseTo(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run engine/math.test.js`
Expected: FAIL — `engine/math.js` does not exist yet.

- [ ] **Step 3: Write `engine/math.js`** (ported verbatim from both source HTML files' Layer-1 helpers, vector fns renamed per the diff notes above)

```js
const _fac = [1];
export function fact(n) {
  for (let i = _fac.length; i <= n; i++) _fac[i] = _fac[i - 1] * i;
  return _fac[n];
}

const SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
export const sup = n => String(n).split('').map(d => SUP[d]).join('');

export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vcross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vnorm = a => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run engine/math.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add engine/math.js engine/math.test.js
git commit -m "feat: extract shared math helpers with unit tests"
```

---

### Task 3: Extract `engine/dom.js`

**Files:**
- Create: `engine/dom.js`
- Test: `engine/dom.test.js`

**Interfaces:**
- Consumes: nothing (reads `document`/`getComputedStyle` at call time — needs a DOM; Vitest runs in Node, so this test uses `happy-dom` or `jsdom`).
- Produces: `s(id)`, `getCSS(name)`, `fmtAxis(v)`, `fmtNum(v)` — imported by `grapher-2d.js`, `surface-3d.js`, `score-shell.js`, and both `content.js` files.

- [ ] **Step 1: Install a DOM environment for Vitest**

```bash
npm install --save-dev happy-dom
```

Add to `vite.config.js` under a new `test` key:

```js
export default defineConfig({
  build: { /* ...unchanged from Task 1... */ },
  test: {
    environment: 'happy-dom',
  },
});
```

- [ ] **Step 2: Write the failing tests**

```js
// engine/dom.test.js
import { describe, it, expect } from 'vitest';
import { fmtAxis, fmtNum, s } from './dom.js';

describe('fmtAxis (compact, used for graph axis ticks)', () => {
  it('strips trailing zeros and normalizes -0', () => {
    expect(fmtAxis(2)).toBe('2');
    expect(fmtAxis(2.5)).toBe('2.5');
    expect(fmtAxis(-0.001)).toBe('0');
  });
});

describe('fmtNum (fixed 2dp, used for slider readouts)', () => {
  it('always shows two decimals and normalizes -0', () => {
    expect(fmtNum(2)).toBe('2.00');
    expect(fmtNum(2.5)).toBe('2.50');
    expect(fmtNum(-0.001)).toBe('0.00');
  });
});

describe('s', () => {
  it('is a getElementById shorthand', () => {
    document.body.innerHTML = '<div id="probe">x</div>';
    expect(s('probe').textContent).toBe('x');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run engine/dom.test.js`
Expected: FAIL — `engine/dom.js` does not exist yet.

- [ ] **Step 4: Write `engine/dom.js`**

```js
export function s(id) {
  return document.getElementById(id);
}

export function getCSS(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Compact formatter for graph axis tick labels — trailing zeros stripped. */
export function fmtAxis(v) {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

/** Fixed 2-decimal formatter for slider/readout values. */
export function fmtNum(v) {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0.00' : r.toFixed(2);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run engine/dom.test.js`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add engine/dom.js engine/dom.test.js vite.config.js package.json package-lock.json
git commit -m "feat: extract shared DOM/formatting helpers with unit tests"
```

---

### Task 4: Extract `engine/tokens.css`

**Files:**
- Create: `engine/tokens.css`

**Interfaces:**
- Produces: the 12 `:root` custom properties consumed via `getCSS()` and raw `var(--x)` CSS references in both playgrounds' stylesheets.

- [ ] **Step 1: Write `engine/tokens.css`** (verbatim from both source files — confirmed byte-identical values)

```css
:root{
  --bg:#0b0e14;
  --bg2:#0e121b;
  --panel:#111726;
  --panel-2:#0d1320;
  --line:rgba(126,152,196,.14);
  --grid:rgba(126,152,196,.075);
  --ink:#eaeff8;
  --muted:#8b95ab;
  --true:#ffb454;
  --approx:#3df2c0;
  --error:#ff5d73;
  --accent:#7aa2ff;
  --gold:#ffd76a;
  --radius:14px;
  --shadow:0 24px 60px -20px rgba(0,0,0,.7);
}
```

- [ ] **Step 2: Manual verification** — diff against both source files to confirm no value was mistyped

Run:
```bash
grep -A14 ':root{' /Users/minsub/vscode/college_math/taylor-series-studio.html | head -15
grep -A2 ':root{' /Users/minsub/vscode/college_math/partial-derivative-explorer.html | head -3
```
Expected: values match `engine/tokens.css` exactly (the 3D source has the block minified onto fewer lines — same key/value pairs).

- [ ] **Step 3: Commit**

```bash
git add engine/tokens.css
git commit -m "feat: extract shared design tokens"
```

---

### Task 5: Extract `engine/confetti.js`

**Files:**
- Create: `engine/confetti.js`

**Interfaces:**
- Consumes: a `<canvas id="fx">` element already present in the DOM at call time.
- Produces: `createConfetti(canvasId = 'fx')` returning `{ burst() }` — imported by `score-shell.js` (Task 6) and instantiated once per playground's `content.js`.

- [ ] **Step 1: Write `engine/confetti.js`** (ported from both source files, which were already functionally identical; converted from a module-level IIFE singleton to a factory so two playgrounds never share particle state and so it's explicitly wired rather than implicitly global)

```js
export function createConfetti(canvasId = 'fx') {
  const cv = document.getElementById(canvasId);
  const ctx = cv.getContext('2d');
  let parts = [];
  let raf = null;
  const dpr = window.devicePixelRatio || 1;

  function size() {
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', size);
  size();

  const cols = ['#3df2c0', '#ffb454', '#7aa2ff', '#ffd76a', '#ff5d73'];

  function burst() {
    const cx = innerWidth * 0.66, cy = innerHeight * 0.32;
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
      parts.push({
        x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4,
        g: 0.16 + Math.random() * 0.12, life: 1, rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4, sz: 4 + Math.random() * 5,
        c: cols[i % cols.length],
      });
    }
    if (!raf) loop();
  }

  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012; });
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    parts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz * 0.6);
      ctx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = null; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  return { burst };
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/confetti.js
git commit -m "feat: extract shared confetti particle burst"
```

(No unit test here — this is animation/canvas side-effect code with no pure logic worth asserting on in isolation; correctness is verified visually in Tasks 9–10.)

---

### Task 6: Extract `engine/score-shell.js`

**Files:**
- Create: `engine/score-shell.js`
- Test: `engine/score-shell.test.js`

**Interfaces:**
- Consumes: `createConfetti` from `./confetti.js`; DOM elements `#s-pts`, `#s-streak`, `#s-badges`, `#toasts` must exist in the playground's HTML.
- Produces: `ScoreShell` class with `add(n)`, `hitStreak()`, `resetStreak()`, `badge(id, title, sub, ico)`, `toast(t1, t2, ico)`, `celebrate()` — imported by both `content.js` files.

- [ ] **Step 1: Write the failing test**

```js
// engine/score-shell.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreShell } from './score-shell.js';

function mockDom() {
  document.body.innerHTML = `
    <div id="s-pts">0</div><div id="s-streak">0</div><div id="s-badges">0</div>
    <div id="toasts"></div>
  `;
}

describe('ScoreShell', () => {
  beforeEach(mockDom);

  it('add() increments points and repaints', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.add(10);
    expect(shell.pts).toBe(10);
    expect(document.getElementById('s-pts').textContent).toBe('10');
  });

  it('badge() is idempotent per id and awards 25 points once', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.badge('first', 'First!', 'sub', '✳️');
    shell.badge('first', 'First!', 'sub', '✳️');
    expect(shell.pts).toBe(25);
    expect(shell.badges.size).toBe(1);
    expect(document.getElementById('toasts').children.length).toBe(1);
  });

  it('celebrate() delegates to the injected confetti burst', () => {
    const burst = vi.fn();
    const shell = new ScoreShell({ burst });
    shell.celebrate();
    expect(burst).toHaveBeenCalledOnce();
  });

  it('resetStreak() zeroes the streak', () => {
    const shell = new ScoreShell({ burst: vi.fn() });
    shell.hitStreak(); shell.hitStreak();
    expect(shell.streak).toBe(2);
    shell.resetStreak();
    expect(shell.streak).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run engine/score-shell.test.js`
Expected: FAIL — `engine/score-shell.js` does not exist yet.

- [ ] **Step 3: Write `engine/score-shell.js`** (reconciled from both source files — see diff notes; takes an injected confetti instance instead of reaching for a module-global)

```js
export class ScoreShell {
  constructor(confetti) {
    this.pts = 0;
    this.streak = 0;
    this.badges = new Set();
    this.confetti = confetti;
  }

  add(n) { this.pts += n; this._paint(); }
  hitStreak() { this.streak++; this._paint(); }
  resetStreak() { this.streak = 0; this._paint(); }

  badge(id, title, sub, ico = '🏅') {
    if (this.badges.has(id)) return;
    this.badges.add(id);
    this.add(25);
    this.toast(title, sub, ico);
    this._paint();
  }

  _paint() {
    document.getElementById('s-pts').textContent = this.pts;
    document.getElementById('s-streak').textContent = this.streak;
    document.getElementById('s-badges').textContent = this.badges.size;
  }

  toast(t1, t2, ico) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="ico">${ico}</div><div><div class="t1">${t1}</div><div class="t2">${t2}</div></div>`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3700);
  }

  celebrate() { this.confetti.burst(); }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run engine/score-shell.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add engine/score-shell.js engine/score-shell.test.js
git commit -m "feat: extract shared gamification shell with unit tests"
```

---

### Task 7: Extract `engine/grapher-2d.js`

**Files:**
- Create: `engine/grapher-2d.js`

**Interfaces:**
- Consumes: `getCSS`, `fmtAxis` from `./dom.js`.
- Produces: `Grapher2D` class (`constructor(canvas)`, `setView(v)`, `sx/sy/ux`, `clear()`, `grid()`, `plot(fn, opts)`, `dot(x,y,color,rInner)`, `vline(x,color)`, `gap(x,y1,y2,color)`, `onresize` hook) — imported by `playgrounds/taylor-series/content.js`.

- [ ] **Step 1: Write `engine/grapher-2d.js`** (ported verbatim from `taylor-series-studio.html`, only change is importing `getCSS`/`fmtAxis` instead of module-local `getCSS`/`fmt`)

```js
import { getCSS, fmtAxis } from './dom.js';

export class Grapher2D {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 };
    this.pad = { l: 34, r: 16, t: 16, b: 26 };
    this._resize();
    new ResizeObserver(() => { this._resize(); this.onresize && this.onresize(); }).observe(canvas.parentElement);
  }

  _resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.W = r.width; this.H = r.height;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setView(v) { this.view = { ...v }; }
  sx(x) { const { xmin, xmax } = this.view, { l, r } = this.pad; return l + (x - xmin) / (xmax - xmin) * (this.W - l - r); }
  sy(y) { const { ymin, ymax } = this.view, { t, b } = this.pad; return t + (ymax - y) / (ymax - ymin) * (this.H - t - b); }
  ux(px) { const { xmin, xmax } = this.view, { l, r } = this.pad; return xmin + (px - l) / (this.W - l - r) * (xmax - xmin); }
  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  grid() {
    const c = this.ctx, { xmin, xmax, ymin, ymax } = this.view;
    c.lineWidth = 1;
    const stepX = this._nice((xmax - xmin) / 9), stepY = this._nice((ymax - ymin) / 6);
    c.strokeStyle = getCSS('--grid'); c.fillStyle = getCSS('--muted');
    c.font = '10px "JetBrains Mono"'; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let x = Math.ceil(xmin / stepX) * stepX; x <= xmax; x += stepX) {
      c.beginPath(); c.moveTo(this.sx(x), this.pad.t); c.lineTo(this.sx(x), this.H - this.pad.b); c.stroke();
      if (Math.abs(x) > 1e-9) c.fillText(fmtAxis(x), this.sx(x), this.sy(0) + 4);
    }
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let y = Math.ceil(ymin / stepY) * stepY; y <= ymax; y += stepY) {
      c.beginPath(); c.moveTo(this.pad.l, this.sy(y)); c.lineTo(this.W - this.pad.r, this.sy(y)); c.stroke();
      if (Math.abs(y) > 1e-9) c.fillText(fmtAxis(y), this.pad.l - 6, this.sy(y));
    }
    c.strokeStyle = getCSS('--line'); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(this.pad.l, this.sy(0)); c.lineTo(this.W - this.pad.r, this.sy(0)); c.stroke();
    c.beginPath(); c.moveTo(this.sx(0), this.pad.t); c.lineTo(this.sx(0), this.H - this.pad.b); c.stroke();
  }

  _nice(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  plot(fn, { color, width = 2.5, glow = 0, dash = null } = {}) {
    const c = this.ctx, { ymin, ymax } = this.view;
    const margin = (ymax - ymin) * 1.2;
    c.save(); c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round';
    if (dash) c.setLineDash(dash);
    if (glow) { c.shadowColor = color; c.shadowBlur = glow; }
    c.beginPath(); let pen = false;
    for (let px = this.pad.l; px <= this.W - this.pad.r; px += 1.5) {
      const x = this.ux(px), y = fn(x);
      const ok = Number.isFinite(y) && y > ymin - margin && y < ymax + margin;
      if (!ok) { pen = false; continue; }
      const sxp = px, syp = this.sy(y);
      if (!pen) { c.moveTo(sxp, syp); pen = true; } else c.lineTo(sxp, syp);
    }
    c.stroke(); c.restore();
  }

  dot(x, y, color, rInner = 4) {
    const c = this.ctx;
    if (!Number.isFinite(y)) return;
    c.save(); c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 10;
    c.beginPath(); c.arc(this.sx(x), this.sy(y), rInner, 0, 7); c.fill(); c.restore();
  }

  vline(x, color) {
    const c = this.ctx;
    c.save(); c.strokeStyle = color; c.globalAlpha = 0.5;
    c.setLineDash([4, 4]); c.beginPath(); c.moveTo(this.sx(x), this.pad.t); c.lineTo(this.sx(x), this.H - this.pad.b); c.stroke(); c.restore();
  }

  gap(x, y1, y2, color) {
    const c = this.ctx;
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) return;
    c.save(); c.strokeStyle = color; c.lineWidth = 2.5; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(this.sx(x), this.sy(y1)); c.lineTo(this.sx(x), this.sy(y2)); c.stroke(); c.restore();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/grapher-2d.js
git commit -m "feat: extract Grapher2D engine"
```

(No unit test — canvas rendering; correctness verified visually in Task 9's side-by-side check.)

---

### Task 8: Extract `engine/surface-3d.js`

**Files:**
- Create: `engine/surface-3d.js`

**Interfaces:**
- Consumes: `getCSS` from `./dom.js`; `vsub, vcross, vdot, vnorm` from `./math.js`.
- Produces: `Surface3D` class (`constructor(canvas)`, `camPos()`, `setSurface(surf)`, `wz(x,y,z)`, `w(x,y)`, `projector()`, `renderBase(proj, overlay)`, `schedule()`, `onrender` hook, camera fields `az/el/dist`) — imported by `playgrounds/partial-derivatives/content.js`.

- [ ] **Step 1: Write `engine/surface-3d.js`** (ported verbatim from `partial-derivative-explorer.html`, `sub/cross/dot/norm` calls renamed to `vsub/vcross/vdot/vnorm`)

```js
import { getCSS } from './dom.js';
import { vsub, vcross, vdot, vnorm } from './math.js';

export class Surface3D {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.az = -0.75; this.el = 0.52; this.dist = 7; this.N = 38;
    this._resize();
    new ResizeObserver(() => { this._resize(); this.schedule(); }).observe(canvas.parentElement);
    this._bindCamera();
  }

  _resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = devicePixelRatio || 1;
    this.W = r.width; this.H = r.height;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  camPos() {
    return [
      this.dist * Math.cos(this.el) * Math.cos(this.az),
      this.dist * Math.cos(this.el) * Math.sin(this.az),
      this.dist * Math.sin(this.el),
    ];
  }

  setSurface(surf) {
    this.s = surf; const a = surf.a, N = this.N; this.a = a;
    let zmin = Infinity, zmax = -Infinity; const Z = [];
    for (let i = 0; i <= N; i++) {
      Z[i] = []; const x = -a + 2 * a * i / N;
      for (let j = 0; j <= N; j++) {
        const y = -a + 2 * a * j / N; const z = surf.f(x, y); Z[i][j] = z;
        if (isFinite(z)) { if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
      }
    }
    this.zmin = zmin; this.zmax = zmax; this.zMid = (zmin + zmax) / 2;
    const span = Math.max(zmax - zmin, 1e-6);
    this.hScale = 2.6 / a; this.vScale = 1.7 / (span / 2); this.Z = Z;
    this.P = [];
    for (let i = 0; i <= N; i++) {
      this.P[i] = []; const x = -a + 2 * a * i / N;
      for (let j = 0; j <= N; j++) {
        const y = -a + 2 * a * j / N; this.P[i][j] = this.wz(x, y, Z[i][j]);
      }
    }
  }

  wz(x, y, z) { return [x * this.hScale, y * this.hScale, (z - this.zMid) * this.vScale]; }
  w(x, y) { return this.wz(x, y, this.s.f(x, y)); }

  _basis() {
    const C = this.camPos(), f = vnorm(vsub([0, 0, 0], C));
    const r = vnorm(vcross(f, [0, 0, 1])), u = vcross(r, f);
    const focal = (Math.min(this.W, this.H) / 2) / Math.tan(0.3927);
    return { C, f, r, u, focal };
  }

  projector() {
    const { C, f, r, u, focal } = this._basis(); const W = this.W, H = this.H;
    return P => {
      const d = vsub(P, C); const vz = vdot(d, f);
      return { x: W / 2 + focal * vdot(d, r) / vz, y: H / 2 - focal * vdot(d, u) / vz, z: vz, ok: vz > 0.05 };
    };
  }

  _color(t) {
    t = Math.max(0, Math.min(1, t));
    const low = [58, 74, 140], mid = [61, 242, 192], high = [255, 180, 84];
    const mix = (c1, c2, k) => [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
    return t < 0.5 ? mix(low, mid, t * 2) : mix(mid, high, (t - 0.5) * 2);
  }

  renderBase(proj, overlay) {
    const c = this.ctx; c.clearRect(0, 0, this.W, this.H);
    const N = this.N, a = this.a; const L = vnorm([-0.3, -0.5, 0.9]);
    c.save(); c.strokeStyle = getCSS('--grid'); c.lineWidth = 1; const gl = 8;
    for (let k = 0; k <= gl; k++) {
      const t = -a + 2 * a * k / gl;
      let p1 = proj(this.wz(t, -a, this.zmin)), p2 = proj(this.wz(t, a, this.zmin));
      if (p1.ok && p2.ok) { c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke(); }
      let q1 = proj(this.wz(-a, t, this.zmin)), q2 = proj(this.wz(a, t, this.zmin));
      if (q1.ok && q2.ok) { c.beginPath(); c.moveTo(q1.x, q1.y); c.lineTo(q2.x, q2.y); c.stroke(); }
    }
    c.restore();
    this._slicePlane(proj, overlay);
    const quads = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const W0 = this.P[i][j], W1 = this.P[i + 1][j], W2 = this.P[i + 1][j + 1], W3 = this.P[i][j + 1];
      const a0 = proj(W0), a1 = proj(W1), a2 = proj(W2), a3 = proj(W3);
      if (!(a0.ok && a1.ok && a2.ok && a3.ok)) continue;
      const depth = (a0.z + a1.z + a2.z + a3.z) / 4;
      const zc = (this.Z[i][j] + this.Z[i + 1][j] + this.Z[i + 1][j + 1] + this.Z[i][j + 1]) / 4;
      const t = (zc - this.zmin) / Math.max(this.zmax - this.zmin, 1e-6);
      let n = vnorm(vcross(vsub(W1, W0), vsub(W3, W0))); if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
      const lit = 0.5 + 0.5 * Math.max(0, vdot(n, L)); const base = this._color(t);
      quads.push({ p: [a0, a1, a2, a3], depth, col: 'rgb(' + (base[0] * lit | 0) + ',' + (base[1] * lit | 0) + ',' + (base[2] * lit | 0) + ')' });
    }
    quads.sort((A, B) => B.depth - A.depth);
    c.lineJoin = 'round';
    for (const q of quads) {
      c.beginPath(); c.moveTo(q.p[0].x, q.p[0].y);
      for (let k = 1; k < 4; k++) c.lineTo(q.p[k].x, q.p[k].y); c.closePath();
      c.fillStyle = q.col; c.fill(); c.strokeStyle = 'rgba(0,0,0,.20)'; c.lineWidth = 0.5; c.stroke();
    }
  }

  _slicePlane(proj, ov) {
    const c = this.ctx, a = this.a; let corners;
    if (ov.axis === 'x') {
      const y = ov.slice;
      corners = [this.wz(-a, y, this.zmin), this.wz(a, y, this.zmin), this.wz(a, y, this.zmax), this.wz(-a, y, this.zmax)];
    } else {
      const x = ov.slice;
      corners = [this.wz(x, -a, this.zmin), this.wz(x, a, this.zmin), this.wz(x, a, this.zmax), this.wz(x, -a, this.zmax)];
    }
    const pp = corners.map(proj); if (pp.some(p => !p.ok)) return;
    c.save(); c.beginPath(); c.moveTo(pp[0].x, pp[0].y);
    for (let k = 1; k < 4; k++) c.lineTo(pp[k].x, pp[k].y); c.closePath();
    c.fillStyle = 'rgba(122,162,255,.10)'; c.fill();
    c.strokeStyle = 'rgba(122,162,255,.5)'; c.lineWidth = 1; c.stroke(); c.restore();
  }

  schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this.onrender && this.onrender(); });
  }

  _bindCamera() {
    const el = this.cv; const pts = new Map(); let mode = null, last = null, pinch0 = 0, dist0 = 0;
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { mode = 'orbit'; last = [e.clientX, e.clientY]; }
      else if (pts.size === 2) { mode = 'pinch'; const v = [...pts.values()]; pinch0 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); dist0 = this.dist; }
    });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (mode === 'orbit' && pts.size === 1) {
        const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY];
        this.az -= dx * 0.008; this.el = Math.max(0.08, Math.min(1.45, this.el + dy * 0.006)); this.schedule();
      } else if (mode === 'pinch' && pts.size === 2) {
        const v = [...pts.values()]; const d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
        this.dist = Math.max(3.5, Math.min(16, dist0 * pinch0 / Math.max(d, 1))); this.schedule();
      }
    });
    const end = e => {
      pts.delete(e.pointerId); if (pts.size === 0) mode = null;
      if (pts.size === 1) { mode = 'orbit'; last = [...pts.values()][0]; }
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => {
      e.preventDefault(); this.dist = Math.max(3.5, Math.min(16, this.dist * (1 + Math.sign(e.deltaY) * 0.08))); this.schedule();
    }, { passive: false });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/surface-3d.js
git commit -m "feat: extract Surface3D engine"
```

---

### Task 9: Refactor `playgrounds/taylor-series/`

**Files:**
- Create: `playgrounds/taylor-series/index.html`
- Create: `playgrounds/taylor-series/content.js`

**Interfaces:**
- Consumes: `Grapher2D` (Task 7), `ScoreShell` (Task 6), `createConfetti` (Task 5), `fact`, `sup` (Task 2), `getCSS`, `fmtAxis` (Task 3), `../../engine/tokens.css` (Task 4).
- Produces: a working playground identical in behavior/appearance to `taylor-series-studio.html`.

- [ ] **Step 1: Write `playgrounds/taylor-series/index.html`** — same markup/CSS as the original `taylor-series-studio.html` (lines 1–260), with `<style>` now `@import`-ing the token file and the inline `<script>` replaced by a module script pointing at `content.js`

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Taylor Series · Live Approximation Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @import url("../../engine/tokens.css");
  /* --- everything below is unchanged from taylor-series-studio.html lines 33-188 --- */
  *{box-sizing:border-box}
  html,body{height:100%}
  body{
    margin:0;
    font-family:"JetBrains Mono",ui-monospace,monospace;
    color:var(--ink);
    background:
      radial-gradient(1200px 700px at 78% -10%, rgba(61,242,192,.06), transparent 60%),
      radial-gradient(1000px 600px at -5% 110%, rgba(122,162,255,.07), transparent 55%),
      linear-gradient(var(--bg), var(--bg2));
    background-attachment:fixed;
    -webkit-font-smoothing:antialiased;
    min-height:100vh;
    padding:22px;
  }
  .wrap{max-width:1180px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:16px}
  .brand .kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--approx);display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .kicker::before{content:"";width:26px;height:1px;background:var(--approx);display:inline-block}
  h1{font-family:"Fraunces",serif;font-weight:900;font-size:clamp(26px,4.6vw,44px);line-height:.98;margin:0;letter-spacing:-.01em}
  h1 em{font-style:italic;color:var(--true)}
  .scoreboard{display:flex;gap:10px;flex-wrap:wrap}
  .chip{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:8px 13px;min-width:78px}
  .chip .lab{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
  .chip .val{font-size:19px;font-weight:700;margin-top:2px}
  .chip.pts .val{color:var(--gold)}
  .chip.streak .val{color:var(--approx)}
  .studio{display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:stretch}
  .card{background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
  .graph-card{position:relative;overflow:hidden;min-height:440px}
  #graph{display:block;width:100%;height:100%}
  .graph-tag{position:absolute;top:14px;left:16px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);pointer-events:none}
  .legend{position:absolute;top:12px;right:14px;display:flex;flex-direction:column;gap:6px;font-size:11.5px;pointer-events:none}
  .legend span{display:flex;align-items:center;gap:7px;justify-content:flex-end}
  .swatch{width:16px;height:3px;border-radius:2px;display:inline-block}
  .readout{position:absolute;left:16px;bottom:14px;font-size:12px;color:var(--muted);background:rgba(9,12,19,.72);backdrop-filter:blur(4px);border:1px solid var(--line);border-radius:10px;padding:9px 12px;line-height:1.6;pointer-events:none;max-width:min(92%,360px)}
  .readout b{color:var(--ink);font-weight:500}
  .readout .er{color:var(--error)}
  .panel{padding:18px;display:flex;flex-direction:column;gap:18px}
  .sect-lab{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
  .fbtns{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
  .fbtn{font-family:inherit;font-size:14px;color:var(--ink);cursor:pointer;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:11px 4px;transition:.15s}
  .fbtn:hover{border-color:var(--accent);transform:translateY(-1px)}
  .fbtn.on{background:rgba(61,242,192,.12);border-color:var(--approx);color:var(--approx);box-shadow:0 0 0 1px rgba(61,242,192,.25),0 8px 20px -8px rgba(61,242,192,.5)}
  .terms-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
  .terms-head .n{font-family:"Fraunces",serif;font-weight:900;font-size:30px;color:var(--approx);line-height:1}
  .terms-head .n small{font-family:"JetBrains Mono";font-size:12px;color:var(--muted);font-weight:400;letter-spacing:.06em}
  input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:6px;background:linear-gradient(90deg,var(--approx) var(--fill,0%),#1b2436 var(--fill,0%));outline:none;cursor:pointer}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--approx);border:3px solid #08221b;cursor:pointer;box-shadow:0 0 12px rgba(61,242,192,.7)}
  input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--approx);border:3px solid #08221b;cursor:pointer;box-shadow:0 0 12px rgba(61,242,192,.7)}
  .row{display:flex;gap:8px}
  .action{flex:1;font-family:inherit;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);cursor:pointer;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:11px;transition:.15s}
  .action:hover{border-color:var(--accent);color:var(--accent)}
  .action.primary{background:rgba(122,162,255,.14);border-color:var(--accent);color:var(--accent)}
  .formula{background:#080b12;border:1px solid var(--line);border-radius:11px;padding:14px 15px}
  .formula .lhs{color:var(--muted);font-size:13px;margin-bottom:6px}
  .formula .rhs{color:var(--approx);font-size:16px;line-height:1.7;word-spacing:2px}
  .formula .rhs .dots{color:var(--muted)}
  .challenge{border:1px solid rgba(255,215,106,.3);background:rgba(255,215,106,.05);border-radius:11px;padding:14px 15px}
  .challenge .lab{color:var(--gold);font-size:10px;letter-spacing:.22em;text-transform:uppercase;margin-bottom:8px}
  .challenge .goal{font-size:13.5px;color:var(--ink);line-height:1.5;margin-bottom:10px}
  .challenge .goal b{color:var(--gold)}
  .cmeter{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px}
  .cmeter b{color:var(--ink);font-weight:500}
  .cbar{height:8px;border-radius:6px;background:#151d2c;overflow:hidden}
  .cbar > i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--error),var(--gold),var(--approx));width:0%;transition:width .25s}
  .cstate{margin-top:9px;font-size:12px;color:var(--muted);min-height:16px}
  .cstate.win{color:var(--approx)}
  #fx{position:fixed;inset:0;pointer-events:none;z-index:60}
  .toast-wrap{position:fixed;top:18px;right:18px;display:flex;flex-direction:column;gap:9px;z-index:70}
  .toast{display:flex;align-items:center;gap:11px;background:rgba(17,23,38,.96);border:1px solid rgba(255,215,106,.45);border-left:3px solid var(--gold);border-radius:11px;padding:11px 15px;box-shadow:var(--shadow);transform:translateX(130%);animation:slide 3.6s cubic-bezier(.2,.9,.2,1) forwards;max-width:290px}
  @keyframes slide{8%{transform:translateX(0)}88%{transform:translateX(0)}100%{transform:translateX(130%)}}
  .toast .ico{font-size:20px}
  .toast .t1{font-family:"Fraunces",serif;font-weight:700;font-size:14px;color:var(--gold)}
  .toast .t2{font-size:11px;color:var(--muted);margin-top:1px}
  footer{margin-top:16px;font-size:11.5px;color:var(--muted);line-height:1.7}
  footer b{color:var(--approx);font-weight:500}
  @media(max-width:840px){body{padding:14px}.studio{grid-template-columns:1fr}.graph-card{min-height:340px}header{align-items:flex-start}}
</style>
</head>
<body>
<canvas id="fx"></canvas>
<div class="toast-wrap" id="toasts"></div>
<div class="wrap">
  <header>
    <div class="brand">
      <div class="kicker">Math · Visual Studio</div>
      <h1>Taylor Series <em>Studio</em></h1>
    </div>
    <div class="scoreboard">
      <div class="chip pts"><div class="lab">Points</div><div class="val" id="s-pts">0</div></div>
      <div class="chip streak"><div class="lab">Streak</div><div class="val" id="s-streak">0</div></div>
      <div class="chip"><div class="lab">Badges</div><div class="val" id="s-badges">0</div></div>
    </div>
  </header>
  <div class="studio">
    <div class="card graph-card">
      <canvas id="graph"></canvas>
      <div class="graph-tag">approximation ⟶ drag the graph to probe any x</div>
      <div class="legend">
        <span><i class="swatch" style="background:var(--true)"></i> true f(x)</span>
        <span><i class="swatch" style="background:var(--approx)"></i> Taylor P<sub>N</sub>(x)</span>
        <span><i class="swatch" style="background:var(--error)"></i> error</span>
      </div>
      <div class="readout" id="readout"></div>
    </div>
    <div class="card panel">
      <div>
        <div class="sect-lab">Function to approximate</div>
        <div class="fbtns" id="fbtns"></div>
      </div>
      <div>
        <div class="terms-head">
          <div class="sect-lab" style="margin:0">Terms included</div>
          <div class="n" id="n-lab">1<small> deg</small></div>
        </div>
        <input type="range" id="terms" min="0" max="14" value="1" step="1" aria-label="Number of Taylor series terms">
        <div class="row" style="margin-top:12px">
          <button class="action primary" id="build">▸ Animate build</button>
          <button class="action" id="reset">Reset</button>
        </div>
      </div>
      <div class="formula">
        <div class="lhs" id="f-lhs">P<sub>N</sub>(x) ≈</div>
        <div class="rhs" id="f-rhs"></div>
      </div>
      <div class="challenge">
        <div class="lab">◆ Precision challenge</div>
        <div class="goal" id="c-goal"></div>
        <div class="cmeter"><span>error <b id="c-err">—</b></span><span>target <b id="c-tol">—</b></span></div>
        <div class="cbar"><i id="c-bar"></i></div>
        <div class="cstate" id="c-state">Add terms until the error drops below target.</div>
      </div>
    </div>
  </div>
  <footer>
    <b>Template note.</b> The code is split into three layers — <b>Engine</b> (Grapher2D + ScoreShell, reused by every playground),
    <b>Content</b> (the FUNCTIONS registry: what changes per concept), and <b>Playground</b> (thin wiring).
    To build the next map row, Claude Code swaps Content + wiring and keeps the Engine.
  </footer>
</div>
<script type="module" src="./content.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `playgrounds/taylor-series/content.js`** (Layer 2 CONTENT + Layer 3 PLAYGROUND wiring from `taylor-series-studio.html` lines 405–586, now importing the Engine instead of defining it inline)

```js
import { Grapher2D } from '../../engine/grapher-2d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { createConfetti } from '../../engine/confetti.js';
import { fact, sup } from '../../engine/math.js';
import { getCSS } from '../../engine/dom.js';

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

// local axis-formatting import matches the original file's `fmt` usage in the readout
import { fmtAxis as fmt } from '../../engine/dom.js';

render();
```

> Note for the implementer: JS hoists `import` declarations regardless of where they appear textually, so the second `import` at the bottom is legal, but move it to the top of the file next to the other imports for readability before committing — it's written at the bottom here only to mirror the original file's reading order during the port.

- [ ] **Step 3: Verify dev server renders the playground**

Run: `npm run dev`, open `/playgrounds/taylor-series/`
Expected: renders identically to the original — header/scoreboard, graph with `eˣ` selected, drag-to-probe works, term slider works, "Animate build" button steps through degrees, precision challenge fires a toast + confetti when solved.

- [ ] **Step 4: Manual side-by-side visual parity check**

Open `taylor-series-studio.html` (original) and `http://localhost:5173/playgrounds/taylor-series/` (refactored) side by side. Confirm: identical layout, colors, fonts, slider behavior, formula rendering, badge/toast triggers at the same N thresholds, confetti burst on solve.

- [ ] **Step 5: Commit**

```bash
git add playgrounds/taylor-series/
git commit -m "feat: refactor Taylor series playground onto shared engine"
```

---

### Task 10: Refactor `playgrounds/partial-derivatives/`

**Files:**
- Create: `playgrounds/partial-derivatives/index.html`
- Create: `playgrounds/partial-derivatives/content.js`

**Interfaces:**
- Consumes: `Surface3D` (Task 8), `ScoreShell` (Task 6), `createConfetti` (Task 5), `getCSS`, `fmtNum`, `s` (Task 3), `../../engine/tokens.css` (Task 4).
- Produces: a working playground identical in behavior/appearance to `partial-derivative-explorer.html`.

- [ ] **Step 1: Write `playgrounds/partial-derivatives/index.html`** — same markup/CSS as `partial-derivative-explorer.html` (lines 1–159), `<style>` `@import`-ing the shared tokens, `<script>` replaced by a module pointing at `content.js`

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Partial Derivatives · 3D Surface Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @import url("../../engine/tokens.css");
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;font-family:"JetBrains Mono",ui-monospace,monospace;color:var(--ink);
    background:radial-gradient(1200px 700px at 78% -10%, rgba(61,242,192,.06), transparent 60%),
      radial-gradient(1000px 600px at -5% 110%, rgba(122,162,255,.07), transparent 55%),
      linear-gradient(var(--bg), var(--bg2));
    background-attachment:fixed;-webkit-font-smoothing:antialiased;min-height:100vh;padding:22px}
  .wrap{max-width:1180px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:16px}
  .brand .kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--approx);display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .kicker::before{content:"";width:26px;height:1px;background:var(--approx);display:inline-block}
  h1{font-family:"Fraunces",serif;font-weight:900;font-size:clamp(26px,4.6vw,44px);line-height:.98;margin:0;letter-spacing:-.01em}
  h1 em{font-style:italic;color:var(--true)}
  .scoreboard{display:flex;gap:10px;flex-wrap:wrap}
  .chip{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:8px 13px;min-width:78px}
  .chip .lab{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
  .chip .val{font-size:19px;font-weight:700;margin-top:2px}
  .chip.pts .val{color:var(--gold)} .chip.streak .val{color:var(--approx)}
  .studio{display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:stretch}
  .card{background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
  .graph-card{position:relative;overflow:hidden;min-height:460px}
  #scene{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
  #scene:active{cursor:grabbing}
  .graph-tag{position:absolute;top:14px;left:16px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);pointer-events:none}
  .legend{position:absolute;top:12px;right:14px;display:flex;flex-direction:column;gap:6px;font-size:11.5px;pointer-events:none}
  .legend span{display:flex;align-items:center;gap:7px;justify-content:flex-end}
  .swatch{width:16px;height:3px;border-radius:2px;display:inline-block}
  .readout{position:absolute;left:16px;bottom:14px;font-size:12px;color:var(--muted);background:rgba(9,12,19,.72);backdrop-filter:blur(4px);border:1px solid var(--line);border-radius:10px;padding:9px 12px;line-height:1.6;pointer-events:none;max-width:min(92%,420px)}
  .readout b{color:var(--ink);font-weight:500}
  .readout .pd{color:var(--gold);font-weight:700}
  .panel{padding:18px;display:flex;flex-direction:column;gap:16px}
  .sect-lab{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
  .fbtns{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}
  .fbtn{font-family:inherit;font-size:13px;color:var(--ink);cursor:pointer;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:11px 6px;transition:.15s}
  .fbtn:hover{border-color:var(--accent);transform:translateY(-1px)}
  .fbtn.on{background:rgba(61,242,192,.12);border-color:var(--approx);color:var(--approx);box-shadow:0 0 0 1px rgba(61,242,192,.25),0 8px 20px -8px rgba(61,242,192,.5)}
  .toggle{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .tbtn{font-family:"Fraunces",serif;font-weight:700;font-size:16px;color:var(--ink);cursor:pointer;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:10px;transition:.15s}
  .tbtn:hover{border-color:var(--accent)}
  .tbtn.on{background:rgba(122,162,255,.14);border-color:var(--accent);color:var(--accent)}
  .slabel{display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px;color:var(--muted);margin-bottom:7px}
  .slabel b{color:var(--ink);font-family:"Fraunces",serif;font-weight:700;font-size:15px}
  input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:6px;background:linear-gradient(90deg,var(--accent) var(--fill,50%),#1b2436 var(--fill,50%));outline:none;cursor:pointer;margin:0}
  input[type=range].mint{background:linear-gradient(90deg,var(--approx) var(--fill,50%),#1b2436 var(--fill,50%))}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;background:var(--accent);border:3px solid #0a1430;cursor:pointer;box-shadow:0 0 12px rgba(122,162,255,.7)}
  input[type=range].mint::-webkit-slider-thumb{background:var(--approx);border-color:#08221b;box-shadow:0 0 12px rgba(61,242,192,.7)}
  input[type=range]::-moz-range-thumb{width:17px;height:17px;border-radius:50%;background:var(--accent);border:3px solid #0a1430;cursor:pointer}
  .inset-wrap{background:#080b12;border:1px solid var(--line);border-radius:11px;padding:10px 12px 6px}
  .inset-wrap .cap{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .inset-wrap .cap b{color:var(--true);font-weight:500}
  #inset{display:block;width:100%;height:118px}
  .challenge{border:1px solid rgba(255,215,106,.3);background:rgba(255,215,106,.05);border-radius:11px;padding:14px 15px}
  .challenge .lab{color:var(--gold);font-size:10px;letter-spacing:.22em;text-transform:uppercase;margin-bottom:8px}
  .challenge .goal{font-size:13px;color:var(--ink);line-height:1.5;margin-bottom:10px}
  .challenge .goal b{color:var(--gold)}
  .cmeter{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px}
  .cmeter b{color:var(--ink);font-weight:500}
  .cbar{height:8px;border-radius:6px;background:#151d2c;overflow:hidden}
  .cbar>i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--error),var(--gold),var(--approx));width:0%;transition:width .2s}
  .cstate{margin-top:9px;font-size:12px;color:var(--muted);min-height:16px}
  .cstate.win{color:var(--approx)}
  .action{width:100%;font-family:inherit;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);cursor:pointer;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:11px;transition:.15s}
  .action:hover{border-color:var(--accent);color:var(--accent)}
  #fx{position:fixed;inset:0;pointer-events:none;z-index:60}
  .toast-wrap{position:fixed;top:18px;right:18px;display:flex;flex-direction:column;gap:9px;z-index:70}
  .toast{display:flex;align-items:center;gap:11px;background:rgba(17,23,38,.96);border:1px solid rgba(255,215,106,.45);border-left:3px solid var(--gold);border-radius:11px;padding:11px 15px;box-shadow:var(--shadow);transform:translateX(130%);animation:slide 3.6s cubic-bezier(.2,.9,.2,1) forwards;max-width:290px}
  @keyframes slide{8%{transform:translateX(0)}88%{transform:translateX(0)}100%{transform:translateX(130%)}}
  .toast .ico{font-size:20px}
  .toast .t1{font-family:"Fraunces",serif;font-weight:700;font-size:14px;color:var(--gold)}
  .toast .t2{font-size:11px;color:var(--muted);margin-top:1px}
  footer{margin-top:16px;font-size:11.5px;color:var(--muted);line-height:1.7}
  footer b{color:var(--approx);font-weight:500}
  @media(max-width:840px){body{padding:14px}.studio{grid-template-columns:1fr}.graph-card{min-height:360px}header{align-items:flex-start}}
</style>
</head>
<body>
<canvas id="fx"></canvas>
<div class="toast-wrap" id="toasts"></div>
<div class="wrap">
  <header>
    <div class="brand">
      <div class="kicker">Math · Visual Studio</div>
      <h1>Partial Derivatives <em>3D</em></h1>
    </div>
    <div class="scoreboard">
      <div class="chip pts"><div class="lab">Points</div><div class="val" id="s-pts">0</div></div>
      <div class="chip streak"><div class="lab">Streak</div><div class="val" id="s-streak">0</div></div>
      <div class="chip"><div class="lab">Badges</div><div class="val" id="s-badges">0</div></div>
    </div>
  </header>
  <div class="studio">
    <div class="card graph-card">
      <canvas id="scene"></canvas>
      <div class="graph-tag">drag to orbit · scroll to zoom</div>
      <div class="legend">
        <span><i class="swatch" style="background:var(--approx)"></i> the slice</span>
        <span><i class="swatch" style="background:var(--true)"></i> cross-section</span>
        <span><i class="swatch" style="background:var(--error)"></i> tangent = ∂f</span>
      </div>
      <div class="readout" id="readout"></div>
    </div>
    <div class="card panel">
      <div>
        <div class="sect-lab">Surface z = f(x, y)</div>
        <div class="fbtns" id="fbtns"></div>
      </div>
      <div>
        <div class="sect-lab">Slice direction</div>
        <div class="toggle">
          <button class="tbtn on" id="ax-x">∂f / ∂x</button>
          <button class="tbtn" id="ax-y">∂f / ∂y</button>
        </div>
      </div>
      <div>
        <div class="slabel"><span id="slice-name">hold y =</span> <b id="slice-val">0.00</b></div>
        <input type="range" id="slice" min="-2" max="2" value="0" step="0.02" aria-label="Slice position">
      </div>
      <div>
        <div class="slabel"><span id="probe-name">move x =</span> <b id="probe-val">0.00</b></div>
        <input type="range" class="mint" id="probe" min="-2" max="2" value="0" step="0.02" aria-label="Probe position along slice">
      </div>
      <div class="inset-wrap">
        <div class="cap">the sliced curve <b id="ins-cap">z = f(x, y₀)</b> — a 1-D graph</div>
        <canvas id="inset"></canvas>
      </div>
      <div class="challenge">
        <div class="lab">◆ Critical-slope challenge</div>
        <div class="goal" id="c-goal"></div>
        <div class="cmeter"><span>|∂f| <b id="c-val">—</b></span><span>target <b id="c-tol">—</b></span></div>
        <div class="cbar"><i id="c-bar"></i></div>
        <div class="cstate" id="c-state">Move the probe until the tangent is flat.</div>
      </div>
      <button class="action" id="reset">Reset view</button>
    </div>
  </div>
  <footer>
    <b>Template note.</b> Same three layers as the 2-D studio. The <b>Engine</b> here is <b>Surface3D</b>
    (canvas orbit camera + painter's-algorithm mesh + slice planes) — but <b>ScoreShell</b>, <b>Confetti</b>
    and every design token are reused unchanged. <b>Content</b> is the SURFACES registry (f, fₓ, f_y per row);
    <b>Playground</b> is the thin wiring. Calc 3 rows swap Content; the Engine stays.
  </footer>
</div>
<script type="module" src="./content.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `playgrounds/partial-derivatives/content.js`** (Layer 2 CONTENT + Layer 3 PLAYGROUND wiring from `partial-derivative-explorer.html` lines 306–412, importing the Engine instead of defining it inline)

```js
import { Surface3D } from '../../engine/surface-3d.js';
import { ScoreShell } from '../../engine/score-shell.js';
import { createConfetti } from '../../engine/confetti.js';
import { s, getCSS, fmtNum as fmt } from '../../engine/dom.js';

/* ---- CONTENT: the SURFACES registry — the only part that changes per concept ---- */
const SURFACES = [
  { id: 'parab', label: 'x² + y²', f: (x, y) => x * x + y * y, fx: (x, y) => 2 * x, fy: (x, y) => 2 * y, a: 2, challenge: { tol: 0.06, hint: 'the bottom of the bowl' } },
  { id: 'saddle', label: 'x² − y²', f: (x, y) => x * x - y * y, fx: (x, y) => 2 * x, fy: (x, y) => -2 * y, a: 2, challenge: { tol: 0.06, hint: 'the saddle pass' } },
  { id: 'ripple', label: 'sin x · cos y', f: (x, y) => Math.sin(x) * Math.cos(y), fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y), a: 3.1, challenge: { tol: 0.05, hint: 'a crest or a trough' } },
  { id: 'gauss', label: 'e^(−r²/4)', f: (x, y) => Math.exp(-(x * x + y * y) / 4), fx: (x, y) => -x / 2 * Math.exp(-(x * x + y * y) / 4), fy: (x, y) => -y / 2 * Math.exp(-(x * x + y * y) / 4), a: 3, challenge: { tol: 0.04, hint: 'the summit of the hill' } },
];

/* ---- PLAYGROUND: thin wiring specific to "partial derivatives" ---- */
const eng = new Surface3D(document.getElementById('scene'));
const shell = new ScoreShell(createConfetti());
let state = { surf: SURFACES[0], axis: 'x', slice: 0, probe: 0, solved: false };
function point() { return state.axis === 'x' ? { x0: state.probe, y0: state.slice } : { x0: state.slice, y0: state.probe }; }
function partial(x0, y0) { return state.axis === 'x' ? state.surf.fx(x0, y0) : state.surf.fy(x0, y0); }

const fbox = s('fbtns');
SURFACES.forEach((sf, i) => {
  const b = document.createElement('button');
  b.className = 'fbtn' + (i === 0 ? ' on' : ''); b.textContent = sf.label; b.onclick = () => pickSurface(sf, b); fbox.appendChild(b);
});
const explored = new Set(['parab']);
function pickSurface(sf, btn) {
  state.surf = sf; state.slice = 0; state.probe = 0; state.solved = false;
  document.querySelectorAll('.fbtn').forEach(x => x.classList.remove('on')); btn.classList.add('on');
  eng.setSurface(sf); setSliderRanges(sf); shell.add(5);
  explored.add(sf.id); if (explored.size === SURFACES.length) shell.badge('explorer', 'Cartographer', 'Explored every surface', '🗺️');
  eng.schedule();
}
function setSliderRanges(sf) { ['slice', 'probe'].forEach(id => { const el = s(id); el.min = -sf.a; el.max = sf.a; el.step = sf.a / 100; el.value = 0; }); }
const usedAxes = new Set(['x']);
function setAxis(ax) {
  state.axis = ax; state.solved = false;
  s('ax-x').classList.toggle('on', ax === 'x'); s('ax-y').classList.toggle('on', ax === 'y');
  s('slice-name').textContent = ax === 'x' ? 'hold y =' : 'hold x =';
  s('probe-name').textContent = ax === 'x' ? 'move x =' : 'move y =';
  s('ins-cap').textContent = ax === 'x' ? 'z = f(x, y₀)' : 'z = f(x₀, y)';
  usedAxes.add(ax); if (usedAxes.size === 2) shell.badge('both', 'Ambidextrous', 'Sliced both directions', '🔀');
  eng.schedule();
}
s('ax-x').onclick = () => setAxis('x'); s('ax-y').onclick = () => setAxis('y');
s('slice').addEventListener('input', e => { state.slice = +e.target.value; eng.schedule(); });
s('probe').addEventListener('input', e => { state.probe = +e.target.value; eng.schedule(); });
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
  s('slice').style.setProperty('--fill', ((state.slice + sf.a) / (2 * sf.a) * 100) + '%');
  s('probe').style.setProperty('--fill', ((state.probe + sf.a) / (2 * sf.a) * 100) + '%');
  const f0 = sf.f(x0, y0), sym = state.axis === 'x' ? '∂f/∂x' : '∂f/∂y';
  s('readout').innerHTML = 'at (' + fmt(x0) + ', ' + fmt(y0) + ') &nbsp;·&nbsp; f = <b>' + f0.toFixed(3) +
    '</b> &nbsp;·&nbsp; ' + sym + ' = <span class="pd">' + m.toFixed(3) + '</span>';
  const ch = sf.challenge, av = Math.abs(m);
  s('c-goal').innerHTML = 'Make the highlighted tangent <b>flat</b> (' + sym + ' = 0) — try ' + ch.hint + '.';
  s('c-val').textContent = av.toFixed(3); s('c-tol').textContent = ch.tol.toFixed(2);
  const ratio = Math.max(0, Math.min(1, 1 - av / (ch.tol * 6))); s('c-bar').style.width = (ratio * 100) + '%';
  const st = s('c-state');
  if (av < ch.tol) {
    if (!state.solved) {
      state.solved = true; shell.add(60); shell.hitStreak(); shell.celebrate();
      shell.toast('Critical point!', sym + ' ≈ 0 · +60', '🎯');
      shell.badge('flat', 'Flatliner', 'Zeroed a partial derivative', '📐');
    }
    st.textContent = '✓ Tangent is flat — ' + sym + ' ≈ 0 here.'; st.className = 'cstate win';
  } else { st.textContent = 'Slope still ' + (m > 0 ? 'positive' : 'negative') + ' — keep moving the probe.'; st.className = 'cstate'; }
}

eng.setSurface(state.surf); setSliderRanges(state.surf); setAxis('x'); eng.schedule();
```

- [ ] **Step 3: Verify dev server renders the playground**

Run: `npm run dev`, open `/playgrounds/partial-derivatives/`
Expected: renders identically to the original — orbit-drag/scroll-zoom the surface, axis toggle swaps slice direction, sliders move the cross-section and probe, inset graph updates, challenge fires toast + confetti + badge when the tangent flattens.

- [ ] **Step 4: Manual side-by-side visual parity check + touch check**

Compare against `partial-derivative-explorer.html` directly. On a touch device or Chrome DevTools touch emulation, confirm one-finger orbit and two-finger pinch-zoom both still work (this exercises `Surface3D._bindCamera`'s pointer-event pinch logic, unchanged from the original — regressions here would be a porting mistake, not a design change).

- [ ] **Step 5: Commit**

```bash
git add playgrounds/partial-derivatives/
git commit -m "feat: refactor partial derivatives playground onto shared engine"
```

---

### Task 11: Deterministic-math verification tests for both playgrounds' Content layer

**Files:**
- Test: `playgrounds/taylor-series/content.test.js`
- Test: `playgrounds/partial-derivatives/content.test.js`

**Interfaces:**
- Consumes: nothing new — re-derives the same math independently (via `Math.exp/sin/cos/log` and finite differences) to check `content.js`'s registries against ground truth, satisfying the brief's "verify computed values against known references" constraint. Since `FUNCTIONS`/`SURFACES` aren't exported from `content.js` (they're wired directly into DOM-bound playground code), these tests re-implement the coefficient formulas from the registries as small standalone functions and check them against reference values — this is intentional duplication so the test doesn't require refactoring `content.js` to export internals it has no other reason to export.

- [ ] **Step 1: Write `playgrounds/taylor-series/content.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { fact } from '../../engine/math.js';

// Mirrors the coeff() functions in playgrounds/taylor-series/content.js —
// verifies the Taylor coefficients against the closed-form series for each function.
const coeffs = {
  exp: n => 1 / fact(n),
  sin: n => n % 2 === 1 ? (((n - 1) / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
  cos: n => n % 2 === 0 ? ((n / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
  ln: n => n === 0 ? 0 : (n % 2 === 1 ? 1 : -1) / n,
  geo: n => 1,
};

function polyAt(coeff, N, x) { let s = 0; for (let n = 0; n <= N; n++) s += coeff(n) * Math.pow(x, n); return s; }

describe('Taylor partial sums converge to the true function', () => {
  it('eˣ at x=1, N=12 matches Math.exp within 1e-6', () => {
    expect(polyAt(coeffs.exp, 12, 1)).toBeCloseTo(Math.exp(1), 6);
  });
  it('sin x at x=1, N=12 matches Math.sin within 1e-6', () => {
    expect(polyAt(coeffs.sin, 12, 1)).toBeCloseTo(Math.sin(1), 6);
  });
  it('cos x at x=1, N=12 matches Math.cos within 1e-6', () => {
    expect(polyAt(coeffs.cos, 12, 1)).toBeCloseTo(Math.cos(1), 6);
  });
  it('ln(1+x) at x=0.5, N=30 matches Math.log(1.5) within 1e-3 (slow-converging series)', () => {
    expect(polyAt(coeffs.ln, 30, 0.5)).toBeCloseTo(Math.log(1.5), 3);
  });
  it('1/(1-x) at x=0.5, N=20 matches the closed form within 1e-6', () => {
    expect(polyAt(coeffs.geo, 20, 0.5)).toBeCloseTo(1 / (1 - 0.5), 6);
  });
});
```

- [ ] **Step 2: Run and verify pass**

Run: `npx vitest run playgrounds/taylor-series/content.test.js`
Expected: PASS (5 tests)

- [ ] **Step 3: Write `playgrounds/partial-derivatives/content.test.js`**

```js
import { describe, it, expect } from 'vitest';

// Mirrors the SURFACES registry in playgrounds/partial-derivatives/content.js —
// verifies each analytic partial against a central-difference numerical approximation.
const SURFACES = [
  { id: 'parab', f: (x, y) => x * x + y * y, fx: (x, y) => 2 * x, fy: (x, y) => 2 * y },
  { id: 'saddle', f: (x, y) => x * x - y * y, fx: (x, y) => 2 * x, fy: (x, y) => -2 * y },
  { id: 'ripple', f: (x, y) => Math.sin(x) * Math.cos(y), fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y) },
  { id: 'gauss', f: (x, y) => Math.exp(-(x * x + y * y) / 4), fx: (x, y) => -x / 2 * Math.exp(-(x * x + y * y) / 4), fy: (x, y) => -y / 2 * Math.exp(-(x * x + y * y) / 4) },
];

function numFx(f, x, y, h = 1e-5) { return (f(x + h, y) - f(x - h, y)) / (2 * h); }
function numFy(f, x, y, h = 1e-5) { return (f(x, y + h) - f(x, y - h)) / (2 * h); }

describe('Analytic partials match central-difference numerical approximation', () => {
  const samplePoints = [[0.7, -0.4], [1.3, 1.1], [-0.9, 0.6]];

  SURFACES.forEach(surf => {
    samplePoints.forEach(([x, y]) => {
      it(`${surf.id}: ∂f/∂x at (${x}, ${y})`, () => {
        expect(surf.fx(x, y)).toBeCloseTo(numFx(surf.f, x, y), 4);
      });
      it(`${surf.id}: ∂f/∂y at (${x}, ${y})`, () => {
        expect(surf.fy(x, y)).toBeCloseTo(numFy(surf.f, x, y), 4);
      });
    });
  });
});
```

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run playgrounds/partial-derivatives/content.test.js`
Expected: PASS (24 tests — 4 surfaces × 3 points × 2 partials)

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all suites pass (math.js, dom.js, score-shell.js, taylor-series/content, partial-derivatives/content).

- [ ] **Step 6: Commit**

```bash
git add playgrounds/taylor-series/content.test.js playgrounds/partial-derivatives/content.test.js
git commit -m "test: verify Taylor coefficients and analytic partials against reference values"
```

---

### Task 12: Static build verification

**Files:**
- None created — verification only.

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: `dist/` created containing `index.html`, `playgrounds/taylor-series/index.html`, `playgrounds/partial-derivatives/index.html`, plus hashed JS/CSS chunks. No build errors or warnings about unresolved imports.

- [ ] **Step 2: Serve the build locally and smoke-test both playgrounds**

Run: `npm run preview`
Expected: visiting the preview URL's `/playgrounds/taylor-series/` and `/playgrounds/partial-derivatives/` routes renders and behaves identically to the dev-server versions checked in Tasks 9–10. Confirm via browser devtools Network tab that no requests go out except the Google Fonts CSS/woff2 (no other external calls) — satisfies the "no runtime API calls" constraint.

- [ ] **Step 3: Commit** (only if `dist/` inspection surfaced a config fix — otherwise nothing to commit, `dist/` is gitignored)

```bash
git status
# if vite.config.js or package.json changed to fix a build issue:
git add vite.config.js package.json
git commit -m "fix: correct multi-page build config"
```

---

### Task 13: Deploy one playground and record the URL

**Files:**
- None created — deployment only. Exact commands depend on which target was confirmed with the user before this task starts (see plan cover note below) — both are provided.

- [ ] **Step 1a — if Cloudflare Pages was chosen:**

```bash
npx wrangler pages deploy dist --project-name=college-math-viz
```
(First run will prompt an interactive Cloudflare login/project-create flow if `wrangler` isn't already authenticated — this is expected and requires the user's Cloudflare credentials, not something to script around.)

- [ ] **Step 1b — if Vercel was chosen:**

```bash
npx vercel deploy dist --prod
```
(First run will prompt an interactive Vercel login/project-link flow if not already authenticated.)

- [ ] **Step 2: Confirm the deployed playground loads and works**

Visit the returned URL's `/playgrounds/taylor-series/` (or whichever playground was deployed) and repeat the manual check from Task 9 Step 4 against the live URL — drag-to-probe, term slider, animate build, precision challenge.

- [ ] **Step 3: Report the live URL back to the user.** This closes Phase 1's definition of done. **Stop here — do not begin Phase 2 without explicit confirmation.**

---

## Self-Review

**Spec coverage:**
- Repo structure + minimal build stack proposed for confirmation before scaffolding → covered by this plan being presented before Task 1 executes.
- `engine/tokens.css`, `score-shell.js`, `confetti.js`, `grapher-2d.js`, `surface-3d.js`, `math.js` → Tasks 2–8, all six listed explicitly in the brief.
- Both templates refactored into `playgrounds/taylor-series/` and `playgrounds/partial-derivatives/`, each `index.html` + `content.js` → Tasks 9–10.
- "Render and behave identically to the originals — verify visually" → manual side-by-side steps in Tasks 9 & 10.
- Dev server + static production build → Task 1 (dev) + Task 12 (build verification).
- Deploy one playground, give the URL → Task 13.
- "No runtime API calls / no external dependencies" → checked explicitly in Task 12 Step 2.
- "Deterministic math… verify computed values against known references" → Task 11 (Taylor coefficients vs `Math.exp/sin/cos/log`, analytic partials vs numerical finite difference).
- Self-hosting fonts as woff2 → explicitly noted as deferred/optional, not blocking Phase 1's definition of done (brief says "when convenient," not required for Phase 1).
- Touch/orbit/pinch on mobile → called out as a specific manual check in Task 10 Step 4.
- Phase 2/3 → explicitly out of scope; Task 13 Step 3 stops and waits for confirmation.

**Placeholder scan:** No TBD/TODO markers; every step has literal file contents or literal commands.

**Type/name consistency:** `ScoreShell` constructor takes a confetti instance (`new ScoreShell(createConfetti())`) consistently in both Task 9 and Task 10's wiring, matching Task 6's definition. `fmtAxis` used only in `grapher-2d.js` (Task 7) and Taylor's readout formatting (Task 9); `fmtNum` used only in the partial-derivatives slider readouts (Task 10) — matches the diff note's finding that these are legitimately different formatters. Vector helper names (`vsub`/`vcross`/`vdot`/`vnorm`) are consistent between Task 2's export and Task 8's `surface-3d.js` usage.

## Open decisions for the user (per the brief's "wait for confirmation on big/irreversible choices")

1. **Deploy target for Task 13:** Cloudflare Pages (your existing infra, per the brief) or Vercel (also available, and this session already has Vercel MCP tooling connected)?
2. **Execution approach:** subagent-driven (fresh subagent per task, reviewed between tasks) or inline in this session?
