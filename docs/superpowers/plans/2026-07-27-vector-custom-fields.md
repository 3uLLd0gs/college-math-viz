# Vector-Valued Custom Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Custom `F(x,y)=(P,Q)` on vector-fields, curl-divergence, and greens-theorem — with numeric divergence/curl and a two-field input — completing the custom-expression arc.

**Architecture:** `engine/custom-fn.js` gains `vectorDiffOps(P,Q) → {div,curl}` (from `numericPartials`) and `wireCustomInput2` (two P/Q fields). Each playground builds a synthetic field `{id:'custom', P, Q, div, curl, custom}` from two untrusted `?exprP/?exprQ` strings, reuses its own `useField` to select it, and hides its challenge for custom. All three readouts are numeric, so the expressions only reach the input `.value`.

**Tech Stack:** Vanilla JS ES modules, Vitest + happy-dom (unit), Playwright (E2E), Vite multi-page build. No runtime dependencies.

## Global Constraints

- **No `eval`/`Function` on any user string.** `engine/expr.js` (via `compileCustom2`) is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** `P`/`Q` reach the DOM via `<input>.value` only — never `innerHTML`. (All three readouts are numeric.)
- **No runtime network calls; no backend.**
- **Design system fixed.** Page-specific CSS in the page's own `<style>` (tokens only); `engine/chrome.css` untouched.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase6-vector-custom` (off `main`). **Custom entry id:** `custom` (verbatim).

---

## File Structure

- Modify `engine/custom-fn.js` + `engine/custom-fn.test.js` — `vectorDiffOps`, `wireCustomInput2`.
- Modify `playgrounds/vector-fields/{playground.js,index.html}`.
- Modify `playgrounds/curl-divergence/{playground.js,index.html}`.
- Modify `playgrounds/greens-theorem/{playground.js,index.html}`.
- Create `e2e/vector-custom.spec.js`.

**Shared per-playground pattern (Tasks 2–4):** each playground already has `function useField(fd) { state.field = { ...fd, a: DOMAIN }; view.setField(state.field); … meter.reset(); }` and a `fieldButtons` callback that calls `useField(fd)`. Custom reuses `useField`.

---

## Task 1: `vectorDiffOps` + `wireCustomInput2`

**Files:**
- Modify: `engine/custom-fn.js`, `engine/custom-fn.test.js`

**Interfaces:**
- Consumes: `compileCustom2`, `numericPartials` (already in `engine/custom-fn.js`).
- Produces: `vectorDiffOps(P, Q, eps=1e-5) -> { div:(x,y)=>number, curl:(x,y)=>number }`; `wireCustomInput2({ pEl, qEl, msgEl, onSubmit }) -> { setFields(p,q), setMsg(text) }`.

- [ ] **Step 1: Write the failing tests**

Append to `engine/custom-fn.test.js` (add `vectorDiffOps, wireCustomInput2` to the existing `./custom-fn.js` import; `compileCustom2` and `vi` are already imported):

```js
describe('vectorDiffOps', () => {
  it('computes numeric divergence and curl (source field P=x, Q=y)', () => {
    const { f: P } = compileCustom2('x'), { f: Q } = compileCustom2('y');
    const { div, curl } = vectorDiffOps(P, Q);
    expect(div(1, 1)).toBeCloseTo(2, 5);
    expect(curl(1, 1)).toBeCloseTo(0, 5);
  });
  it('a vortex (P=-y, Q=x) has zero divergence and nonzero curl', () => {
    const { f: P } = compileCustom2('-y'), { f: Q } = compileCustom2('x');
    const { div, curl } = vectorDiffOps(P, Q);
    expect(div(1, 1)).toBeCloseTo(0, 5);
    expect(curl(1, 1)).toBeCloseTo(2, 5);
  });
});

describe('wireCustomInput2', () => {
  function setup() {
    document.body.innerHTML = '<input id="p"><input id="q"><div id="m"></div>';
    const onSubmit = vi.fn();
    const api = wireCustomInput2({
      pEl: document.getElementById('p'), qEl: document.getElementById('q'),
      msgEl: document.getElementById('m'), onSubmit,
    });
    return { onSubmit, api, p: document.getElementById('p'), q: document.getElementById('q'), m: document.getElementById('m') };
  }
  it('submits both trimmed values when both are non-empty', () => {
    const { onSubmit, p, q } = setup();
    p.value = ' -y '; q.value = ' x ';
    q.dispatchEvent(new Event('input'));
    expect(onSubmit).toHaveBeenCalledWith('-y', 'x');
  });
  it('does not submit when either field is empty, and clears the message', () => {
    const { onSubmit, p, q, m } = setup();
    m.textContent = 'old';
    p.value = 'x'; q.value = '';
    p.dispatchEvent(new Event('input'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(m.textContent).toBe('');
  });
  it('setFields writes both .value and setMsg writes textContent', () => {
    const { api, p, q, m } = setup();
    api.setFields('sin(y)', 'cos(x)');
    expect(p.value).toBe('sin(y)');
    expect(q.value).toBe('cos(x)');
    api.setMsg('nope');
    expect(m.textContent).toBe('nope');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/custom-fn.test.js`
