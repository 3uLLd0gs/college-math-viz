# Custom Expressions (riemann-sums) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a professor add a custom `f(x)` to the riemann-sums playground via an in-page field and shareable URL, integrated numerically over a domain they set — safely evaluated by the Phase-2 whitelist parser.

**Architecture:** A reusable `engine/custom-fn.js` wraps `engine/expr.js` into `compileCustom(src) -> {f, error}`. The riemann-sums playground reads `?expr=&a=&b=` (and an in-page input) into a synthetic `{id:'custom', f, a, b, custom:true}` integrand entry, plots it, and hides the challenge (a custom function has no known exact integral). The untrusted expression reaches code only through the parser and the DOM only as `textContent`/`.value`.

**Tech Stack:** Vanilla JS ES modules, Vitest + happy-dom (unit), Playwright (E2E), Vite multi-page build. No runtime dependencies.

## Global Constraints

- **No `eval`/`Function` on any user string.** `engine/expr.js` is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** The expression is displayed via `textContent` and set via `<input>.value` only — never `innerHTML`.
- **No runtime network calls; no backend.** State/sharing ride on localStorage and the URL.
- **Design system fixed.** Colours from `engine/tokens.css`; shared CSS in `engine/chrome.css` (linked, never `@import`ed); page-specific CSS in the page's own `<style>`.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase3-custom`. **Slug:** `riemann-sums`. **Custom entry id:** `custom` (verbatim).

---

## File Structure

- Modify `engine/deep-link.js` + `engine/deep-link.test.js` — add a `managed` key-set option so a URL writer can DROP its own schema keys that are currently absent (needed because `expr`/`a`/`b` come and go) while still preserving foreign keys like `present`.
- Create `engine/custom-fn.js` + `engine/custom-fn.test.js` — `compileCustom(src) -> {f, error}`.
- Modify `playgrounds/riemann-sums/playground.js` — custom integrand entry, URL schema, render branch, challenge hide, managed URL sync.
- Modify `playgrounds/riemann-sums/index.html` — `id="challenge"` on the challenge card; a custom input row.
- Create `e2e/custom-fn.spec.js` — end-to-end.

---

## Task 1: `deep-link.js` — `managed` keys so optional params can be dropped

**Why:** `makeUrlSync`/`syncedUrl` (from Phase 1) MERGE new params over the current URL, preserving any key not in the new set — that is deliberate, so `?present=1` survives. But riemann's `expr`/`a`/`b` are optional: when the user switches from a custom function back to a built-in, `urlState()` stops emitting them, and the merge would leave them stale in the URL (a shared link would then wrongly re-select custom). A `managed` key-set lets the writer clear its own schema keys before setting the present ones, while foreign keys stay untouched.

**Files:**
- Modify: `engine/deep-link.js`
- Test: `engine/deep-link.test.js`

**Interfaces:**
- Produces: `syncedUrl(params, managed?)` — when `managed` (an array of key names) is given, those keys are deleted from the current search before the new `params` are set. `makeUrlSync(toParams, { delay?, managed? })` — passes `managed` through to `syncedUrl`.
- Backward compatible: omitting `managed` preserves the current Phase-1 behavior exactly (used by the other ten playgrounds).

- [ ] **Step 1: Write the failing test**

Append to `engine/deep-link.test.js` (it already imports from `./deep-link.js`; add `syncedUrl` to that import if not present):

