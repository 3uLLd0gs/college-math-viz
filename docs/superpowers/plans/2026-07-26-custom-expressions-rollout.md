# Custom Expressions Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Phase-3 custom-`f(x)` feature to solids-of-revolution (custom profile, challenge hidden) and secant-tangent (custom curve with a numeric derivative, challenge kept), factoring the common pure logic into shared tested helpers.

**Architecture:** `engine/custom-fn.js` gains `viewFromDomain` (extracted from riemann), `numericDerivative`, and `wireCustomInput`. Each of the two playgrounds gains a thin integration mirroring riemann's: a `?expr=…` URL + in-page input row build a synthetic `{id:'custom', …}` registry entry, safely evaluated by the whitelist parser and displayed only via `textContent`/`.value`.

**Tech Stack:** Vanilla JS ES modules, Vitest + happy-dom (unit), Playwright (E2E), Vite multi-page build. No runtime dependencies.

## Global Constraints

- **No `eval`/`Function` on any user string.** `engine/expr.js` (via `compileCustom`) is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** The expression is shown via `textContent` and set via `<input>.value` only — never `innerHTML`.
- **No runtime network calls; no backend.** State/sharing ride on localStorage and the URL.
- **Design system fixed.** Colours from `engine/tokens.css`; page-specific CSS in the page's own `<style>`; `engine/chrome.css` linked, never `@import`ed.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase4-custom-rollout`. **Custom entry id:** `custom` (verbatim). **Slugs:** `solids-of-revolution`, `secant-tangent`.

---

## File Structure

- Modify `engine/custom-fn.js` + `engine/custom-fn.test.js` — add `viewFromDomain`, `numericDerivative`, `wireCustomInput`.
- Modify `playgrounds/riemann-sums/playground.js` — backfill: use the shared `viewFromDomain`, delete the inline copy.
- Modify `playgrounds/solids-of-revolution/{playground.js,index.html}` — custom region.
- Modify `playgrounds/secant-tangent/{playground.js,index.html}` — custom function with numeric derivative.
- Create `e2e/custom-rollout.spec.js` — end-to-end for both.

---

## Task 1: shared helpers in `engine/custom-fn.js` + riemann backfill

**Files:**
- Modify: `engine/custom-fn.js`
- Test: `engine/custom-fn.test.js`
- Modify: `playgrounds/riemann-sums/playground.js` (backfill)

**Interfaces:**
- Produces:
  - `viewFromDomain(f, a, b) -> { xmin, xmax, ymin, ymax }`
  - `numericDerivative(f, eps=1e-5) -> (x:number) => number`
  - `wireCustomInput({ exprEl, aEl?, bEl?, msgEl, onSubmit }) -> { setFields(src,a,b), setMsg(text) }`

- [ ] **Step 1: Write the failing tests**

Append to `engine/custom-fn.test.js` (it already imports `compileCustom` from `./custom-fn.js`; add the three new names to that import):