Expected: FAIL (new exports missing).

- [ ] **Step 3: Implement**

Append to `engine/custom-fn.js`:

```js
/** Numeric divergence and curl of a 2-D vector field F=(P,Q), built from
   central-difference partials. NaN-safe (inherits numericPartials' guard). */
export function vectorDiffOps(P, Q, eps = 1e-5) {
  const { fx: Px, fy: Py } = numericPartials(P, eps);
  const { fx: Qx, fy: Qy } = numericPartials(Q, eps);
  return {
    div: (x, y) => Px(x, y) + Qy(x, y),
    curl: (x, y) => Qx(x, y) - Py(x, y),
  };
}

/** Two-field custom input (P and Q). Submits `onSubmit(pSrc, qSrc)` only when
   BOTH fields are non-empty; an empty field clears the message and does not
   submit. `setFields`/`setMsg` mirror wireCustomInput (both write inert `.value`
   / `textContent`). */
export function wireCustomInput2({ pEl, qEl, msgEl, onSubmit }) {
  const setMsg = text => { if (msgEl) msgEl.textContent = text; };
  function submit() {
    const p = pEl.value.trim(), q = qEl.value.trim();
    if (!p || !q) { setMsg(''); return; }
    onSubmit(p, q);
  }
  for (const el of [pEl, qEl]) {
    el.addEventListener('input', submit);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }
  return {
    setMsg,
    setFields(p, q) {
      if (pEl && pEl.value.trim() !== p) pEl.value = p;
      if (qEl && qEl.value.trim() !== q) qEl.value = q;
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/custom-fn.test.js`
Expected: PASS.

- [ ] **Step 5: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: all green; build clean.

```bash
git add engine/custom-fn.js engine/custom-fn.test.js
git commit -m "feat: vectorDiffOps (numeric div/curl) and wireCustomInput2 (two-field)"
```

---

## Tasks 2–4: per-playground integration (shared shape)

Tasks 2, 3, 4 are the same transformation on **vector-fields**, **curl-divergence**, **greens-theorem** respectively. Each is one commit. The shared shape is written out in full for each task (do not cross-reference).

Common facts for all three:
- Each has `function useField(fd) { state.field = { ...fd, a: DOMAIN }; view.setField(state.field); …; meter.reset(); }`.
- Each `render()` sets numeric readouts, then a `if (…) meter.update({…}) else meter.update({…})` challenge block.
- Each challenge card in `index.html` is `<div class="challenge">` with NO id.
- The custom entry is spread through `useField` (`{ ...fd, a: DOMAIN }`), which preserves `P`/`Q`/`div`/`curl`/`custom`/`blurb`/`note`.

---

## Task 2: vector-fields custom field

**Files:**
- Modify: `playgrounds/vector-fields/index.html`, `playgrounds/vector-fields/playground.js`

- [ ] **Step 1: `index.html` — challenge id + two-field input row**

- Change `<div class="challenge">` (line ~81) to `<div class="challenge" id="challenge">`.
- Add, immediately after the field-pills section holding `<div class="fbtns" id="fbtns"></div>`:

```html
      <div class="custom-row">
        <label class="custom-lab">your F(x, y)</label>
        <input id="customP" class="custom-input" type="text" autocomplete="off" spellcheck="false"
               placeholder="P(x, y)  e.g. -y" aria-label="Custom field component P">
        <input id="customQ" class="custom-input" type="text" autocomplete="off" spellcheck="false"
               placeholder="Q(x, y)  e.g. x" aria-label="Custom field component Q">
        <div class="custom-msg" id="customMsg" role="status" aria-live="polite"></div>
      </div>
```

- Add page-local CSS to the page's own `<style>`:

