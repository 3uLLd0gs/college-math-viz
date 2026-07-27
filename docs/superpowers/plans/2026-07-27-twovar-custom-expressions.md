# Two-Variable Custom Expressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend custom expressions to `f(x,y)` on partial-derivatives (custom surface, challenge hidden) and gradient (custom field, challenge kept), via a one-line parser extension and two new shared helpers.

**Architecture:** `engine/expr.js` gains `y` as a variable. `engine/custom-fn.js` gains `compileCustom2(src) → {f(x,y), error}` and `numericPartials(f) → {fx, fy}`. Each playground builds a synthetic `{id:'custom', f, fx, fy, a, custom}` entry from an untrusted `?expr=` string, safely evaluated by the whitelist parser; both readouts are numeric so the expression only ever reaches the input `.value` and the URL.

**Tech Stack:** Vanilla JS ES modules, Vitest + happy-dom (unit), Playwright (E2E), Vite multi-page build. No runtime dependencies.

## Global Constraints

- **No `eval`/`Function` on any user string.** `engine/expr.js` (via `compileCustom2`) is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** Displayed via `textContent`, set via `<input>.value` only — never `innerHTML`. (Both target readouts are numeric; the expression reaches the DOM only as an input `.value`.)
- **No runtime network calls; no backend.**
- **Design system fixed.** Page-specific CSS in the page's own `<style>` (tokens only); `engine/chrome.css` untouched.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase5-twovar-custom` (stacked on `phase4-custom-rollout`). **Custom entry id:** `custom` (verbatim). **Extent:** `a = 3`.

---

## File Structure

- Modify `engine/expr.js` + `engine/expr.test.js` — add `y` variable.
- Modify `engine/custom-fn.js` + `engine/custom-fn.test.js` — `compileCustom2`, `numericPartials`.
- Modify `playgrounds/partial-derivatives/{playground.js,index.html}` — custom surface (challenge hidden).
- Modify `playgrounds/gradient/{playground.js,index.html}` — custom field (challenge kept).
- Create `e2e/twovar-custom.spec.js`.

---

## Task 1: parser `y` + `compileCustom2` + `numericPartials`

**Files:**
- Modify: `engine/expr.js`, `engine/expr.test.js`
- Modify: `engine/custom-fn.js`, `engine/custom-fn.test.js`

**Interfaces:**
- Produces: `compileCustom2(src) -> { f: (x,y)=>number, error }`; `numericPartials(f, eps=1e-5) -> { fx: (x,y)=>number, fy: (x,y)=>number }`. `engine/expr.js` `compile`/`evaluate` accept `{x, y}`.

- [ ] **Step 1: Write the failing tests**

Append to `engine/expr.test.js`:

```js
describe('two-variable support', () => {
  it('evaluates expressions in x and y', () => {
    expect(compile('x*y')({ x: 2, y: 3 })).toBe(6);
    expect(compile('y^2')({ x: 0, y: 3 })).toBe(9);
    expect(compile('x^2 + y^2')({ x: 1, y: 2 })).toBe(5);
  });
  it('throws when y is used but not supplied (single-variable safety)', () => {
    expect(() => compile('y')({ x: 1 })).toThrow(ExprError);
  });
});
```

Append to `engine/custom-fn.test.js` (add `compileCustom2, numericPartials` to the existing `./custom-fn.js` import):