```js
import { syncedUrl } from './deep-link.js';

describe('syncedUrl managed keys', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/p/?present=1&expr=x%5E2&a=0&b=2'); });

  it('without managed, preserves every existing key (Phase-1 behavior)', () => {
    const out = syncedUrl(new URLSearchParams({ fn: 'square' }));
    expect(out).toContain('present=1');
    expect(out).toContain('expr=x%5E2');   // stale expr survives — the bug managed fixes
    expect(out).toContain('fn=square');
  });

  it('with managed, drops managed keys absent from the new params but keeps foreign keys', () => {
    const managed = ['fn', 'rule', 'n', 'expr', 'a', 'b'];
    const out = syncedUrl(new URLSearchParams({ fn: 'square', rule: 'left', n: '4' }), managed);
    expect(out).toContain('fn=square');
    expect(out).toContain('present=1');     // foreign key preserved
    expect(out).not.toContain('expr=');     // managed-but-absent → dropped
    expect(out).not.toContain('a=');
    expect(out).not.toContain('b=');
  });

  it('with managed, still sets the present managed keys', () => {
    const managed = ['fn', 'expr', 'a', 'b'];
    const out = syncedUrl(new URLSearchParams({ expr: 'sin(x)', a: '1', b: '3' }), managed);
    expect(out).toContain('expr=sin%28x%29');
    expect(out).toContain('a=1');
    expect(out).toContain('present=1');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/deep-link.test.js`
Expected: FAIL (`syncedUrl` ignores the second argument).

- [ ] **Step 3: Implement**

In `engine/deep-link.js`, replace the current `syncedUrl` and `makeUrlSync` with:

```js
/** Merge freshly-computed schema params into the current URL's search string,
   preserving foreign params (e.g. ?present=1) so the auto-sync and Copy-link
   never strip each other's keys. If `managed` (an array of key names owned by
   this writer) is given, those keys are cleared first, so an optional schema
   key that is currently absent (e.g. ?expr when a built-in is selected) is
   dropped rather than left stale. Returns a pathname-relative URL. */
export function syncedUrl(params, managed) {
  const merged = new URLSearchParams(window.location.search);
  if (managed) for (const k of managed) merged.delete(k);
  for (const [k, v] of params.entries()) merged.set(k, v);
  const qs = merged.toString();
  return `${window.location.pathname}${qs ? '?' + qs : ''}`;
}

export function makeUrlSync(toParams, { delay = 180, managed } = {}) {
  let timer = null;
  return state => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      window.history.replaceState(null, '', syncedUrl(toParams(state), managed));
    }, delay);
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/deep-link.test.js`
Expected: PASS. Then `npm test` to confirm the other playgrounds' deep-link tests still pass (managed defaults to undefined = unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git add engine/deep-link.js engine/deep-link.test.js
git commit -m "feat: managed key-set in deep-link so optional URL params can be dropped"
```

---

## Task 2: `engine/custom-fn.js` — safe custom-function compiler

**Files:**
- Create: `engine/custom-fn.js`
- Test: `engine/custom-fn.test.js`

**Interfaces:**
- Consumes: `compile`, `ExprError` from `engine/expr.js`.
- Produces: `compileCustom(src: string) -> { f: ((x:number)=>number) | null, error: string }`. On success `f` is a total function returning `NaN` (never throwing) where the expression is undefined, and `error` is `''`. On failure `f` is `null` and `error` is a short human message.

- [ ] **Step 1: Write the failing test**

```js
// engine/custom-fn.test.js
import { describe, it, expect } from 'vitest';
import { compileCustom } from './custom-fn.js';