```js
import { viewFromDomain, numericDerivative, wireCustomInput } from './custom-fn.js';

describe('viewFromDomain', () => {
  it('brackets the sampled range of f over [a,b] and includes y=0', () => {
    const v = viewFromDomain(x => x * x, 0, 2);
    expect(v.xmin).toBeLessThan(0);          // padded past a
    expect(v.xmax).toBeGreaterThan(2);       // padded past b
    expect(v.ymin).toBeLessThanOrEqual(0);   // includes 0
    expect(v.ymax).toBeGreaterThan(4);       // above the max (4) plus pad
  });
  it('falls back to a [-1,1] band when f is non-finite everywhere', () => {
    const v = viewFromDomain(() => NaN, 0, 2);
    expect(v.ymin).toBeLessThan(0);
    expect(v.ymax).toBeGreaterThan(0);
    expect(Number.isFinite(v.xmin) && Number.isFinite(v.xmax)).toBe(true);
  });
});

describe('numericDerivative', () => {
  it('matches known derivatives to a tight tolerance', () => {
    expect(numericDerivative(x => x * x)(3)).toBeCloseTo(6, 6);
    expect(numericDerivative(Math.sin)(0.7)).toBeCloseTo(Math.cos(0.7), 6);
  });
  it('returns NaN where f is undefined on one side', () => {
    expect(Number.isNaN(numericDerivative(Math.log)(0))).toBe(true);   // log(-eps) is NaN
  });
});

describe('wireCustomInput', () => {
  function setup(withDomain) {
    document.body.innerHTML =
      '<input id="e"><input id="a"><input id="b"><div id="m"></div>';
    const onSubmit = vi.fn();
    const api = wireCustomInput({
      exprEl: document.getElementById('e'),
      aEl: withDomain ? document.getElementById('a') : undefined,
      bEl: withDomain ? document.getElementById('b') : undefined,
      msgEl: document.getElementById('m'),
      onSubmit,
    });
    return { onSubmit, api, e: document.getElementById('e'), a: document.getElementById('a'), m: document.getElementById('m') };
  }
  it('submits the trimmed expression on input, with a/b when present', () => {
    const { onSubmit, e, a } = setup(true);
    a.value = '1';
    e.value = ' x^2 ';
    e.dispatchEvent(new Event('input'));
    expect(onSubmit).toHaveBeenCalledWith('x^2', '1', '');
  });
  it('does not submit an empty expression, and clears the message', () => {
    const { onSubmit, e, m } = setup(true);
    m.textContent = 'old';
    e.value = '   ';
    e.dispatchEvent(new Event('input'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(m.textContent).toBe('');
  });
  it('works without domain fields (a/b undefined)', () => {
    const { onSubmit, e } = setup(false);
    e.value = 'sin(x)';
    e.dispatchEvent(new Event('input'));
    expect(onSubmit).toHaveBeenCalledWith('sin(x)', undefined, undefined);
  });
  it('setFields writes .value and setMsg writes textContent', () => {
    const { api, e, m } = setup(true);
    api.setFields('cos(x)', 0, 3);
    expect(e.value).toBe('cos(x)');
    api.setMsg('nope');
    expect(m.textContent).toBe('nope');
  });
});
```

Ensure `vi` is imported at the top of the test file (`import { describe, it, expect, vi } from 'vitest';`).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/custom-fn.test.js`
Expected: FAIL (new exports missing).

- [ ] **Step 3: Implement the helpers**

Append to `engine/custom-fn.js`:

```js
/** A 2-D view rectangle bracketing f over [a,b]: samples for the y-range,
   pads x and y, and always includes y=0. Falls back to a [-1,1] band when f
   is non-finite everywhere. (Extracted from riemann-sums' inline customView.) */
export function viewFromDomain(f, a, b) {
  const N = 64; let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= N; i++) {
    const y = f(a + (b - a) * i / N);
    if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) { lo = -1; hi = 1; }
  const padX = (b - a) * 0.15 || 0.5, padY = (hi - lo) * 0.2 || 0.5;
  return { xmin: a - padX, xmax: b + padX, ymin: Math.min(0, lo) - padY, ymax: hi + padY };
}

/** Central-difference derivative of a numeric function. NaN-safe: if either
   sample is non-finite (a domain edge), returns NaN rather than a bogus slope. */
export function numericDerivative(f, eps = 1e-5) {
  return x => {
    const a = f(x + eps), b = f(x - eps);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
    return (a - b) / (2 * eps);
  };
}

/** Wire a custom-function input row: `input`+Enter on the expression field and
   `change` on the optional from/to number fields all call
   `onSubmit(src, a, b)` (empty src clears the message and does not submit).
   Returns setters the playground uses to reflect URL-loaded state back into the
   fields (.value — inert) and to show inline errors (textContent). */