```js
import { compileCustom2, numericPartials } from './custom-fn.js';

describe('compileCustom2', () => {
  it('compiles a two-variable expression', () => {
    const { f, error } = compileCustom2('x^2 + y^2');
    expect(error).toBe('');
    expect(f(1, 2)).toBe(5);
  });
  it('rejects hostile / unparseable input', () => {
    for (const bad of ['alert(1)', '__proto__', 'x.constructor']) {
      expect(compileCustom2(bad).f).toBeNull();
      expect(compileCustom2(bad).error).not.toBe('');
    }
  });
  it('rejects a function non-finite across the whole grid', () => {
    const { f, error } = compileCustom2('ln(-1 - x^2 - y^2)');
    expect(f).toBeNull();
    expect(error).not.toBe('');
  });
});

describe('numericPartials', () => {
  it('matches analytic partials for x^2 + y^2', () => {
    const { f } = compileCustom2('x^2 + y^2');
    const { fx, fy } = numericPartials(f);
    expect(fx(1, 2)).toBeCloseTo(2, 5);
    expect(fy(1, 2)).toBeCloseTo(4, 5);
  });
  it('matches analytic partials for sin(x)*cos(y)', () => {
    const { f } = compileCustom2('sin(x)*cos(y)');
    const { fx, fy } = numericPartials(f);
    expect(fx(0.5, 0.7)).toBeCloseTo(Math.cos(0.5) * Math.cos(0.7), 5);
    expect(fy(0.5, 0.7)).toBeCloseTo(-Math.sin(0.5) * Math.sin(0.7), 5);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/expr.test.js engine/custom-fn.test.js`
Expected: FAIL (`y` unknown; `compileCustom2`/`numericPartials` missing).

- [ ] **Step 3: Add `y` to `engine/expr.js`**

In `atom()`, immediately after the line `if (name === 'x') return { t: 'var', name: 'x' };`, add:

```js
      if (name === 'y') return { t: 'var', name: 'y' };
```

- [ ] **Step 4: Add the helpers to `engine/custom-fn.js`**

Append:

```js
// A 5×5 grid across [-2.5,2.5]² to sanity-check a two-variable function is a
// real number SOMEWHERE (catches "never real" without rejecting ordinary poles).
const GRID2 = [-2.5, -1.2, 0, 1.2, 2.5];

/** Compile an untrusted f(x,y) to a NaN-safe two-argument numeric function.
   Delegates all evaluation to engine/expr.js — never executes the string. */
export function compileCustom2(src) {
  let g;
  try {
    g = compile(src);
  } catch (e) {
    if (e instanceof ExprError) return { f: null, error: "Couldn't read that expression." };
    throw e;
  }
  const f = (x, y) => {
    try {
      const v = g({ x, y });
      return Number.isFinite(v) ? v : NaN;
    } catch {
      return NaN;
    }
  };
  let anyFinite = false;
  outer: for (const x of GRID2) for (const y of GRID2) {
    if (Number.isFinite(f(x, y))) { anyFinite = true; break outer; }
  }
  if (!anyFinite) return { f: null, error: "That function isn't a real number anywhere here." };
  return { f, error: '' };
}

/** Numeric partial derivatives of a two-variable function, via central
   differences. NaN-safe when a sample is non-finite. */
export function numericPartials(f, eps = 1e-5) {
  return {
    fx: (x, y) => {
      const a = f(x + eps, y), b = f(x - eps, y);
      return (Number.isFinite(a) && Number.isFinite(b)) ? (a - b) / (2 * eps) : NaN;
    },
    fy: (x, y) => {
      const a = f(x, y + eps), b = f(x, y - eps);
      return (Number.isFinite(a) && Number.isFinite(b)) ? (a - b) / (2 * eps) : NaN;
    },
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run engine/expr.test.js engine/custom-fn.test.js`
Expected: PASS.

- [ ] **Step 6: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: all green (the `y` addition is backward-safe — single-variable playgrounds reject a stray `y` at evaluation); build clean.

```bash
git add engine/expr.js engine/expr.test.js engine/custom-fn.js engine/custom-fn.test.js
git commit -m "feat: two-variable parser support, compileCustom2 and numericPartials"
```

---

## Task 2: partial-derivatives custom surface (challenge hidden)

**Files:**
- Modify: `playgrounds/partial-derivatives/index.html`
- Modify: `playgrounds/partial-derivatives/playground.js`

**Interfaces:**
- Consumes: `compileCustom2`, `numericPartials`, `wireCustomInput` (`engine/custom-fn.js`); `syncedUrl`/`makeUrlSync` `managed`.

**Reference:** the readout (`updatePanel`) is purely NUMERIC — the surface label/expression is shown nowhere in `playground.js`. So there is NO secure-readout change; the untrusted expression reaches the DOM only via the input `.value`. The custom surface entry has no `challenge`, so `updatePanel` must skip `meter.update` (which reads `sf.challenge.tol`) and hide `#challenge`.