```css
  .custom-row{margin-top:12px;display:flex;flex-direction:column;gap:7px}
  .custom-lab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .custom-input{font-family:"JetBrains Mono",monospace;font-size:12.5px;color:var(--ink);
    background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:8px 11px}
  .custom-input:focus{outline:2px solid var(--accent);outline-offset:2px}
  .custom-msg{font-size:11.5px;color:var(--error);min-height:15px;line-height:1.4}
  .custom-pill{border-style:dashed}
```

- [ ] **Step 2: `playground.js` — imports, URL schema, custom state + helpers**

- Add to imports: `import { compileCustom2, vectorDiffOps, wireCustomInput2 } from '../../engine/custom-fn.js';`
- Change `URL_SCHEMA` to: `const URL_SCHEMA = { field: 'string', x: 'number', y: 'number', exprP: 'string', exprQ: 'string' };`
- Add, after the `useField`/`fieldButtons` definitions (before `render`):

```js
// --- custom field (Phase 6) --------------------------------------------------
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

function activateCustom(pSrc, qSrc) {
  const { f: P, error: eP } = compileCustom2(pSrc);
  const { f: Q, error: eQ } = compileCustom2(qSrc);
  if (!P || !Q) { input.setMsg(eP || eQ || "Couldn't read that field."); return false; }
  input.setMsg('');
  input.setFields(pSrc, qSrc);
  customField = {
    id: 'custom', label: '◆ custom', srcP: pSrc, srcQ: qSrc, P, Q, ...vectorDiffOps(P, Q),
    a: 3, custom: true, blurb: 'your own field — demonstration only', note: 'your own field — demonstration only',
  };
  customPill.hidden = false;
  selectCustom();
  return true;
}

function selectCustom() {
  useField(customField);              // spreads into state.field with a: DOMAIN, preserving P/Q/div/curl/custom
  customActive = true;
  fieldButtons.select(-1, { notify: false });
  customPill.classList.add('on');
  render();
  pushUrl();
}

function deactivateCustom() {
  customActive = false;
  customPill.classList.remove('on');
}

const input = wireCustomInput2({
  pEl: s('customP'), qEl: s('customQ'), msgEl: s('customMsg'), onSubmit: activateCustom,
});
```

- Add `deactivateCustom();` as the FIRST line of the `fieldButtons` `buttonGroup` callback body.

- [ ] **Step 3: `render()` — hide the challenge for custom**

In `render()`, the stray label line `s('blurb').textContent = fd.blurb;` shows the custom entry's static blurb (safe). Immediately after it, and BEFORE the `if (!fd.at) { meter.update… }` block, insert:

```js
  s('blurb').textContent = fd.blurb;
  if (fd.custom) { s('challenge').style.display = 'none'; return; }
  s('challenge').style.display = '';
  if (!fd.at) {
    meter.update({ /* …unchanged… */ });
  } else {
    meter.update({ /* …unchanged… */ });
  }
```

(`s('div-val')`, `s('curl-val')`, `s('kind-val') = classify(dv, cl)` above are all numeric and work for custom via the entry's numeric `div`/`curl` and the `divergenceAt`/`curlAt` engine helpers.)

- [ ] **Step 4: URL sync (managed) + applyState**

- Replace `urlState`/`pushUrl`:

```js
const urlState = () => customActive
  ? { field: 'custom', x: state.x, y: state.y, exprP: customField.srcP, exprQ: customField.srcQ }
  : { field: state.field.id, x: state.x, y: state.y };
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

- Update Copy-link:
```js
  const url = `${location.origin}${syncedUrl(stateToParams(urlState()), Object.keys(URL_SCHEMA))}`;
```

- In `applyState`, skip the built-in lookup for `field:'custom'` and apply `exprP`/`exprQ` BEFORE `x`/`y`:

```js
function applyState(st) {
  if (st.field && st.field !== 'custom') {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) { deactivateCustom(); useField(fd); fieldButtons.select(FIELDS.indexOf(fd), { notify: false }); }
  }
  if (typeof st.exprP === 'string' && st.exprP && typeof st.exprQ === 'string' && st.exprQ) activateCustom(st.exprP, st.exprQ);
  if (typeof st.x === 'number') state.x = st.x;
  if (typeof st.y === 'number') state.y = st.y;
  anim = null;
  render();
  pushUrl();
}
```

- Ensure the `input` const (and `s('customP')`/`s('customQ')`) is declared before the on-load `readState`/`applyState`; the Step 2 block sits well above that.

- [ ] **Step 5: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: existing suite green; build clean. Code-trace: `/playgrounds/vector-fields/?exprP=-y&exprQ=x` builds the custom vortex, `#customPill` on, `#challenge` hidden; grep confirms no `innerHTML` interpolates `srcP`/`srcQ`/`exprP`/`exprQ` (readout numeric; blurb/note are static strings on the entry).