describe('compileCustom', () => {
  it('compiles a valid expression to a numeric function', () => {
    const { f, error } = compileCustom('x^2');
    expect(error).toBe('');
    expect(f(3)).toBe(9);
  });
  it('compiles a function with a pole (finite off the pole)', () => {
    const { f, error } = compileCustom('1/x');
    expect(error).toBe('');
    expect(f(2)).toBeCloseTo(0.5, 12);
  });
  it('returns a NaN (not a throw) where the expression is undefined', () => {
    const { f } = compileCustom('ln(x)');
    expect(Number.isNaN(f(-1))).toBe(true);   // ln of a negative → NaN, no throw
  });
  it('rejects hostile / unparseable input without executing', () => {
    for (const bad of ['alert(1)', '__proto__', 'x.constructor', '<script>', '1;2', 'y+1']) {
      const { f, error } = compileCustom(bad);
      expect(f).toBeNull();
      expect(error).not.toBe('');
    }
  });
  it('rejects a function that is non-finite across the whole sample range', () => {
    const { f, error } = compileCustom('sqrt(-1-x^2)');   // always NaN for real x
    expect(f).toBeNull();
    expect(error).not.toBe('');
  });
  it('rejects empty / whitespace input', () => {
    expect(compileCustom('   ').f).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/custom-fn.test.js`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `engine/custom-fn.js`**

```js
/* Turns an untrusted expression string into a safe numeric function for the
   custom-content feature. It never executes the string as code — it delegates
   entirely to engine/expr.js's whitelist parser. The returned f is total: it
   yields NaN where the expression is undefined (e.g. ln of a negative) rather
   than throwing, because the playground's plot/sum code tolerates NaN. */

import { compile, ExprError } from './expr.js';

// A spread of sample points to sanity-check that the function is a real number
// SOMEWHERE — catches expressions that are NaN everywhere (e.g. sqrt of a
// always-negative argument) without rejecting ordinary poles like 1/x.
const SAMPLES = [-2.3, -1.1, -0.3, 0.4, 0.9, 1.7, 2.6, 3.4];

export function compileCustom(src) {
  let g;
  try {
    g = compile(src);
  } catch (e) {
    if (e instanceof ExprError) return { f: null, error: "Couldn't read that expression." };
    throw e;
  }

  const f = x => {
    try {
      const y = g({ x });
      return Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };

  const anyFinite = SAMPLES.some(x => Number.isFinite(f(x)));
  if (!anyFinite) return { f: null, error: "That function isn't a real number anywhere here." };

  return { f, error: '' };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/custom-fn.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/custom-fn.js engine/custom-fn.test.js
git commit -m "feat: compileCustom — safe untrusted-expression to numeric function"
```

---

## Task 3: riemann-sums — the custom integrand (URL-driven)

Wire a custom entry that a `?expr=&a=&b=` URL activates: build the entry, plot it, add a "◆ custom" pill, and hide the challenge. The in-page input row comes in Task 4; this task is testable by loading a parametered URL.

**Files:**
- Modify: `playgrounds/riemann-sums/index.html` (add `id="challenge"` to the challenge card)
- Modify: `playgrounds/riemann-sums/playground.js`

**Interfaces:**
- Consumes: `compileCustom` (`engine/custom-fn.js`); `syncedUrl`/`makeUrlSync` with `managed` (Task 1).
- Produces (used by Task 4): `activateCustom(src, a, b)` — validate + select the custom function, or show an inline error; `deactivateCustom()` — called when a built-in pill is chosen.

- [ ] **Step 1: Add `id="challenge"` to the challenge card**

In `playgrounds/riemann-sums/index.html`, change the challenge card opening tag (currently `<div class="challenge">`, around line 77) to:

```html
      <div class="challenge" id="challenge">
```

- [ ] **Step 2: Extend the URL schema and import `compileCustom`**

In `playgrounds/riemann-sums/playground.js`:

- Add to the imports:
```js
import { compileCustom } from '../../engine/custom-fn.js';
```
- Change `URL_SCHEMA` to:
```js
const URL_SCHEMA = { fn: 'string', rule: 'string', n: 'number', expr: 'string', a: 'number', b: 'number' };
```

- [ ] **Step 3: Add custom-function state, the pill, and the activate/deactivate/view helpers**

Add after the `fnButtons`/`ruleButtons` definitions (after the `nSlider`/`markExplored` block, before `render`):

```js
// --- custom function (Phase 3) -----------------------------------------------
let customFn = null;       // the synthetic integrand entry, or null
let customActive = false;

// A "◆ custom" pill that lives with the built-in function pills. buttonGroup
// snapshots its items at construction, so this is a separate element; picking a
// built-in clears it, and it re-selects the custom function when clicked.
const customPill = document.createElement('button');
customPill.type = 'button';
customPill.id = 'customPill';                 // #customPill is the interface contract Tasks 4/5 select on
customPill.className = 'fbtn custom-pill';
customPill.textContent = '◆ custom';
customPill.hidden = true;
customPill.addEventListener('click', () => { if (customFn) selectCustom(); });
document.getElementById('fbtns').appendChild(customPill);

function customView(f, a, b) {
  const N = 64; let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= N; i++) {
    const y = f(a + (b - a) * i / N);
    if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) { lo = -1; hi = 1; }
  const padX = (b - a) * 0.15 || 0.5, padY = (hi - lo) * 0.2 || 0.5;
  return { xmin: a - padX, xmax: b + padX, ymin: Math.min(0, lo) - padY, ymax: hi + padY };
}

function setCustomMsg(text) {
  const el = document.getElementById('customMsg');
  if (el) el.textContent = text;   // textContent — never innerHTML for user input
}

/** Validate `src` over [a,b] and, if good, build+select the custom integrand.
 *  Returns true on success. Shows an inline message and changes nothing on failure. */
function activateCustom(src, a, b) {
  a = Number(a); b = Number(b);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) {
    setCustomMsg("'to' must be greater than 'from'.");
    return false;
  }
  const { f, error } = compileCustom(src);
  if (!f) { setCustomMsg(error); return false; }
  setCustomMsg('');
  customFn = { id: 'custom', label: '◆ custom', tex: src, f, a, b, custom: true, view: customView(f, a, b) };
  customPill.hidden = false;
  selectCustom();
  return true;
}

function selectCustom() {
  state.fn = customFn;
  customActive = true;
  fnButtons.select(-1, { notify: false });   // clear built-in highlights
  customPill.classList.add('on');
  g.setView(customFn.view);
  render();
  pushUrl();
}

function deactivateCustom() {
  customActive = false;
  customPill.classList.remove('on');
}
```

- [ ] **Step 4: Clear custom when a built-in pill is chosen**

In the existing `fnButtons = buttonGroup('fbtns', INTEGRANDS, fn => { ... })` callback, add `deactivateCustom();` as the FIRST line of the callback body (so choosing a built-in drops custom mode):

```js
const fnButtons = buttonGroup('fbtns', INTEGRANDS, fn => {
  deactivateCustom();
  state.fn = fn; meter.reset();
  g.setView(fn.view);
  shell.award(`explore:${fn.id}`, 5);
  markExplored(fn.id);
  render();
  pushUrl();
});
```

- [ ] **Step 5: Branch `render()` for the custom function (secure display, no challenge)**

Replace the body of `render()` with a version that handles the custom entry. Keep the built-in path identical to today; add the custom branch and the challenge show/hide:

```js
function render() {
  const { fn, rule, n } = state;

  g.clear(); g.grid();
  for (const r of rectangles(fn, n, rule)) {
    g.bar(r.x0, r.x1, r.y, { fill: getCSS('--approx'), stroke: 'rgba(0,0,0,.45)', alpha: 0.34 });
  }
  g.plot(x => fn.f(x), { color: getCSS('--true'), width: 2.6, glow: 6 });
  g.vline(fn.a, getCSS('--muted'));
  g.vline(fn.b, getCSS('--muted'));

  const approx = riemannSum(fn, n, rule);
  document.getElementById('n-lab').innerHTML = `${n}<small> rect</small>`;

  if (fn.custom) {
    // No known exact integral → demonstration only: hide the challenge, and
    // render the expression via textContent (untrusted string, never innerHTML).
    const ro = document.getElementById('readout');
    ro.innerHTML =
      `∫<sub>${fmt(fn.a)}</sub><sup>${fmt(fn.b)}</sup> <span class="cx"></span> dx` +
      ` &nbsp;·&nbsp; ${rule.label} sum = <b>${approx.toFixed(5)}</b>`;
    ro.querySelector('.cx').textContent = fn.tex;
    document.getElementById('challenge').style.display = 'none';
    return;
  }

  document.getElementById('challenge').style.display = '';
  const err = Math.abs(approx - fn.exact);
  document.getElementById('readout').innerHTML =
    `∫<sub>${fmt(fn.a)}</sub><sup>${fmt(fn.b)}</sup> ${fn.tex} dx` +
    ` &nbsp;·&nbsp; ${rule.label} sum = <b>${approx.toFixed(5)}</b>` +
    ` &nbsp;·&nbsp; exact = <b>${fn.exact.toFixed(5)}</b>` +
    ` &nbsp;·&nbsp; error = <b class="er">${err.toExponential(2)}</b>`;

  meter.update({
    value: err, tol: fn.tol,
    goal: `Squeeze the sum for <b>${fn.tex}</b> down to the target error — a smarter sampling rule gets there with far fewer rectangles.`,
    solvedText: `✓ On target with ${n} rectangles.`,
    hintText: 'Add rectangles — the sum is still off the true area.',
  });
}
```

- [ ] **Step 6: Emit `expr`/`a`/`b` in the URL only when custom is active, with managed keys**

Replace `urlState` and the `pushUrl` definition with:

```js
const urlState = () => customActive
  ? { fn: 'custom', rule: state.rule.id, n: state.n, expr: customFn.tex, a: customFn.a, b: customFn.b }
  : { fn: state.fn.id, rule: state.rule.id, n: state.n };
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

And update the Copy-link handler to pass the managed keys too:

```js
document.getElementById('copylink').onclick = async () => {
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()), Object.keys(URL_SCHEMA))}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
```

- [ ] **Step 7: Handle `expr` in `applyState`**

In `applyState(st)`, after the existing `fn`/`rule`/`n` handling and BEFORE `meter.reset(); render(); pushUrl();`, add the custom branch. Because a custom link should win over any stale `fn`, apply it last:

```js
function applyState(st) {
  if (st.fn && st.fn !== 'custom') {
    const fn = INTEGRANDS.find(f => f.id === st.fn);
    if (fn) { deactivateCustom(); state.fn = fn; fnButtons.select(INTEGRANDS.indexOf(fn), { notify: false }); g.setView(fn.view); }
  }
  if (st.rule) {
    const r = RULES.find(x => x.id === st.rule);
    if (r) { state.rule = r; ruleButtons.select(RULES.indexOf(r), { notify: false }); }
  }
  if (typeof st.n === 'number') { state.n = st.n; nSlider.set(st.n); }
  if (typeof st.expr === 'string' && st.expr) {
    // activateCustom renders + pushes on success; fall through to the shared
    // render below either way (it is idempotent).
    activateCustom(st.expr, st.a ?? 0, st.b ?? 2);
  }
  meter.reset();
  render();
  pushUrl();
}
```

- [ ] **Step 8: Build, smoke-check, commit**

Run: `npm test && npm run build`
Expected: all unit tests green (no new unit tests in this task — it is DOM wiring, covered by Task 5 E2E); build clean.

Smoke-check by code trace: loading `/playgrounds/riemann-sums/?expr=x^2&a=0&b=2&n=80` calls `applyState` → `activateCustom('x^2',0,2)` → `selectCustom()` → custom entry plotted, challenge hidden, `?expr` retained. Confirm no `innerHTML` receives `fn.tex` on the custom path.

```bash
git add playgrounds/riemann-sums/index.html playgrounds/riemann-sums/playground.js
git commit -m "feat: URL-driven custom integrand on riemann-sums"
```

---

## Task 4: riemann-sums — the in-page custom input row

**Files:**
- Modify: `playgrounds/riemann-sums/index.html` (input row markup + page-specific CSS)
- Modify: `playgrounds/riemann-sums/playground.js` (wire the fields)

**Interfaces:**
- Consumes: `activateCustom(src, a, b)` and `setCustomMsg` from Task 3.

- [ ] **Step 1: Add the input row markup**

In `playgrounds/riemann-sums/index.html`, add a custom-function row inside the panel, immediately after the function-pills section that contains `<div class="fbtns" id="fbtns"></div>` (i.e. after that section's closing `</div>`). Use existing token-based styling; add the small page-specific CSS to the page's own `<style>` block.

Markup:
```html
      <div class="custom-row">
        <label class="custom-lab" for="customExpr">your f(x)</label>
        <input id="customExpr" class="custom-input" type="text" autocomplete="off" spellcheck="false"
               placeholder="e.g. x^3 - sin(x)" aria-label="Custom function f of x">
        <span class="custom-dom">from
          <input id="customA" class="custom-num" type="number" step="0.5" value="0" aria-label="Domain start">
          to
          <input id="customB" class="custom-num" type="number" step="0.5" value="2" aria-label="Domain end">
        </span>
        <div class="custom-msg" id="customMsg" role="status" aria-live="polite"></div>
      </div>
```

Add to the page's `<style>` block:
```css
  .custom-row{margin-top:12px;display:flex;flex-direction:column;gap:8px}
  .custom-lab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .custom-input{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink);
    background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:9px 11px}
  .custom-input:focus{outline:2px solid var(--accent);outline-offset:2px}
  .custom-dom{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:7px}
  .custom-num{width:64px;font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--ink);
    background:var(--panel-2);border:1px solid var(--line);border-radius:7px;padding:6px 8px}
  .custom-msg{font-size:11.5px;color:var(--error);min-height:15px;line-height:1.4}
  .custom-pill{border-style:dashed}
```

- [ ] **Step 2: Wire the fields**

In `playgrounds/riemann-sums/playground.js`, after the custom helpers from Task 3 (after `deactivateCustom`), add listeners that read the three fields and (re)activate on change. Place this before `render()` is first called is not required — it only needs the helpers to exist; put it right after the `customPill` wiring block:

```js
const customExprEl = document.getElementById('customExpr');
const customAEl = document.getElementById('customA');
const customBEl = document.getElementById('customB');

function submitCustom() {
  const src = customExprEl.value.trim();
  if (!src) { setCustomMsg(''); return; }
  activateCustom(src, customAEl.value, customBEl.value);
}

customExprEl.addEventListener('input', submitCustom);
customExprEl.addEventListener('keydown', e => { if (e.key === 'Enter') submitCustom(); });
customAEl.addEventListener('change', submitCustom);
customBEl.addEventListener('change', submitCustom);
```

- [ ] **Step 3: Reflect a URL-loaded custom expression back into the fields**

So that opening a `?expr=…&a=…&b=…` link shows the expression in the input, update `activateCustom` (Task 3) to sync the fields on success. Add these three lines just after `setCustomMsg('')` inside `activateCustom`:

```js
  if (customExprEl && customExprEl.value.trim() !== src) customExprEl.value = src;   // .value — inert, safe
  if (customAEl) customAEl.value = String(a);
  if (customBEl) customBEl.value = String(b);
```

(Guard with `if` because `activateCustom` may run on URL load before the field consts exist in module order; if so, move the three `document.getElementById` field consts above `activateCustom`. Ensure the field consts are declared before `applyState`/`readState` runs. The simplest ordering: declare `customExprEl`/`customAEl`/`customBEl` in the custom-helpers block of Task 3, and keep the listener wiring here.)

- [ ] **Step 4: Build, smoke-check, commit**

Run: `npm test && npm run build`
Expected: green; build clean.

Smoke-check by trace: typing `sin(x)` into `#customExpr` fires `submitCustom` → `activateCustom('sin(x)', 0, 2)` → custom selected, `?expr=sin(x)` written; an unreadable entry shows `#customMsg` and changes nothing.

```bash
git add playgrounds/riemann-sums/index.html playgrounds/riemann-sums/playground.js
git commit -m "feat: in-page custom-function input row on riemann-sums"
```

---

## Task 5: End-to-end suite

**Files:**
- Create: `e2e/custom-fn.spec.js`

**Interfaces:**
- Consumes: the built riemann-sums page.

- [ ] **Step 1: Write the spec**

```js
// e2e/custom-fn.spec.js
import { test, expect } from '@playwright/test';

test('a URL custom function integrates and shows the expression', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/?expr=x^2&a=0&b=2&rule=mid&n=80');
  // the expression is shown (via textContent) in the readout
  await expect(page.locator('#readout .cx')).toHaveText('x^2');
  // midpoint sum of x^2 over [0,2] at n=80 ≈ 2.667
  await expect(page.locator('#readout')).toContainText('2.6');
  // custom pill is visible and selected
  await expect(page.locator('#customPill')).toBeVisible();
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // the challenge is hidden for a custom function
  await expect(page.locator('#challenge')).toBeHidden();
});

test('a hostile expression is rejected inline with no entry and no console error', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/playgrounds/riemann-sums/?expr=alert(1)');
  await expect(page.locator('#customMsg')).not.toHaveText('');   // inline error shown
  await expect(page.locator('#customPill')).toBeHidden();        // no custom entry created
  await expect(page.locator('#challenge')).toBeVisible();        // still a built-in view
  expect(errors).toEqual([]);
});

test('typing a custom function updates the URL and the plot', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/');
  await page.fill('#customExpr', 'sin(x)');
  await page.locator('#customExpr').dispatchEvent('input');
  await expect(page.locator('#readout .cx')).toHaveText('sin(x)');
  await expect(page).toHaveURL(/expr=sin/);
  await expect(page.locator('#challenge')).toBeHidden();
});

test('Copy-link round-trips a custom function through a fresh page', async ({ page, context }) => {
  await page.goto('/playgrounds/riemann-sums/?expr=x^2&a=1&b=3&n=40');
  const url = page.url();
  expect(url).toContain('expr=');
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#readout .cx')).toHaveText('x^2');
  await expect(p2.locator('#customExpr')).toHaveValue('x^2');
});

test('switching to a built-in drops the custom function from the URL', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/?expr=x^2&a=0&b=2');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // click the first built-in function pill
  await page.locator('#fbtns .fbtn').first().click();
  await expect(page.locator('#challenge')).toBeVisible();     // challenge back
  await expect(page).not.toHaveURL(/expr=/);                  // managed key dropped
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS (the new specs plus all existing E2E). If the seeded numeric assertion is brittle, confirm the midpoint sum value against `riemannSum` and adjust the substring to the real rendered value — but keep the assertion meaningful (it must prove the custom function is integrated, not just that the page loaded).

- [ ] **Step 3: Commit**

```bash
git add e2e/custom-fn.spec.js
git commit -m "test: end-to-end suite for custom expressions on riemann-sums"
```

---

## Phase 3 close

- [ ] Full unit suite (`npm test`) and E2E (`npm run test:e2e`) green.
- [ ] `npm run build`; confirm clean.
- [ ] Merge `phase3-custom` → `main` (auto-deploys) **only on explicit user go-ahead**; spot-check the live custom feature (type a function, set the domain, share the link, confirm the challenge hides).
- [ ] This completes the 3-phase improvement plan. Rolling custom expressions to other playgrounds is a future phase, each reusing `engine/custom-fn.js`.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-24-custom-expressions-design.md`):
1. `engine/custom-fn.js` safe compiler → Task 2. ✓
2. riemann `URL_SCHEMA` + custom entry + applyState → Task 3. ✓
3. In-page input row (expr + from/to + inline error) → Task 4. ✓
4. Domain settable, synced to `?a=&b=` → Tasks 3 (URL) + 4 (fields). ✓
5. Challenge hidden for custom → Task 3 Step 5. ✓
6. Security: expr only to parser / `.value` / `textContent`, never `innerHTML` → Task 3 Step 5 (readout `.cx` textContent), Task 4 (`.value`), `setCustomMsg` textContent. ✓
7. Optional URL keys drop cleanly when switching away → Task 1 (managed keys) + Task 3 Step 6. ✓
8. E2E (integrate, reject hostile, type, Copy-link, drop-on-switch) → Task 5. ✓

**Placeholder scan:** every code step carries complete code; no TBD/TODO/"handle edge cases". ✓

**Type/name consistency:** `compileCustom(src) -> {f, error}` (Task 2) used by Task 3. `activateCustom(src,a,b)`/`deactivateCustom()`/`selectCustom()`/`setCustomMsg` defined in Task 3, consumed by Task 4. `syncedUrl(params, managed)` / `makeUrlSync(toParams,{managed})` (Task 1) used in Task 3 Step 6. `URL_SCHEMA` keys `fn,rule,n,expr,a,b` consistent across Tasks 3 and 5. Element ids `customExpr/customA/customB/customMsg/customPill/challenge` consistent across Tasks 3, 4, 5. Custom entry shape `{id:'custom', label, tex, f, a, b, custom:true, view}` consistent. ✓