- [ ] **Step 1: `index.html` — challenge id + custom input row**

- Add `id="challenge"` to the challenge card: change `<div class="challenge">` (around line 87) to `<div class="challenge" id="challenge">`.
- Add a custom input row inside the panel, immediately after the surface-pills section holding `<div class="fbtns" id="fbtns"></div>`:

```html
      <div class="custom-row">
        <label class="custom-lab" for="customExpr">your f(x, y)</label>
        <input id="customExpr" class="custom-input" type="text" autocomplete="off" spellcheck="false"
               placeholder="e.g. x^2 - y^2" aria-label="Custom function f of x and y">
        <div class="custom-msg" id="customMsg" role="status" aria-live="polite"></div>
      </div>
```

- Add page-local CSS to the page's own `<style>`:

```css
  .custom-row{margin-top:12px;display:flex;flex-direction:column;gap:8px}
  .custom-lab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .custom-input{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--ink);
    background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:9px 11px}
  .custom-input:focus{outline:2px solid var(--accent);outline-offset:2px}
  .custom-msg{font-size:11.5px;color:var(--error);min-height:15px;line-height:1.4}
  .custom-pill{border-style:dashed}
```

- [ ] **Step 2: `playground.js` — imports, URL schema, custom state + helpers**

- Add to imports: `import { compileCustom2, numericPartials, wireCustomInput } from '../../engine/custom-fn.js';`
- Change `URL_SCHEMA` to: `const URL_SCHEMA = { surf: 'string', axis: 'string', slice: 'number', probe: 'number', expr: 'string' };`
- Add, after the `surfButtons`/`sliceSlider`/`probeSlider` definitions (before `render`/`updatePanel`):

```js
// --- custom surface (Phase 5) ------------------------------------------------
let customSurf = null;
let customActive = false;

const customPill = document.createElement('button');
customPill.type = 'button';
customPill.id = 'customPill';
customPill.className = 'fbtn custom-pill';
customPill.textContent = '◆ custom';
customPill.hidden = true;
customPill.addEventListener('click', () => { if (customSurf) selectCustom(); });
s('fbtns').appendChild(customPill);

function activateCustom(src) {
  const { f, error } = compileCustom2(src);
  if (!f) { input.setMsg(error); return false; }
  input.setMsg('');
  input.setFields(src);
  customSurf = { id: 'custom', label: '◆ custom', src, f, ...numericPartials(f), a: 3, custom: true };
  customPill.hidden = false;
  selectCustom();
  return true;
}

function selectCustom() {
  state.surf = customSurf;
  state.slice = sliceStart(customSurf);
  state.probe = probeStart(customSurf);
  customActive = true;
  surfButtons.select(-1, { notify: false });
  customPill.classList.add('on');
  eng.setSurface(customSurf);
  setSliderRanges(customSurf);
  meter.reset();
  eng.schedule();
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

- Add `deactivateCustom();` as the FIRST line of the `pickSurface` function body (so choosing a built-in surface drops custom mode). `pickSurface` is the function the `surfButtons` callback calls.

- [ ] **Step 3: `updatePanel()` — hide the challenge for custom**

In `updatePanel(sf, x0, y0, m)`, after the `s('readout').innerHTML = …` line (which is numeric and safe for custom) and BEFORE `const ch = sf.challenge`, insert the custom branch, and guard the built-in path with the challenge show:

```js
  s('readout').innerHTML = 'at (' + fmt(x0) + ', ' + fmt(y0) + ') &nbsp;·&nbsp; f = <b>' + f0.toFixed(3) +
    '</b> &nbsp;·&nbsp; ' + sym + ' = <span class="pd">' + m.toFixed(3) + '</span>';
  if (sf.custom) { s('challenge').style.display = 'none'; return; }
  s('challenge').style.display = '';
  const ch = sf.challenge, av = Math.abs(m);
  meter.update({ /* …unchanged… */ });