```bash
git add playgrounds/vector-fields/index.html playgrounds/vector-fields/playground.js
git commit -m "feat: custom vector field F=(P,Q) on vector-fields"
```

---

## Task 3: curl-divergence custom field

**Files:**
- Modify: `playgrounds/curl-divergence/index.html`, `playgrounds/curl-divergence/playground.js`

- [ ] **Step 1: `index.html` — challenge id + two-field input row**

- Change `<div class="challenge">` (line ~88) to `<div class="challenge" id="challenge">`.
- Add the SAME two-field custom-row markup and `.custom-*` CSS as Task 2 Step 1 (placeholders `P(x, y)  e.g. x^2-y^2` and `Q(x, y)  e.g. 2*x*y`), after the `<div class="fbtns" id="fbtns"></div>` section.

- [ ] **Step 2: `playground.js` — imports, URL schema, custom state + helpers**

- Add to imports: `import { compileCustom2, vectorDiffOps, wireCustomInput2 } from '../../engine/custom-fn.js';`
- Change `URL_SCHEMA` to: `const URL_SCHEMA = { field: 'string', x: 'number', y: 'number', r: 'number', exprP: 'string', exprQ: 'string' };`
- Add the SAME custom-state block as Task 2 Step 2 (`customField`, `customActive`, `#customPill` appended to `#fbtns`, `activateCustom`, `selectCustom` (calls `useField(customField)`), `deactivateCustom`, and the `wireCustomInput2` wiring with `pEl: s('customP'), qEl: s('customQ'), msgEl: s('customMsg')`). The `activateCustom` custom-entry object is identical (includes `blurb`/`note` static strings).
- Add `deactivateCustom();` as the FIRST line of the `fieldButtons` callback body.

- [ ] **Step 3: `render()` — hide the challenge for custom**