export function wireCustomInput({ exprEl, aEl, bEl, msgEl, onSubmit }) {
  const setMsg = text => { if (msgEl) msgEl.textContent = text; };
  function submit() {
    const src = exprEl.value.trim();
    if (!src) { setMsg(''); return; }
    onSubmit(src, aEl ? aEl.value : undefined, bEl ? bEl.value : undefined);
  }
  exprEl.addEventListener('input', submit);
  exprEl.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  if (aEl) aEl.addEventListener('change', submit);
  if (bEl) bEl.addEventListener('change', submit);
  return {
    setMsg,
    setFields(src, a, b) {
      if (exprEl && exprEl.value.trim() !== src) exprEl.value = src;
      if (aEl && a !== undefined) aEl.value = String(a);
      if (bEl && b !== undefined) bEl.value = String(b);
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/custom-fn.test.js`
Expected: PASS.

- [ ] **Step 5: Backfill riemann-sums to the shared `viewFromDomain`**

In `playgrounds/riemann-sums/playground.js`:
- Add `viewFromDomain` to the existing custom-fn import: change `import { compileCustom } from '../../engine/custom-fn.js';` to `import { compileCustom, viewFromDomain } from '../../engine/custom-fn.js';`.
- Delete the local `function customView(f, a, b) { … }` (the ~9-line block).
- In `activateCustom`, change the entry's `view: customView(f, a, b)` to `view: viewFromDomain(f, a, b)`.

- [ ] **Step 6: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: all green (existing riemann unit + your new helper tests); build clean. The riemann E2E is not run here (Task 4 runs E2E), but the backfill is behavior-preserving — the extracted function is byte-identical logic.

```bash
git add engine/custom-fn.js engine/custom-fn.test.js playgrounds/riemann-sums/playground.js
git commit -m "feat: shared custom-fn helpers (viewFromDomain, numericDerivative, wireCustomInput)"
```

---

## Task 2: solids-of-revolution custom profile

**Files:**
- Modify: `playgrounds/solids-of-revolution/index.html`
- Modify: `playgrounds/solids-of-revolution/playground.js`

**Interfaces:**
- Consumes: `compileCustom`, `wireCustomInput` (`engine/custom-fn.js`); `syncedUrl`/`makeUrlSync` `managed` (already in `deep-link.js`).

**Reference:** mirrors the riemann-sums custom integration. solids uses a 3-D `Revolve3D` view (not a 2-D grapher), so the custom entry needs NO `view` field; `useRegion()` frames the solid. `volumeSum(region, axis, n)` and `methodReason(region, axis)` already work for a single-curve region with no `g`. Only `isExactAtAnyN`/`region.exact` must be skipped for custom.

- [ ] **Step 1: `index.html` — challenge id + custom input row**

- Add `id="challenge"` to the challenge card. Find the challenge container `<div class="challenge">` and change it to `<div class="challenge" id="challenge">`.
- Add a custom input row inside the panel, immediately after the region-pills section that holds `<div class="fbtns" id="fbtns"></div>` (after that section's closing `</div>`):

```html
      <div class="custom-row">
        <label class="custom-lab" for="customExpr">your f(x)</label>
        <input id="customExpr" class="custom-input" type="text" autocomplete="off" spellcheck="false"
               placeholder="e.g. sqrt(x)" aria-label="Custom profile f of x">
        <span class="custom-dom">from
          <input id="customA" class="custom-num" type="number" step="0.5" value="0" aria-label="Domain start">
          to
          <input id="customB" class="custom-num" type="number" step="0.5" value="2" aria-label="Domain end">
        </span>
        <div class="custom-msg" id="customMsg" role="status" aria-live="polite"></div>
      </div>
```

- Add page-local CSS to the page's own `<style>` block:

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

- [ ] **Step 2: `playground.js` — imports, URL schema, custom state + helpers**

- Add to imports: `import { compileCustom, wireCustomInput } from '../../engine/custom-fn.js';`
- Change `URL_SCHEMA` to: `const URL_SCHEMA = { region: 'string', axis: 'string', n: 'number', expr: 'string', a: 'number', b: 'number' };`
- Add, after the `regionButtons`/`axisButtons` definitions (before `render`):

```js
// --- custom profile (Phase 4) ------------------------------------------------
let customRegion = null;
let customActive = false;

const customPill = document.createElement('button');
customPill.type = 'button';
customPill.id = 'customPill';
customPill.className = 'fbtn custom-pill';
customPill.textContent = '◆ custom';
customPill.hidden = true;
customPill.addEventListener('click', () => { if (customRegion) selectCustom(); });
s('fbtns').appendChild(customPill);

function activateCustom(src, a, b) {
  a = Number(a); b = Number(b);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) { input.setMsg("'to' must be greater than 'from'."); return false; }
  const { f, error } = compileCustom(src);
  if (!f) { input.setMsg(error); return false; }
  input.setMsg('');
  input.setFields(src, a, b);
  customRegion = { id: 'custom', label: '◆ custom', tex: src, f, a, b, custom: true };
  customPill.hidden = false;
  selectCustom();
  return true;
}

function selectCustom() {
  state.region = customRegion;
  customActive = true;
  regionButtons.select(-1, { notify: false });
  customPill.classList.add('on');
  view.setRegion(customRegion, state.axis);   // frame the custom solid (like useRegion, minus exact-based badges)
  meter.reset();
  render();
  pushUrl();
}

function deactivateCustom() {
  customActive = false;
  customPill.classList.remove('on');
}

const input = wireCustomInput({
  exprEl: s('customExpr'), aEl: s('customA'), bEl: s('customB'), msgEl: s('customMsg'),
  onSubmit: activateCustom,
});
```

- Add `deactivateCustom();` as the FIRST line of the `regionButtons` `buttonGroup` callback, and of the `axisButtons` callback's region-affecting path — specifically: in `regionButtons`' callback body make the first line `deactivateCustom();`. (The axis buttons keep the current region; if custom is active, switching axis should keep custom — so do NOT deactivate there; instead, in the axis callback, if `customActive`, call `view.setRegion(customRegion, state.axis)` via `useRegion`-equivalent. Simplest: in the axis callback, after `state.axis = ax.id;`, replace `useRegion();` with `if (customActive) { view.setRegion(customRegion, state.axis); meter.reset(); } else { useRegion(); }`.)

- [ ] **Step 3: `render()` — custom branch (secure readout, hide challenge)**

At the very top of `render()` (after `const { region, axis, n } = state;` and the `view.clear(); view.renderAxis(); view.renderPieces(...); view.renderOutline(...);` block), branch for custom BEFORE any `region.exact`/`isExactAtAnyN` use. Replace the section from `const approx = volumeSum(...)` onward with:

```js
  const approx = volumeSum(region, axis, n);
  const [method, why] = methodReason(region, axis);
  s('n-lab').innerHTML = `${n}<small> ${method}${n === 1 ? '' : 's'}</small>`;
  s('approx-val').textContent = fmt(approx);
  s('method-val').textContent = method;
  s('method-why').textContent = why;

  if (region.custom) {
    s('exact-val').textContent = '—';
    s('note').textContent = '';
    const ro = s('readout');
    ro.innerHTML =
      `<span class="cx"></span>, revolved <b>${axis === 'y' ? 'about the y-axis' : 'about the x-axis'}</b>` +
      ` &nbsp;·&nbsp; ${n} ${method}${n === 1 ? '' : 's'} = <span class="pd">${fmt(approx)}</span>`;
    ro.querySelector('.cx').textContent = `y = ${region.tex}`;   // untrusted expr via textContent
    s('challenge').style.display = 'none';
    return;
  }

  s('challenge').style.display = '';
  const exact = region.exact[axis];
  const relErr = Math.abs(approx - exact) / Math.abs(exact);
  s('exact-val').textContent = fmt(exact);
  s('note').textContent = region.note;
  s('readout').innerHTML =
    `${region.tex}, revolved <b>${axis === 'y' ? 'about the y-axis' : 'about the x-axis'}</b>` +
    ` &nbsp;·&nbsp; ${n} ${method}${n === 1 ? '' : 's'} = <span class="pd">${fmt(approx)}</span>` +
    ` &nbsp;·&nbsp; exact = <b>${fmt(exact)}</b>`;

  if (isExactAtAnyN(region, axis, volumeSum)) {
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
```

- [ ] **Step 4: URL sync (managed) + applyState**

- Replace `urlState`/`pushUrl`:

```js
const urlState = () => customActive
  ? { region: 'custom', axis: state.axis, n: state.n, expr: customRegion.tex, a: customRegion.a, b: customRegion.b }
  : { region: state.region.id, axis: state.axis, n: state.n };
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

- Update the Copy-link handler's URL build to pass managed keys:

```js
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()), Object.keys(URL_SCHEMA))}`;
```

- In `applyState`, skip the built-in region lookup for `region: 'custom'` and apply `expr` last:

```js
function applyState(st) {
  if (st.region && st.region !== 'custom') {
    const r = REGIONS.find(x => x.id === st.region);
    if (r) { deactivateCustom(); state.region = r; regionButtons.select(REGIONS.indexOf(r), { notify: false }); }
  }
  if (st.axis) {
    const i = AXES.findIndex(a => a.id === st.axis);
    if (i >= 0) { state.axis = st.axis; axisButtons.select(i, { notify: false }); }
  }
  if (!customActive) useRegion();
  if (typeof st.n === 'number') { state.n = st.n; nSlider.set(st.n); }
  if (typeof st.expr === 'string' && st.expr) activateCustom(st.expr, st.a ?? 0, st.b ?? 2);
  render();
  pushUrl();
}
```

- [ ] **Step 5: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: existing unit suite green (this is DOM wiring, E2E covers it in Task 4); build clean. Grep your final `playground.js` to confirm the untrusted `region.tex`/expr never appears on an `innerHTML` line in the custom path (it must reach the DOM only via the `.cx` `textContent` and the input `.value`).

```bash
git add playgrounds/solids-of-revolution/index.html playgrounds/solids-of-revolution/playground.js
git commit -m "feat: custom profile on solids-of-revolution"
```

---

## Task 3: secant-tangent custom function (numeric derivative, challenge kept)

**Files:**
- Modify: `playgrounds/secant-tangent/index.html`
- Modify: `playgrounds/secant-tangent/playground.js`

**Interfaces:**
- Consumes: `compileCustom`, `numericDerivative`, `viewFromDomain`, `wireCustomInput` (`engine/custom-fn.js`).

**Reference:** the custom entry supplies `df = numericDerivative(f)`, so `render()`'s existing `fn.df(x0)` / `secantSlope` / `slopeError` / `meter.update` all work unchanged — the CHALLENGE STAYS. The readout is purely numeric (no `fn.tex`), so NO secure-readout change is needed; the expression lives only in the input `.value`. There is NO domain and NO challenge-hide here.

- [ ] **Step 1: `index.html` — custom input row (expression only)**

Add, inside the panel immediately after the function-pills section holding `<div class="fbtns" id="fbtns"></div>`:

```html
      <div class="custom-row">
        <label class="custom-lab" for="customExpr">your f(x)</label>
        <input id="customExpr" class="custom-input" type="text" autocomplete="off" spellcheck="false"
               placeholder="e.g. x^3 - sin(x)" aria-label="Custom function f of x">
        <div class="custom-msg" id="customMsg" role="status" aria-live="polite"></div>
      </div>
```

Add the same page-local CSS block as in Task 2 Step 1 (the `.custom-row`/`.custom-lab`/`.custom-input`/`.custom-msg`/`.custom-pill` rules; omit `.custom-dom`/`.custom-num` since there are no domain fields) to the page's own `<style>`.

- [ ] **Step 2: `playground.js` — imports, URL schema, custom state + helpers**

- Add to imports: `import { compileCustom, numericDerivative, viewFromDomain, wireCustomInput } from '../../engine/custom-fn.js';`
- Change `URL_SCHEMA` to: `const URL_SCHEMA = { fn: 'string', x0: 'number', h: 'number', expr: 'string' };`
- Add, after the `fnButtons` definition (before `render`):

```js
// --- custom function (Phase 4) -----------------------------------------------
let customFn = null;
let customActive = false;

const customPill = document.createElement('button');
customPill.type = 'button';
customPill.id = 'customPill';
customPill.className = 'fbtn custom-pill';
customPill.textContent = '◆ custom';
customPill.hidden = true;
customPill.addEventListener('click', () => { if (customFn) selectCustom(); });
s('fbtns').appendChild(customPill);

function activateCustom(src) {
  const { f, error } = compileCustom(src);
  if (!f) { input.setMsg(error); return false; }
  input.setMsg('');
  input.setFields(src);
  customFn = { id: 'custom', label: '◆ custom', tex: src, f, df: numericDerivative(f), probe: 0.8, view: viewFromDomain(f, -3, 3), custom: true };
  customPill.hidden = false;
  selectCustom();
  return true;
}

function selectCustom() {
  state.fn = customFn;
  state.x0 = customFn.probe;
  state.logH = LOG_H_MAX;
  hSlider.set(LOG_H_MAX);
  customActive = true;
  fnButtons.select(-1, { notify: false });
  customPill.classList.add('on');
  g.setView(customFn.view);
  meter.reset();
  render();
  pushUrl();
}

function deactivateCustom() {
  customActive = false;
  customPill.classList.remove('on');
}

const input = wireCustomInput({
  exprEl: s('customExpr'), msgEl: s('customMsg'), onSubmit: (src) => activateCustom(src),
});
```

- Add `deactivateCustom();` as the FIRST line of the `fnButtons` `buttonGroup` callback body.

- [ ] **Step 3: URL sync (managed) + applyState**

- Replace `urlState`/`pushUrl`:

```js
const urlState = () => customActive
  ? { fn: 'custom', x0: state.x0, h: h(), expr: customFn.tex }
  : { fn: state.fn.id, x0: state.x0, h: h() };
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

(Match the existing `urlState` shape for `x0`/`h` — if the existing code emits `h: h()` or `logH`, keep whatever it currently emits and just add `expr` + the `fn:'custom'` branch. Read the current `urlState` before editing and preserve its `x0`/`h` fields exactly.)

- Update the Copy-link handler's URL build to pass managed keys:

```js
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()), Object.keys(URL_SCHEMA))}`;
```

- In `applyState`, skip the built-in function lookup for `fn: 'custom'` and apply `expr` **before** the `x0`/`h` handling. This matters: `selectCustom` resets `state.x0` to the custom function's probe, so a shared `?expr=…&x0=…` link's `x0` must be applied AFTER `activateCustom` to win — matching the built-in path (where `st.x0` also follows the `fn` block). Preserve the existing `x0`/`h` lines exactly; only add the guard, the `expr` branch, and the reorder:

```js
function applyState(st) {
  if (st.fn && st.fn !== 'custom') {
    const fn = FUNCTIONS.find(f => f.id === st.fn);
    if (fn) { deactivateCustom(); state.fn = fn; fnButtons.select(FUNCTIONS.indexOf(fn), { notify: false }); g.setView(fn.view); state.x0 = fn.probe; }
  }
  if (typeof st.expr === 'string' && st.expr) activateCustom(st.expr);   // BEFORE x0/h so the URL's x0 wins over the probe
  // ... keep the existing x0 / h (logH) handling exactly as it is, AFTER the expr line ...
  meter.reset();
  render();
  pushUrl();
}
```

Read the current `applyState` body and splice the `fn !== 'custom'` guard into the existing `st.fn` block, then place the `st.expr` line BEFORE the existing `st.x0`/`st.h` lines; do not drop or rewrite those lines.

- [ ] **Step 4: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: existing unit suite green; build clean. Confirm by trace: loading `/playgrounds/secant-tangent/?expr=sin(x)&x0=0.7` selects the custom function, draws a tangent with slope `numericDerivative(sin)(0.7) ≈ cos(0.7)`, and the challenge meter is still present (not hidden).

```bash
git add playgrounds/secant-tangent/index.html playgrounds/secant-tangent/playground.js
git commit -m "feat: custom function on secant-tangent via numeric derivative"
```

---

## Task 4: End-to-end suite

**Files:**
- Create: `e2e/custom-rollout.spec.js`

- [ ] **Step 1: Write the spec**

```js
// e2e/custom-rollout.spec.js
import { test, expect } from '@playwright/test';

test('solids: a URL custom profile revolves and hides the challenge', async ({ page }) => {
  await page.goto('/playgrounds/solids-of-revolution/?expr=x&a=0&b=2&axis=x&n=8');
  await expect(page.locator('#readout .cx')).toHaveText('y = x');
  await expect(page.locator('#customPill')).toBeVisible();
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page.locator('#challenge')).toBeHidden();
});

test('solids: hostile input is rejected inline with no entry and no console error', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/playgrounds/solids-of-revolution/?expr=alert(1)');
  await expect(page.locator('#customMsg')).not.toHaveText('');
  await expect(page.locator('#customPill')).toBeHidden();
  await expect(page.locator('#challenge')).toBeVisible();
  expect(errors).toEqual([]);
});

test('secant-tangent: a URL custom function keeps the challenge and shows the numeric derivative', async ({ page }) => {
  await page.goto('/playgrounds/secant-tangent/?expr=sin(x)&x0=0.7');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // f'(0.7) = cos(0.7) ≈ 0.7648 — the tan-val readout reflects the numeric df
  await expect(page.locator('#tan-val')).toHaveText(/0\.76/);
  await expect(page.locator('#challenge')).toBeVisible();
});

test('secant-tangent: typing a custom function updates the URL', async ({ page }) => {
  await page.goto('/playgrounds/secant-tangent/');
  await page.fill('#customExpr', 'x^2');
  await page.locator('#customExpr').dispatchEvent('input');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page).toHaveURL(/expr=/);
});