```

- [ ] **Step 4: URL sync (managed) + applyState**

- Replace `urlState`/`pushUrl` (the custom entry stores the raw expression in its `src` field — set in Step 2 — which `urlState` emits as `?expr=`):

```js
const urlState = () => customActive
  ? { surf: 'custom', axis: state.axis, slice: state.slice, probe: state.probe, expr: customSurf.src }
  : { surf: state.surf.id, axis: state.axis, slice: state.slice, probe: state.probe };
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

- Update the Copy-link handler's URL build to pass managed keys:
```js
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()), Object.keys(URL_SCHEMA))}`;
```

- In `applyState`, skip the built-in surface lookup for `surf:'custom'` and apply `expr` BEFORE `slice`/`probe` (so a shared `?expr=…&slice=…&probe=…` link's slice/probe win over the custom defaults, matching the secant-tangent lesson):

```js
function applyState(st) {
  if (st.surf && st.surf !== 'custom') {
    const sf = SURFACES.find(x => x.id === st.surf);
    if (sf) {
      deactivateCustom();
      state.surf = sf;
      surfButtons.select(SURFACES.indexOf(sf), { notify: false });
      eng.setSurface(sf);
      setSliderRanges(sf);
      state.slice = sliceStart(sf); state.probe = probeStart(sf);
    }
  }
  if (typeof st.expr === 'string' && st.expr) activateCustom(st.expr);   // before slice/probe
  if (st.axis) setAxis(st.axis);
  if (typeof st.slice === 'number') { state.slice = st.slice; sliceSlider.set(st.slice); }
  if (typeof st.probe === 'number') { state.probe = st.probe; probeSlider.set(st.probe); }
  meter.reset();
  eng.schedule();
  pushUrl();
}
```

- Ensure the `input` const (and thus `s('customExpr')`) is declared before the on-load `readState`/`applyState` runs; the Step 2 block sits well above that, so this holds.

- [ ] **Step 5: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: existing suite green (no new unit tests — DOM wiring, covered by Task 4); build clean. Code-trace: `/playgrounds/partial-derivatives/?expr=x^2-y^2` builds the custom surface, `#customPill` on, `#challenge` hidden, and the untrusted expr reaches the DOM only via `#customExpr.value` (grep confirms no `innerHTML` interpolates `src`/`expr`).

```bash
git add playgrounds/partial-derivatives/index.html playgrounds/partial-derivatives/playground.js
git commit -m "feat: custom f(x,y) surface on partial-derivatives"
```

---

## Task 3: gradient custom field (challenge kept)

**Files:**
- Modify: `playgrounds/gradient/index.html`
- Modify: `playgrounds/gradient/playground.js`

**Interfaces:**
- Consumes: `compileCustom2`, `numericPartials`, `wireCustomInput`.

**Reference:** gradient's readout is purely NUMERIC (∇f components, |∇f|, Dᵤf) — the field expression is shown nowhere, so NO secure-readout change. The challenge STAYS: `grad`/`gradMag`/`steepestAngle`/`directional` all read `fd.fx`/`fd.fy`, so numeric partials keep it meaningful. The challenge `goal` interpolates `fd.hint`, so the custom entry MUST carry a static `hint` string. There is NO `id`/hide on the challenge card.

- [ ] **Step 1: `index.html` — custom input row**

Add, inside the panel immediately after the field-pills section holding `<div class="fbtns" id="fbtns"></div>`:

```html
      <div class="custom-row">
        <label class="custom-lab" for="customExpr">your f(x, y)</label>
        <input id="customExpr" class="custom-input" type="text" autocomplete="off" spellcheck="false"
               placeholder="e.g. x^2 + y^2" aria-label="Custom scalar field f of x and y">
        <div class="custom-msg" id="customMsg" role="status" aria-live="polite"></div>
      </div>
```

Add the same page-local `.custom-*` CSS block as in Task 2 Step 1 to the page's own `<style>`.

- [ ] **Step 2: `playground.js` — imports, URL schema, custom state + helpers**

- Add to imports: `import { compileCustom2, numericPartials, wireCustomInput } from '../../engine/custom-fn.js';`
- Change `URL_SCHEMA` to: `const URL_SCHEMA = { field: 'string', x: 'number', y: 'number', thetaDeg: 'number', expr: 'string' };`
- Add, after the `fieldButtons` definition (before `render`):