`render()` sets `s('note').textContent = fd.note;` (the custom entry's static `note`, safe) then the numeric readout. Immediately BEFORE the `if (!canGoStill(fd)) { meter.update… }` block, insert:

```js
  if (fd.custom) { s('challenge').style.display = 'none'; return; }
  s('challenge').style.display = '';
  if (!canGoStill(fd)) {
    meter.update({ /* …unchanged… */ });
  } else {
    meter.update({ /* …unchanged… */ });
  }
```

(`readingsAt`/`div`/`curl`/`omega` above are numeric and work for custom via the entry's numeric `div`/`curl` and `P`/`Q`.)

- [ ] **Step 4: URL sync (managed) + applyState**

- Replace `urlState`/`pushUrl`:

```js
const urlState = () => customActive
  ? { field: 'custom', x: state.x, y: state.y, r: state.r, exprP: customField.srcP, exprQ: customField.srcQ }
  : { field: state.field.id, x: state.x, y: state.y, r: state.r };
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

- Update Copy-link to pass `Object.keys(URL_SCHEMA)` (same shape as Task 2 Step 4).
- In `applyState`, skip the built-in lookup for `field:'custom'`, apply `exprP`/`exprQ` BEFORE `x`/`y`/`r`, and keep the existing `seedRing()`:

```js
function applyState(st) {
  if (st.field && st.field !== 'custom') {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) { deactivateCustom(); useField(fd); fieldButtons.select(FIELDS.indexOf(fd), { notify: false }); }
  }
  if (typeof st.exprP === 'string' && st.exprP && typeof st.exprQ === 'string' && st.exprQ) activateCustom(st.exprP, st.exprQ);
  if (typeof st.x === 'number') state.x = st.x;
  if (typeof st.y === 'number') state.y = st.y;
  if (typeof st.r === 'number') { state.r = st.r; radius.set(st.r); }
  seedRing();
  render();
  pushUrl();
}
```

- [ ] **Step 5: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: green; build clean. Code-trace: `/playgrounds/curl-divergence/?exprP=x^2-y^2&exprQ=2*x*y` builds the custom field, `#customPill` on, `#challenge` hidden, div/curl readouts numeric; no `innerHTML` interpolates `srcP`/`srcQ`.

```bash
git add playgrounds/curl-divergence/index.html playgrounds/curl-divergence/playground.js
git commit -m "feat: custom vector field F=(P,Q) on curl-divergence"
```

---

## Task 4: greens-theorem custom field

**Files:**
- Modify: `playgrounds/greens-theorem/index.html`, `playgrounds/greens-theorem/playground.js`

- [ ] **Step 1: `index.html` — challenge id + two-field input row**

- Change `<div class="challenge">` (line ~79) to `<div class="challenge" id="challenge">`.
- Add the SAME two-field custom-row markup and `.custom-*` CSS as Task 2 Step 1 (placeholders `P(x, y)  e.g. -y` and `Q(x, y)  e.g. x*y`), after the `<div class="fbtns" id="fbtns"></div>` section.

- [ ] **Step 2: `playground.js` — imports, URL schema, custom state + helpers**

- Add to imports: `import { compileCustom2, vectorDiffOps, wireCustomInput2 } from '../../engine/custom-fn.js';`
- Change `URL_SCHEMA` to: `const URL_SCHEMA = { field: 'string', x: 'number', y: 'number', r: 'number', exprP: 'string', exprQ: 'string' };`
- Add the SAME custom-state block as Task 2 Step 2 (`customField`, `customActive`, `#customPill`, `activateCustom` with the identical entry object incl. static `blurb`/`note`, `selectCustom` calling `useField(customField)`, `deactivateCustom`, `wireCustomInput2` wiring).
- Add `deactivateCustom();` as the FIRST line of the `fieldButtons` callback body.

- [ ] **Step 3: `render()` — hide the challenge for custom**

`render()` sets `s('note').textContent = fd.note;` (custom static note) then the numeric readout (which includes `curlAt(fd, x, y)` — works via the entry's numeric `curl`). Immediately BEFORE the `if (!fd.zeroLine) { meter.update… }` block, insert:

```js
  if (fd.custom) { s('challenge').style.display = 'none'; return; }
  s('challenge').style.display = '';
  if (!fd.zeroLine) {
    meter.update({ /* …unchanged… */ });
  } else {
    meter.update({ /* …unchanged… */ });
  }
```

(`line = circulation(fd, …)` and `area = curlFlux(fd, …)` above are numeric and work for custom via `P`/`Q`/`curl`.)

- [ ] **Step 4: URL sync (managed) + applyState**

- Replace `urlState`/`pushUrl` (same shape as Task 3 Step 4, with `r`):

```js
const urlState = () => customActive
  ? { field: 'custom', x: state.x, y: state.y, r: state.r, exprP: customField.srcP, exprQ: customField.srcQ }
  : { field: state.field.id, x: state.x, y: state.y, r: state.r };
const pushUrl = makeUrlSync(() => stateToParams(urlState()), { managed: Object.keys(URL_SCHEMA) });
```

- Update Copy-link to pass `Object.keys(URL_SCHEMA)`.
- In `applyState`, skip the built-in lookup for `field:'custom'`, apply `exprP`/`exprQ` BEFORE `x`/`y`/`r`:

```js
function applyState(st) {
  if (st.field && st.field !== 'custom') {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) { deactivateCustom(); useField(fd); fieldButtons.select(FIELDS.indexOf(fd), { notify: false }); }
  }
  if (typeof st.exprP === 'string' && st.exprP && typeof st.exprQ === 'string' && st.exprQ) activateCustom(st.exprP, st.exprQ);
  if (typeof st.x === 'number') state.x = st.x;
  if (typeof st.y === 'number') state.y = st.y;
  if (typeof st.r === 'number') { state.r = st.r; radius.set(st.r); }
  render();
  pushUrl();
}
```

- [ ] **Step 5: Full suite + build; commit**

Run: `npm test && npm run build`
Expected: green; build clean. Code-trace: `/playgrounds/greens-theorem/?exprP=-y&exprQ=x*y` builds the custom field, `#customPill` on, `#challenge` hidden, ∮/∬ readouts numeric; no `innerHTML` interpolates `srcP`/`srcQ`.

```bash
git add playgrounds/greens-theorem/index.html playgrounds/greens-theorem/playground.js
git commit -m "feat: custom vector field F=(P,Q) on greens-theorem"
```

---

## Task 5: End-to-end suite

**Files:**
- Create: `e2e/vector-custom.spec.js`

- [ ] **Step 1: Write the spec**

```js
// e2e/vector-custom.spec.js
import { test, expect } from '@playwright/test';

const PAGES = [
  { slug: 'vector-fields',   p: '-y',      q: 'x' },
  { slug: 'curl-divergence', p: 'x^2-y^2', q: '2*x*y' },
  { slug: 'greens-theorem',  p: '-y',      q: 'x*y' },
];

for (const { slug, p, q } of PAGES) {
  test(`${slug}: a URL custom field renders and hides the challenge`, async ({ page }) => {
    await page.goto(`/playgrounds/${slug}/?exprP=${encodeURIComponent(p)}&exprQ=${encodeURIComponent(q)}`);
    await expect(page.locator('#customPill')).toBeVisible();
    await expect(page.locator('#customPill')).toHaveClass(/on/);
    await expect(page.locator('#challenge')).toBeHidden();
    await expect(page.locator('#customP')).toHaveValue(p);
    await expect(page.locator('#customQ')).toHaveValue(q);
  });

  test(`${slug}: a hostile P is rejected inline with no entry and no error`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`/playgrounds/${slug}/?exprP=${encodeURIComponent('alert(1)')}&exprQ=x`);
    await expect(page.locator('#customMsg')).not.toHaveText('');
    await expect(page.locator('#customPill')).toBeHidden();
    await expect(page.locator('#challenge')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('vector-fields: typing a custom field updates the URL', async ({ page }) => {
  await page.goto('/playgrounds/vector-fields/');
  await page.fill('#customP', '-y');
  await page.fill('#customQ', 'x');
  await page.locator('#customQ').dispatchEvent('input');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page).toHaveURL(/exprP=/);
});

test('curl-divergence Copy-link round-trips a custom field', async ({ page, context }) => {
  await page.goto('/playgrounds/curl-divergence/?exprP=' + encodeURIComponent('x^2-y^2') + '&exprQ=' + encodeURIComponent('2*x*y'));
  await expect(page).toHaveURL(/exprP=/);
  const url = page.url();
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#customP')).toHaveValue('x^2-y^2');
  await expect(p2.locator('#customQ')).toHaveValue('2*x*y');
  await expect(p2.locator('#customPill')).toHaveClass(/on/);
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS — the new specs plus all existing E2E (including the Phase 3/4/5 custom specs, which must stay green). If a selector doesn't match the real markup, adjust to reality but keep every assertion meaningful (each must prove the custom field really drives the playground, and that `#challenge` is hidden for custom).

- [ ] **Step 3: Commit**

```bash
git add e2e/vector-custom.spec.js
git commit -m "test: end-to-end suite for vector-valued custom fields"
```

---

## Phase 6 close

- [ ] Full unit suite (`npm test`) and E2E (`npm run test:e2e`) green.
- [ ] `npm run build`; confirm clean.
- [ ] Merge decision is the user's. This COMPLETES the custom-expression arc across all 8 expression-driven playgrounds.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-27-vector-custom-fields-design.md`):
1. `vectorDiffOps` + `wireCustomInput2` + tests → Task 1. ✓
2. vector-fields custom F, challenge hidden → Task 2. ✓
3. curl-divergence custom F, challenge hidden → Task 3. ✓
4. greens-theorem custom F, challenge hidden → Task 4. ✓
5. Security: readouts numeric, P/Q only to `.value`/URL → Tasks 2–4 (no innerHTML interpolates src; blurb/note are static strings). ✓
6. E2E all three → Task 5. ✓

**Placeholder scan:** every code step carries complete code; the `/* …unchanged… */` markers denote the pre-existing `meter.update` bodies that are NOT modified (the implementer leaves them as-is — the only change around them is the two inserted lines and the surrounding `if (fd.custom) return`). No `TODO`/`TBD`. ✓

**Type/name consistency:** `vectorDiffOps(P,Q) -> {div,curl}` and `wireCustomInput2({pEl,qEl,msgEl,onSubmit}) -> {setFields,setMsg}` defined in Task 1, consumed in Tasks 2–4. `compileCustom2` reused. Custom entry shape `{id:'custom', label, srcP, srcQ, P, Q, div, curl, a:3, custom:true, blurb, note}` identical across Tasks 2–4; `selectCustom` reuses each playground's `useField`. Element ids `customP/customQ/customMsg/customPill/challenge` consistent. `managed: Object.keys(URL_SCHEMA)` on both writers in all three. ✓