test('Copy-link round-trips a solids custom profile through a fresh page', async ({ page, context }) => {
  await page.goto('/playgrounds/solids-of-revolution/?expr=sqrt(x)&a=0&b=4&axis=x&n=6');
  const url = page.url();
  expect(url).toContain('expr=');
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#readout .cx')).toHaveText('y = sqrt(x)');
  await expect(p2.locator('#customExpr')).toHaveValue('sqrt(x)');
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS (these 5 new specs plus all existing E2E — including the riemann custom specs, which must stay green after the `viewFromDomain` backfill). If the `#tan-val` regex or a selector doesn't match the real rendered text, adjust to the actual value (compute `cos(0.7)` etc.) — but keep every assertion meaningful (each must prove the custom function is really driving the playground).

- [ ] **Step 3: Commit**

```bash
git add e2e/custom-rollout.spec.js
git commit -m "test: end-to-end suite for custom expressions on solids + secant-tangent"
```

---

## Phase 4 close

- [ ] Full unit suite (`npm test`) and E2E (`npm run test:e2e`) green.
- [ ] `npm run build`; confirm clean.
- [ ] Merge `phase4-custom-rollout` → `main` (auto-deploys) **only on explicit user go-ahead**; spot-check a custom profile on solids and a custom curve on secant-tangent live.
- [ ] Future phases: two-variable custom `f(x,y)` on partial-derivatives / gradient (parser extension + numeric partials); custom content on the remaining playgrounds.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-26-custom-expressions-rollout-design.md`):
1. Shared helpers `viewFromDomain`/`numericDerivative`/`wireCustomInput` + tests → Task 1. ✓
2. riemann backfill to `viewFromDomain` → Task 1 Step 5. ✓
3. solids custom (URL + entry + pill + input + challenge-hide + secure readout) → Task 2. ✓
4. secant-tangent custom (URL + entry + numeric df + pill + input + challenge-keep) → Task 3. ✓
5. E2E for both (revolve/challenge-hidden, tangent/challenge-kept, hostile, copy-link) → Task 4. ✓
6. Security (expr only to parser/.value/textContent) → Task 2 `.cx` textContent + `wireCustomInput` `.value`/`setMsg`; secant has no expr in readout. ✓

**Placeholder scan:** every code step carries complete code. The two "read the current X before editing and preserve its fields" notes (secant `urlState`/`applyState`) are deliberate — secant's `x0`/`h` emission must be preserved verbatim, which the implementer must read rather than guess; the ADDED code (the `fn:'custom'` branch, the `expr` handling, the managed keys) is fully specified. ✓

**Type/name consistency:** `viewFromDomain(f,a,b)`, `numericDerivative(f,eps)`, `wireCustomInput({...}) -> {setFields,setMsg}` defined in Task 1, consumed in Tasks 2/3 and the riemann backfill. `compileCustom` reused. Custom entry ids `custom`, element ids `customExpr/customA/customB/customMsg/customPill/challenge`, and `managed: Object.keys(URL_SCHEMA)` consistent across Tasks 2/3/4. solids custom entry `{id,label,tex,f,a,b,custom}`; secant custom entry `{id,label,tex,f,df,probe,view,custom}`. ✓