```js
// --- custom field (Phase 5) --------------------------------------------------
let customField = null;
let customActive = false;

const customPill = document.createElement('button');
customPill.type = 'button';
customPill.id = 'customPill';
customPill.className = 'fbtn custom-pill';
customPill.textContent = '◆ custom';
customPill.hidden = true;
customPill.addEventListener('click', () => { if (customField) selectCustom(); });
s('fbtns').appendChild(customPill);

function activateCustom(src) {
  const { f, error } = compileCustom2(src);
  if (!f) { input.setMsg(error); return false; }
  input.setMsg('');
  input.setFields(src);
  customField = {
    id: 'custom', label: '◆ custom', src, f, ...numericPartials(f), a: 3, custom: true,
    hint: 'point the arrow the way the field climbs fastest',
  };
  customPill.hidden = false;
  selectCustom();
  return true;
}

function selectCustom() {
  state.field = customField;
  customActive = true;
  fieldButtons.select(-1, { notify: false });
  customPill.classList.add('on');
  map.setField(customField);
  placeProbe(customField);
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

- Add `deactivateCustom();` as the FIRST line of the `fieldButtons` `buttonGroup` callback body.

- [ ] **Step 3: URL sync (managed) + applyState**

- Replace `urlState`/`pushUrl`:

```js
const urlState = () => customActive
  ? { field: 'custom', x: state.x, y: state.y, thetaDeg: (state.theta * 180 / Math.PI) % 360, expr: customField.src }
  : { field: state.field.id, x: state.x, y: state.y, thetaDeg: (state.theta * 180 / Math.PI) % 360 };
```

(Match the existing `urlState`'s exact `x`/`y`/`thetaDeg` expressions — READ the current `urlState` before editing and preserve them verbatim; only add the `expr` + `field:'custom'` branch.)

```js
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

- Update Copy-link:
```js
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()), Object.keys(URL_SCHEMA))}`;
```

- In `applyState`, skip the built-in field lookup for `field:'custom'` and apply `expr` BEFORE the `x`/`y`/theta handling (so a shared `?expr=…&x=…&y=…` link's probe wins over `placeProbe`'s default):

```js
function applyState(st) {
  if (st.field && st.field !== 'custom') {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) {
      deactivateCustom();
      state.field = fd;
      map.setField(fd);
      fieldButtons.select(FIELDS.indexOf(fd), { notify: false });
      placeProbe(fd);
    }
  }
  if (typeof st.expr === 'string' && st.expr) activateCustom(st.expr);   // before x/y/theta
  if (typeof st.x === 'number') state.x = st.x;
  if (typeof st.y === 'number') state.y = st.y;

  const best = steepestAngle(state.field, state.x, state.y);
  if (st.snap && best !== null) setTheta(best * 180 / Math.PI);
  else if (typeof st.thetaOffsetDeg === 'number' && best !== null) setTheta(best * 180 / Math.PI + st.thetaOffsetDeg);
  else if (typeof st.thetaDeg === 'number') setTheta(st.thetaDeg);

  meter.reset();
  render();
  pushUrl();
}
```

Preserve the existing `snap`/`thetaOffsetDeg`/`thetaDeg` block exactly as it is; only add the `field !== 'custom'` guard, the `deactivateCustom()` call, and the `expr` line.

- [ ] **Step 4: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: existing suite green; build clean. Code-trace: `/playgrounds/gradient/?expr=x^2+y^2` builds the custom field, `#customPill` on, the challenge STAYS visible, `fd.hint` is the static string (so the goal text is well-formed), and the untrusted expr reaches the DOM only via `#customExpr.value`.

```bash
git add playgrounds/gradient/index.html playgrounds/gradient/playground.js
git commit -m "feat: custom f(x,y) field on gradient, challenge kept via numeric gradient"
```

---

## Task 4: End-to-end suite

**Files:**
- Create: `e2e/twovar-custom.spec.js`

- [ ] **Step 1: Write the spec**

```js
// e2e/twovar-custom.spec.js
import { test, expect } from '@playwright/test';

test('partial-derivatives: a URL custom surface renders and hides the challenge', async ({ page }) => {
  await page.goto('/playgrounds/partial-derivatives/?expr=x^2-y^2');
  await expect(page.locator('#customPill')).toBeVisible();
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page.locator('#challenge')).toBeHidden();
  await expect(page.locator('#customExpr')).toHaveValue('x^2-y^2');
});

test('partial-derivatives: hostile input is rejected inline with no entry and no error', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/playgrounds/partial-derivatives/?expr=alert(1)');
  await expect(page.locator('#customMsg')).not.toHaveText('');
  await expect(page.locator('#customPill')).toBeHidden();
  await expect(page.locator('#challenge')).toBeVisible();
  expect(errors).toEqual([]);
});

test('gradient: a URL custom field renders and KEEPS the challenge', async ({ page }) => {
  await page.goto('/playgrounds/gradient/?expr=x^2+y^2');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page.locator('.challenge')).toBeVisible();   // secant-style: challenge stays
  await expect(page.locator('#customExpr')).toHaveValue('x^2+y^2');
});

test('gradient: typing a custom field updates the URL', async ({ page }) => {
  await page.goto('/playgrounds/gradient/');
  await page.fill('#customExpr', 'sin(x)*cos(y)');
  await page.locator('#customExpr').dispatchEvent('input');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page).toHaveURL(/expr=/);
});

test('partial-derivatives Copy-link round-trips a custom surface', async ({ page, context }) => {
  await page.goto('/playgrounds/partial-derivatives/?expr=x*y');
  await expect(page).toHaveURL(/expr=/);
  const url = page.url();
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#customExpr')).toHaveValue('x*y');
  await expect(p2.locator('#customPill')).toHaveClass(/on/);
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS — these 5 new specs plus all existing E2E (including the Phase 3/4 custom specs, which must stay green after the `expr.js` `y` addition and the shared-helper additions). If a selector doesn't match the real markup (e.g. gradient's challenge element), adjust to reality but keep the assertion meaningful (it must prove the custom function is really driving the playground and — for gradient — that the challenge is present).

- [ ] **Step 3: Commit**

```bash
git add e2e/twovar-custom.spec.js
git commit -m "test: end-to-end suite for two-variable custom expressions"
```

---

## Phase 5 close

- [ ] Full unit suite (`npm test`) and E2E (`npm run test:e2e`) green.
- [ ] `npm run build`; confirm clean.
- [ ] Merge decision is the user's (this stacks on the unmerged `phase4` branch — merging means merging Phase 4 + Phase 5 together, or `phase4` first then `phase5`). Do NOT merge without explicit user go-ahead.
- [ ] Future: vector-valued custom fields `F(x,y)=(P,Q)` on vector-fields / curl-divergence / greens-theorem (two expressions) — a separate phase.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-27-twovar-custom-expressions-design.md`):
1. `expr.js` `y` + backward-safety → Task 1 (Steps 3, tests). ✓
2. `compileCustom2` + `numericPartials` + tests → Task 1. ✓
3. partial-derivatives custom surface, challenge hidden → Task 2. ✓
4. gradient custom field, challenge kept (static `hint`) → Task 3. ✓
5. Security: both readouts numeric, expr only to `.value`/URL → Tasks 2/3 (no `.cx` needed; noted). ✓
6. E2E for both → Task 4. ✓

**Placeholder scan:** every code step carries complete code. The two "read the current `urlState`/`applyState` and preserve verbatim" notes (partial slice/probe, gradient x/y/theta+snap) are deliberate — those existing expressions must be preserved, and the ADDED code (guard, `expr` line, managed keys) is fully specified. ✓

**Type/name consistency:** `compileCustom2(src) -> {f,error}` and `numericPartials(f) -> {fx,fy}` defined in Task 1, consumed in Tasks 2/3. `wireCustomInput` (Phase 4) reused with no `aEl`/`bEl`. Custom entry stores `src` (the raw expression) and emits it as `?expr=`; entry shape `{id:'custom', label, src, f, fx, fy, a:3, custom:true}` (gradient adds `hint`). Element ids `customExpr/customMsg/customPill/challenge` (challenge on partial only). `managed: Object.keys(URL_SCHEMA)` on both writers in both playgrounds. ✓
