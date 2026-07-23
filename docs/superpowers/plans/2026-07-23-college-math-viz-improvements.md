# College Math Viz — Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn eleven working playgrounds into a product that is linkable, accessible, self-checking, and usable in a lecture hall — then add the missing practice-problem half.

**Architecture:** Every playground already exposes an `onJump(state)` handler that takes a plain object like `{ fn: 'sin', N: 7, probe: 2 }` and drives the playground to it. That single seam is the foundation of this whole plan: extract it into a named `applyState(state)` and route the lesson jumps, URL parameters, and self-check answers through the same function. New capabilities are shared engine modules plus a mechanical roll-out to the eleven playgrounds; nothing here rewrites an engine renderer.

**Tech Stack:** Vanilla JS ES modules, Vite (multi-page static build), Vitest + happy-dom for unit tests, Playwright for the new end-to-end suite. No runtime dependencies inside playgrounds. localStorage for all persistence — no backend.

## Global Constraints

- **No runtime network calls inside a playground.** Everything self-contained; diagrams are inline SVG, math is Unicode in `<code>`. (Playwright is a dev/test dependency only, never shipped.)
- **No accounts, no server.** All progress and sharing rides on localStorage and the URL. (Source: the product has been deliberately backend-free since Phase 1.)
- **The design system is fixed.** Colours come from `engine/tokens.css` custom properties. New CSS lives in `engine/chrome.css` (shared) or a playground's own `<style>` (page-specific), never as a third pattern.
- **`chrome.css` is linked, not inlined.** Each `index.html` uses `<link rel="stylesheet" href="…/chrome.css">`, so shared CSS ships once. Do not reintroduce `@import` inside a `<style>` block.
- **TDD for every pure module.** The math/serialization layer is tested against known values before wiring. Canvas rendering is verified in a real browser (Playwright in Phase 1E, manual before that).
- **Frequent commits.** One commit per task minimum; the conventional-commit prefixes already in the history (`feat:`, `fix:`, `refactor:`, `perf:`, `content:`, `test:`). End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **The eleven playground slugs** (used verbatim throughout): `unit-circle`, `secant-tangent`, `related-rates`, `riemann-sums`, `taylor-series`, `solids-of-revolution`, `partial-derivatives`, `gradient`, `vector-fields`, `curl-divergence`, `greens-theorem`.

---

## Phasing and scope

This plan is fully phased per request. **Phase 1 is specified task-by-task and is ready to execute.** Phases 2 and 3 are genuinely separate subsystems (a problem-generation engine; product decisions about custom content), so they are given task-level outlines here and a **STOP gate**: each should get its own detailed plan and a brainstorming pass before execution, per the writing-plans scope rule. Do not begin Phase 2 without that.

- **Phase 1 — Linkable, accessible, self-checking, lecture-ready.** Shared `applyState` seam, URL deep-linking, keyboard + ARIA access, self-check questions, cross-concept links, an E2E suite, print + presenter modes, progress export/import. Ships working software on its own.
- **Phase 2 — T4 drill generator.** The randomized practice-problem engine the build map always called for. New subsystem.
- **Phase 3 — Extensibility.** Custom registry entries via URL (safe expression evaluator); the boundary of what is possible without a backend.

---

## File Structure (Phase 1)

**New engine modules**
- `engine/deep-link.js` — pure functions converting a state object to/from `URLSearchParams` under a per-playground type schema, plus a debounced `history.replaceState` sync. No DOM beyond `history`/`location`.
- `engine/deep-link.test.js` — unit tests (Vitest).
- `engine/keyboard.js` — `keyboardControl(el, opts)`: makes a canvas focusable and translates arrow / +/− / Home keys into state nudges via callbacks. Framework-free; testable with synthetic `KeyboardEvent`s.
- `engine/keyboard.test.js` — unit tests.

**Modified engine modules**
- `engine/lesson.js` — add a `check` step type (multiple-choice self-check that reveals an explanation and can drive the playground via the same `onJump`), and render optional prereq/next concept links in the lesson header.
- `engine/sequencer.js` — add optional `prereq` (slug) to catalogue entries; export `neighbours(slug)`.
- `engine/score-shell.js` — add `exportProgress()` / `importProgress(code)` for a copy-paste progress code.
- `engine/chrome.css` — add `@media print` rules, `.present` scale-up rules, keyboard-focus styles, self-check styles, lesson-link styles.

**Per-playground changes (all eleven)**
- `playgrounds/<slug>/playground.js` — extract the `onJump` body into `applyState(state)`; on load, read URL params and apply; wire `keyboardControl` to the canvas; sync the URL on user-initiated control changes; add a `URL_SCHEMA`.
- `playgrounds/<slug>/content.js` — add one `check` step to `LESSON`; add a `prereq` where the sequence has an obvious prerequisite.
- `playgrounds/<slug>/index.html` — add `tabindex`, `role="img"`, and `aria-label`/`aria-describedby` to the main canvas; add a "Copy link" and presenter control to the header.

**Landing page**
- `home.js` / `index.html` — progress export/import UI (a modal or inline panel).

**New E2E**
- `e2e/jumps.spec.js` — Playwright: for every playground, every lesson jump yields a distinct, non-error playground state.
- `e2e/deep-link.spec.js` — Playwright: a URL with params reproduces the state; a shared link round-trips.
- `playwright.config.js`, `package.json` devDependency + `test:e2e` script.

---

## PHASE 1

### Task 1: `engine/deep-link.js` + tests

**Files:**
- Create: `engine/deep-link.js`
- Test: `engine/deep-link.test.js`

**Interfaces:**
- Consumes: nothing (pure; touches `window.history`/`location` only in `syncUrl`).
- Produces:
  - `stateToParams(state) -> URLSearchParams` — booleans as `'1'`/`'0'`, numbers rounded to 4 dp, strings verbatim; skips `null`/`undefined`.
  - `paramsToState(params, schema) -> object` — coerces each key present in `schema` (`'number' | 'string' | 'boolean'`) to its type; drops unknown keys and non-finite numbers.
  - `readState(schema) -> object` — `paramsToState(new URLSearchParams(location.search), schema)`.
  - `makeUrlSync(toParams, {delay=180}) -> (state) => void` — debounced `history.replaceState` writer that keeps the address bar current without adding history entries.

- [ ] **Step 1: Write the failing tests**

```js
// engine/deep-link.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stateToParams, paramsToState, readState, makeUrlSync } from './deep-link.js';

describe('stateToParams', () => {
  it('encodes strings, numbers and booleans', () => {
    const p = stateToParams({ fn: 'sin', N: 7, snap: true, off: false });
    expect(p.get('fn')).toBe('sin');
    expect(p.get('N')).toBe('7');
    expect(p.get('snap')).toBe('1');
    expect(p.get('off')).toBe('0');
  });
  it('rounds noisy floats to 4 dp', () => {
    expect(stateToParams({ x: 0.123456789 }).get('x')).toBe('0.1235');
  });
  it('skips null and undefined', () => {
    const p = stateToParams({ a: null, b: undefined, c: 3 });
    expect(p.has('a')).toBe(false);
    expect(p.has('b')).toBe(false);
    expect(p.get('c')).toBe('3');
  });
});

describe('paramsToState', () => {
  const schema = { fn: 'string', N: 'number', snap: 'boolean' };
  it('coerces each key to its declared type', () => {
    const st = paramsToState(new URLSearchParams('fn=cos&N=5&snap=1'), schema);
    expect(st).toEqual({ fn: 'cos', N: 5, snap: true });
  });
  it('ignores keys not in the schema', () => {
    const st = paramsToState(new URLSearchParams('fn=cos&evil=9'), schema);
    expect(st).toEqual({ fn: 'cos' });
  });
  it('drops a number that will not parse', () => {
    const st = paramsToState(new URLSearchParams('N=notanumber'), schema);
    expect(st).toEqual({});
  });
  it('reads false from 0 and true from 1', () => {
    expect(paramsToState(new URLSearchParams('snap=0'), schema).snap).toBe(false);
    expect(paramsToState(new URLSearchParams('snap=1'), schema).snap).toBe(true);
  });
  it('is empty when nothing matches', () => {
    expect(paramsToState(new URLSearchParams(''), schema)).toEqual({});
  });
});

describe('readState', () => {
  it('reads from the current location', () => {
    const orig = window.location;
    delete window.location;
    window.location = { search: '?fn=sin&N=3' };
    expect(readState({ fn: 'string', N: 'number' })).toEqual({ fn: 'sin', N: 3 });
    window.location = orig;
  });
});

describe('makeUrlSync', () => {
  beforeEach(() => vi.useFakeTimers());
  it('debounces and writes the current state to the URL without a history entry', () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    const sync = makeUrlSync(st => stateToParams(st), { delay: 100 });
    sync({ N: 1 }); sync({ N: 2 }); sync({ N: 3 });
    expect(spy).not.toHaveBeenCalled();     // debounced
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);    // once, with the last state
    const url = spy.mock.calls[0][2];
    expect(url).toContain('N=3');
    spy.mockRestore();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --root . engine/deep-link.test.js`
Expected: FAIL — `engine/deep-link.js` does not exist.

- [ ] **Step 3: Write `engine/deep-link.js`**

```js
/* Turn a playground's plain state object into shareable URL parameters and back.
   The state shape is exactly what each playground's applyState() already accepts,
   so a link IS a lesson jump the professor gets to author. */

const round = n => {
  const r = Math.round(n * 1e4) / 1e4;
  return Object.is(r, -0) ? 0 : r;
};

export function stateToParams(state) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'boolean') p.set(k, v ? '1' : '0');
    else if (typeof v === 'number') p.set(k, String(round(v)));
    else p.set(k, String(v));
  }
  return p;
}

export function paramsToState(params, schema) {
  const st = {};
  for (const [key, type] of Object.entries(schema)) {
    if (!params.has(key)) continue;
    const raw = params.get(key);
    if (type === 'number') { const n = Number(raw); if (Number.isFinite(n)) st[key] = n; }
    else if (type === 'boolean') st[key] = raw === '1' || raw === 'true';
    else st[key] = raw;
  }
  return st;
}

export const readState = schema =>
  paramsToState(new URLSearchParams(window.location.search), schema);

export function makeUrlSync(toParams, { delay = 180 } = {}) {
  let timer = null;
  return state => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const qs = toParams(state).toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    }, delay);
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --root . engine/deep-link.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add engine/deep-link.js engine/deep-link.test.js
git commit -m "feat: deep-link engine — state <-> URL params under a type schema"
```

---

### Task 2: Deep-link the gradient playground (the reference implementation)

This is the fully-worked pattern. Task 3 rolls the identical shape to the other ten.

**Files:**
- Modify: `playgrounds/gradient/playground.js`
- Modify: `playgrounds/gradient/index.html` (add a "Copy link" button to the header actions)

**Interfaces:**
- Consumes: `readState`, `makeUrlSync`, `stateToParams` from `../../engine/deep-link.js`.
- Produces: a `URL_SCHEMA` constant and an `applyState(st)` function in the gradient wiring, both reused by Task 6 (self-checks) and Task 9 (E2E).

- [ ] **Step 1: Extract `applyState`, add the schema, and apply URL on load**

In `playgrounds/gradient/playground.js`, add the import near the top (after the existing engine imports):

```js
import { readState, makeUrlSync, stateToParams } from '../../engine/deep-link.js';
```

Add the schema next to the other top-level constants (e.g. below `const FLAT_EPS = 0.05;`):

```js
// The keys a shareable gradient link may carry, with their types.
const URL_SCHEMA = { field: 'string', x: 'number', y: 'number', thetaDeg: 'number' };
```

Replace the entire `mountLesson(LESSON, { slug: 'gradient', onJump: st => { … } });` block at the bottom with a named `applyState`, the lesson wired to it, a URL-on-load read, and a URL sync:

```js
/** Drive the playground to a described configuration. Shared by lesson jumps,
 *  shareable URLs, and self-checks — all of which speak the same state object. */
function applyState(st) {
  if (st.field) {
    const fd = FIELDS.find(f => f.id === st.field);
    if (fd) {
      state.field = fd;
      map.setField(fd);
      fieldButtons.select(FIELDS.indexOf(fd), { notify: false });
      placeProbe(fd);
    }
  }
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

/** A shareable snapshot of the current view (only the URL_SCHEMA keys). */
const urlState = () => ({
  field: state.field.id,
  x: state.x, y: state.y,
  thetaDeg: (state.theta * 180 / Math.PI) % 360,
});
const pushUrl = makeUrlSync(() => stateToParams(urlState()));   // ignores its arg; reads live state

mountLesson(LESSON, { slug: 'gradient', onJump: applyState });

// A link with parameters opens the playground in that exact configuration.
const linked = readState(URL_SCHEMA);
if (Object.keys(linked).length) applyState(linked);
```

- [ ] **Step 2: Keep the URL current as the student drags or turns the dial**

In the same file, the probe drag and the dial already call `render()`. Add `pushUrl()` after each user-initiated state change so the address bar stays copy-ready. In the drag handler `moveProbe`, add `pushUrl();` after `render();`. In the `dial` slider `onInput`, add `pushUrl();` after `render();`. (Do **not** call `pushUrl` from inside `render()` itself — the sweep inset and other pages animate, and syncing every frame would thrash `replaceState`.)

- [ ] **Step 3: Add a "Copy link" button**

In `playgrounds/gradient/index.html`, inside the `.panel` `.row` that holds Snap/Reset, add a third button:

```html
<button class="action" id="copylink">Copy link</button>
```

In `playgrounds/gradient/playground.js`, wire it (near the other `s('…').onclick` handlers):

```js
s('copylink').onclick = async () => {
  const url = `${location.origin}${location.pathname}?${stateToParams(urlState())}`;
  try { await navigator.clipboard.writeText(url); shell.toast('Link copied', 'Opens this exact view', '🔗'); }
  catch { shell.toast('Copy failed', url, '🔗'); }
};
```

- [ ] **Step 4: Verify in the browser**

Run: `npx vite --port 5173` (background), then in a browser open `http://localhost:5173/playgrounds/gradient/?field=saddle&x=0.9&y=-0.6&thetaDeg=45`.
Expected: opens on the saddle field with the probe at (0.9, −0.6) and the dial at 45°. Drag the probe; the URL's `x`/`y` update. Press "Copy link", paste into a new tab; the view reproduces.
Confirm the full test suite still passes: `npm test` → all green. Confirm `npm run build` succeeds.

- [ ] **Step 5: Commit**

```bash
git add playgrounds/gradient/playground.js playgrounds/gradient/index.html
git commit -m "feat: deep-linkable gradient playground via shared applyState seam"
```

---

### Task 3: Roll deep-linking to the other ten playgrounds

Mechanical repeat of Task 2's shape. Each playground already has a `mountLesson(LESSON, { slug, onJump: st => {…} })` block; the transformation is: rename the arrow into `function applyState(st)`, append `pushUrl();` to it, declare `URL_SCHEMA` and `urlState()`, wire `mountLesson` to `applyState`, read the URL on load, add `pushUrl()` to user-driven control callbacks, and add a Copy-link button. The `URL_SCHEMA` and `urlState()` differ per playground; both are derived directly from what that playground's `onJump` already reads and what its `state` holds.

**Files (each):** `playgrounds/<slug>/playground.js`, `playgrounds/<slug>/index.html`.

**Per-playground schema and snapshot** (these are the only per-file specifics; everything else is Task 2's pattern verbatim):

- `taylor-series` — `URL_SCHEMA = { fn:'string', N:'number', probe:'number' }`; `urlState = () => ({ fn: state.fn.id, N: state.N, probe: state.probe })`.
- `secant-tangent` — `{ fn:'string', x0:'number', h:'number' }`; `urlState = () => ({ fn: state.fn.id, x0: state.x0, h: Math.pow(10, state.logH) })`. (Note: apply must set `state.logH = Math.log10(st.h)` clamped to `[LOG_H_MIN, LOG_H_MAX]`, as the existing onJump does.)
- `related-rates` — `{ scenario:'string', s:'number', drive:'number' }`; `urlState = () => ({ scenario: state.sc.id, s: state.s, drive: state.drive })`.
- `riemann-sums` — `{ fn:'string', rule:'string', n:'number' }`; `urlState = () => ({ fn: state.fn.id, rule: state.rule.id, n: state.n })`.
- `solids-of-revolution` — `{ region:'string', axis:'string', n:'number' }`; `urlState = () => ({ region: state.region.id, axis: state.axis, n: state.n })`.
- `partial-derivatives` — `{ surf:'string', axis:'string', slice:'number', probe:'number' }`; `urlState = () => ({ surf: state.surf.id, axis: state.axis, slice: state.slice, probe: state.probe })`.
- `unit-circle` — `{ trace:'string', deg:'number' }`; `urlState = () => ({ trace: state.trace.id, deg: state.theta * 180 / Math.PI })`. (Its jump state uses `deg`; the applyState already converts to radians.)
- `vector-fields` — `{ field:'string', x:'number', y:'number' }`; `urlState = () => ({ field: state.field.id, x: state.x, y: state.y })`.
- `curl-divergence` — `{ field:'string', x:'number', y:'number', r:'number' }`; `urlState = () => ({ field: state.field.id, x: state.x, y: state.y, r: state.r })`.
- `greens-theorem` — `{ field:'string', x:'number', y:'number', r:'number' }`; `urlState = () => ({ field: state.field.id, x: state.x, y: state.y, r: state.r })`.

- [ ] **Step 0: Backfill gradient**

Add `pushUrl();` to gradient's `snap` and `reset` click handlers (`playgrounds/gradient/playground.js`), so all eleven follow the same "every user handler syncs the URL" rule. Commit alone or fold into the Task-3 commit.

- [ ] **Step 1: Apply the Task-2 transformation to each of the ten files**

For each slug: import the three helpers, add its `URL_SCHEMA` and `urlState()`, convert `onJump` arrow to `function applyState(st)` ending in `pushUrl()`, add `const pushUrl = makeUrlSync(() => stateToParams(urlState()));   // ignores its arg; reads live state`, wire `mountLesson(LESSON, { slug, onJump: applyState })`, add the on-load `readState(URL_SCHEMA)` apply, append `pushUrl()` to each user-initiated control callback (button `onSelect`, slider `onInput`, canvas drag), and add the Copy-link button to a header/panel `.row` with the identical handler from Task 2 Step 3 (swap `urlState`).

- [ ] **Step 2: Run the unit suite**

Run: `npm test`
Expected: PASS (no unit tests touch this wiring; this confirms nothing regressed in the shared modules).

- [ ] **Step 3: Build and spot-check three pages in the browser**

Run: `npm run build`, then serve `dist` and open, for example:
- `/playgrounds/riemann-sums/?fn=sin&rule=mid&n=30`
- `/playgrounds/solids-of-revolution/?region=band&axis=y&n=14`
- `/playgrounds/unit-circle/?trace=cos&deg=120`
Expected: each opens in the specified configuration; Copy-link round-trips.

- [ ] **Step 4: Commit**

```bash
git add playgrounds/*/playground.js playgrounds/*/index.html
git commit -m "feat: deep-linking across all eleven playgrounds"
```

---

### Task 4: `engine/keyboard.js` — keyboard control for canvases + tests

**Files:**
- Create: `engine/keyboard.js`
- Test: `engine/keyboard.test.js`

**Interfaces:**
- Consumes: nothing (attaches listeners to a passed element).
- Produces: `keyboardControl(el, handlers)` where `handlers` is `{ nudge(dx, dy, big), step(delta, big), home() }`, all optional. Arrow keys call `nudge(±1, 0)` / `nudge(0, ±1)`; `+`/`-` (and `]`/`[`) call `step(±1)`; `Home` calls `home()`; holding Shift sets `big = true` for a coarse move. It sets `tabindex="0"` and `role`/`aria` are the caller's job in the HTML. Returns `{ destroy() }`.

- [ ] **Step 1: Write the failing tests**

```js
// engine/keyboard.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { keyboardControl } from './keyboard.js';

const key = (el, k, shift = false) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey: shift, bubbles: true, cancelable: true }));

let el;
beforeEach(() => { el = document.createElement('canvas'); document.body.appendChild(el); });

describe('keyboardControl', () => {
  it('makes the element focusable', () => {
    keyboardControl(el, {});
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('arrow keys nudge in the four directions', () => {
    const nudge = vi.fn();
    keyboardControl(el, { nudge });
    key(el, 'ArrowRight'); key(el, 'ArrowLeft'); key(el, 'ArrowUp'); key(el, 'ArrowDown');
    expect(nudge.mock.calls.map(c => [c[0], c[1]])).toEqual([[1, 0], [-1, 0], [0, 1], [0, -1]]);
  });

  it('Shift makes a coarse nudge', () => {
    const nudge = vi.fn();
    keyboardControl(el, { nudge });
    key(el, 'ArrowRight', true);
    expect(nudge).toHaveBeenCalledWith(1, 0, true);
  });

  it('plus and minus step a scalar', () => {
    const step = vi.fn();
    keyboardControl(el, { step });
    key(el, '+'); key(el, '-'); key(el, ']'); key(el, '[');
    expect(step.mock.calls.map(c => c[0])).toEqual([1, -1, 1, -1]);
  });

  it('Home resets', () => {
    const home = vi.fn();
    keyboardControl(el, { home });
    key(el, 'Home');
    expect(home).toHaveBeenCalledOnce();
  });

  it('ignores keys it does not handle and does not prevent their default', () => {
    keyboardControl(el, { nudge: vi.fn() });
    const e = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('prevents default on keys it does handle, so the page does not scroll', () => {
    keyboardControl(el, { nudge: vi.fn() });
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('destroy() removes the listener', () => {
    const nudge = vi.fn();
    const { destroy } = keyboardControl(el, { nudge });
    destroy();
    key(el, 'ArrowRight');
    expect(nudge).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --root . engine/keyboard.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `engine/keyboard.js`**

```js
/* Keyboard control for a canvas whose whole interaction is otherwise pointer-only.
   Arrow keys nudge a 2-D probe, +/- step a scalar, Home resets. The canvas becomes
   focusable; the caller supplies role/aria in the HTML and does the actual moving
   in the callbacks. */
export function keyboardControl(el, handlers = {}) {
  el.setAttribute('tabindex', '0');
  const { nudge, step, home } = handlers;

  const onKey = e => {
    const big = e.shiftKey;
    let handled = true;
    switch (e.key) {
      case 'ArrowRight': nudge && nudge(1, 0, big); break;
      case 'ArrowLeft':  nudge && nudge(-1, 0, big); break;
      case 'ArrowUp':    nudge && nudge(0, 1, big); break;
      case 'ArrowDown':  nudge && nudge(0, -1, big); break;
      case '+': case '=': case ']': step && step(1, big); break;
      case '-': case '_': case '[': step && step(-1, big); break;
      case 'Home': home && home(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  };

  el.addEventListener('keydown', onKey);
  return { destroy() { el.removeEventListener('keydown', onKey); } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --root . engine/keyboard.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/keyboard.js engine/keyboard.test.js
git commit -m "feat: keyboard control helper for canvas probes"
```

---

### Task 5: Keyboard access + canvas ARIA across all playgrounds

**Files:**
- Modify each `playgrounds/<slug>/index.html` — the main interactive canvas gets `tabindex="0"`, `role="img"`, an `aria-label`, and `aria-describedby="readout"` (the live readout already summarises the state in words).
- Modify each `playgrounds/<slug>/playground.js` — call `keyboardControl` on the canvas with nudge/step/home mapped to that playground's controls; make the live readout an ARIA live region so a screen reader announces the new value after a key press.

**Interfaces:**
- Consumes: `keyboardControl` from `../../engine/keyboard.js`; each playground's existing state setters (`moveProbe`, slider `.set`, drag clamps).

- [ ] **Step 1: Reference wiring on gradient**

In `playgrounds/gradient/index.html`, change the map canvas and readout:

```html
<canvas id="map" role="img" aria-label="Contour map. Use arrow keys to move the probe, plus and minus to turn the direction dial." aria-describedby="readout"></canvas>
...
<div class="readout" id="readout" role="status" aria-live="polite"></div>
```

In `playgrounds/gradient/playground.js`, after the pointer handlers, add:

```js
import { keyboardControl } from '../../engine/keyboard.js';
// ...
keyboardControl(cv, {
  nudge: (dx, dy, big) => {
    const d = (big ? 0.2 : 0.05) * state.field.a;
    state.x = Math.max(-state.field.a, Math.min(state.field.a, state.x + dx * d));
    state.y = Math.max(-state.field.a, Math.min(state.field.a, state.y + dy * d));
    render(); pushUrl();
  },
  step: (delta, big) => { setTheta((state.theta * 180 / Math.PI) + delta * (big ? 15 : 3)); render(); pushUrl(); },
  home: () => { placeProbe(state.field); setTheta(0); render(); pushUrl(); },
});
```

- [ ] **Step 2: Verify with the keyboard in a browser**

Run the dev server, open the gradient page, click the map (or Tab to it — a visible focus ring should appear, added in Task 10's CSS; until then focus is functional if not styled), press arrow keys and +/-.
Expected: the probe moves, the dial turns, the readout text updates, and a screen reader (VoiceOver: Cmd-F5) announces the readout after each press. The page does not scroll on arrow keys while the canvas is focused.

- [ ] **Step 3: Roll to the other ten**

Apply the same three edits to each. The mapping per playground:
- `taylor-series`, `secant-tangent`, `riemann-sums`, `solids-of-revolution` — 2-D graph; `nudge(dx,0)` moves the probe / point along x (`step` moves the N / n / h slider). No y.
- `unit-circle` — `nudge(dx,0)` and `step` both turn the angle; either is fine, map both to angle.
- `related-rates` — `nudge(dx,0)` / `step` move the state slider `s`.
- `partial-derivatives` — `nudge(dx,0)` moves the probe, `nudge(0,dy)` moves the slice; `step` is unused.
- `vector-fields`, `curl-divergence`, `greens-theorem` — `nudge(dx,dy)` moves the probe/loop; `step` moves the radius where one exists.
Each canvas gets a `role="img"` + `aria-label` describing its keys, and `aria-describedby="readout"` with the readout as `role="status" aria-live="polite"`.

- [ ] **Step 4: Full suite + build**

Run: `npm test` then `npm run build`. Expected: green; build clean.

- [ ] **Step 5: Commit**

```bash
git add playgrounds/*/index.html playgrounds/*/playground.js
git commit -m "feat: keyboard control and ARIA for every playground canvas"
```

---

### Task 6: Self-check questions — extend `lesson.js`

**Files:**
- Modify: `engine/lesson.js`
- Modify: `engine/lesson.test.js`

**Interfaces:**
- A new step shape: `{ level, check: { q, options: [{ text, correct?, why }], state? } }`. `options` has one `correct: true`. Picking an option reveals `why` for that option, marks right/wrong, and — if the step carries a `state` — offers a "See it" button that calls `onJump(state)` (the same seam). No score is awarded (these are formative, not graded).
- `mountLesson` renders a `check` step differently from a prose step but in the same steps list.

- [ ] **Step 1: Write failing tests**

Add to `engine/lesson.test.js`:

```js
const WITH_CHECK = {
  title: 'T', intro: 'i',
  steps: [
    { level: 'use', title: 'prose', body: 'b' },
    { level: 'use', check: {
      q: 'What is the steepest slope?',
      options: [
        { text: '|∇f|', correct: true, why: 'Yes — cosine peaks at zero angle.' },
        { text: 'zero', why: 'That is along a contour.' },
      ],
      state: { field: 'bowl' },
    } },
  ],
};

describe('self-check steps', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="wrap"><div class="studio"><div class="graph-card"></div></div></div>';
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders the question and its options', () => {
    const l = mountLesson(WITH_CHECK, { slug: 'd' });
    l.el.querySelector('.lesson-toggle').click();
    [...l.el.querySelectorAll('.lesson-levels .tbtn')].find(t => t.textContent === 'Using it').click();
    expect(l.el.querySelector('.lesson-check-q').textContent).toContain('steepest');
    expect(l.el.querySelectorAll('.lesson-opt')).toHaveLength(2);
  });

  it('marks the chosen option right or wrong and shows its explanation', () => {
    const l = mountLesson(WITH_CHECK, { slug: 'd' });
    l.el.querySelector('.lesson-toggle').click();
    [...l.el.querySelectorAll('.lesson-levels .tbtn')].find(t => t.textContent === 'Using it').click();
    const opts = [...l.el.querySelectorAll('.lesson-opt')];
    opts[1].click();
    expect(opts[1].classList.contains('wrong')).toBe(true);
    expect(l.el.querySelector('.lesson-why').textContent).toContain('along a contour');
    opts[0].click();
    expect(opts[0].classList.contains('right')).toBe(true);
  });

  it('offers a See-it button that drives the playground', () => {
    const onJump = vi.fn();
    const l = mountLesson(WITH_CHECK, { slug: 'd', onJump });
    l.el.querySelector('.lesson-toggle').click();
    [...l.el.querySelectorAll('.lesson-levels .tbtn')].find(t => t.textContent === 'Using it').click();
    l.el.querySelector('.lesson-opt').click();          // answer first
    l.el.querySelector('.lesson-seeit').click();
    expect(onJump).toHaveBeenCalledWith({ field: 'bowl' }, expect.anything());
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run --root . engine/lesson.test.js`
Expected: the new `describe` fails (`.lesson-check-q` not found).

- [ ] **Step 3: Implement the `check` branch in `renderSteps`**

In `engine/lesson.js`, inside `renderSteps`, change the `.map` so a step with `check` renders a question block instead of prose. Replace the article template with a conditional:

```js
stepsEl.innerHTML = steps.map((s, i) => s.check ? checkHtml(s, i) : proseHtml(s, i)).join('');
```

Add the two builders and wire their events (full code):

```js
function proseHtml(s, i) {
  return `
    <article class="lesson-step${s.figure ? ' has-fig' : ''}">
      <div class="lesson-step-n">${i + 1}</div>
      <div class="lesson-step-main">
        <h3>${s.title}</h3>
        <div class="lesson-step-cols">
          <div>
            <div class="lesson-step-body">${s.body}</div>
            ${s.state ? `<button class="action lesson-jump" type="button" data-i="${i}">${s.jump ?? 'Show me on the graph'} →</button>` : ''}
          </div>
          ${s.figure ? `<figure class="lesson-fig">${s.figure}</figure>` : ''}
        </div>
      </div>
    </article>`;
}

function checkHtml(s, i) {
  const c = s.check;
  return `
    <article class="lesson-step lesson-check" data-i="${i}">
      <div class="lesson-step-n">?</div>
      <div class="lesson-step-main">
        <div class="lesson-check-q">${c.q}</div>
        <div class="lesson-opts">
          ${c.options.map((o, k) => `<button class="lesson-opt" type="button" data-k="${k}">${o.text}</button>`).join('')}
        </div>
        <div class="lesson-why" hidden></div>
        ${c.state ? `<button class="action lesson-seeit" type="button" hidden>See it on the graph →</button>` : ''}
      </div>
    </article>`;
}
```

Then, after setting `stepsEl.innerHTML`, replace the existing `.lesson-jump` wiring with wiring for both jumps and checks:

```js
stepsEl.querySelectorAll('.lesson-jump').forEach(btn => {
  btn.addEventListener('click', () => {
    const step = steps[+btn.dataset.i];
    if (step?.state && opts.onJump) opts.onJump(step.state, step);
    toGraph();
  });
});

stepsEl.querySelectorAll('.lesson-check').forEach(art => {
  const step = steps[+art.dataset.i], c = step.check;
  const why = art.querySelector('.lesson-why');
  const seeit = art.querySelector('.lesson-seeit');
  art.querySelectorAll('.lesson-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const o = c.options[+opt.dataset.k];
      art.querySelectorAll('.lesson-opt').forEach(b => b.classList.remove('right', 'wrong'));
      opt.classList.add(o.correct ? 'right' : 'wrong');
      why.innerHTML = o.why ?? '';
      why.hidden = false;
      if (seeit) seeit.hidden = false;
    });
  });
  if (seeit) seeit.addEventListener('click', () => {
    if (opts.onJump) opts.onJump(c.state, step);
    toGraph();
  });
});
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --root . engine/lesson.test.js`
Expected: PASS (existing lesson tests + the three new ones).

- [ ] **Step 5: Commit**

```bash
git add engine/lesson.js engine/lesson.test.js
git commit -m "feat: self-check questions in the lesson panel"
```

---

### Task 7: Author one self-check per playground

**Files:** each `playgrounds/<slug>/content.js` — add a single `check` step to the `LESSON.steps` array, at the `use` level, after the last "using it" prose step. Each `state` reuses an id already valid in that playground (verified the same way the jump ids were: the id must exist in the registry).

**Interfaces:** consumes the `check` shape from Task 6; consumes `applyState` indirectly via the lesson's `onJump`.

- [ ] **Step 1: Write the eleven checks**

One example, fully written (gradient); the others follow the same shape with concept-appropriate questions and a `state` whose ids exist in that playground's registry:

```js
{ level: 'use', check: {
  q: 'You stand on the bowl and turn the dial 90° away from the gradient. What is the directional derivative?',
  options: [
    { text: 'Zero — you are walking along a contour', correct: true,
      why: 'Right. Dᵤf = |∇f|·cos θ, and cos 90° = 0. Perpendicular to the gradient means no rise.' },
    { text: 'Half of |∇f|', why: 'That would be cos 60°. A quarter turn is 90°, where cosine is zero.' },
    { text: 'Negative |∇f|', why: 'That is 180° — straight downhill. 90° is along the contour.' },
  ],
  state: { field: 'bowl', x: 0.9, y: -0.6, thetaOffsetDeg: 90 },
} },
```

Author the remaining ten in the same voice, each a genuine conceptual trap (not a lookup), each with a `state` that lets the student *see* the answer. Suggested foci: Taylor "is N=1 the tangent line?"; Riemann "left vs right for a decreasing f — which over-counts?"; secant "does a smaller h always mean a better answer on a computer?"; unit-circle "how many angles in two turns give sin θ = ½?"; solids "washer area — π(R²−r²) or π(R−r)²?"; partials "both partials zero — must it be a maximum?"; vector-fields "shear: does the paddle wheel turn?"; curl-divergence "curl of a gradient?"; greens "reverse the loop direction — what changes?"; related-rates "constant inflow into a cone — constant level rise?".

- [ ] **Step 2: Static check the check-state ids**

Run a one-off check (adapt the audit already used for jump ids) confirming every `check.state` id resolves against its playground's registry. Expected: all clean.

- [ ] **Step 3: Browser spot-check three**

Serve dev; open gradient, riemann-sums, curl-divergence; open the lesson, go to "Using it", answer the check wrong then right, press "See it".
Expected: wrong/right marking, the explanation, and the playground jumping to the state.

- [ ] **Step 4: Full suite + build; commit**

```bash
npm test && npm run build
git add playgrounds/*/content.js
git commit -m "content: a self-check question in every playground lesson"
```

---

### Task 8: Cross-concept links in lessons

**Files:**
- Modify: `engine/sequencer.js` — allow an optional `prereq` slug on a catalogue entry; export `neighbours(slug) -> { prereq, next }`.
- Modify: `engine/sequencer.test.js` — test `neighbours`.
- Modify: `engine/lesson.js` — render a small "Builds on X · Leads to Y" line under the lesson intro when `mountLesson` is given `links`.
- Modify: each `playgrounds/<slug>/playground.js` — pass `links: neighbours('<slug>')` to `mountLesson`.
- Modify: relevant `content.js`/sequencer entries — add `prereq` where a real prerequisite exists (e.g. `gradient` prereq `partial-derivatives`; `curl-divergence` prereq `vector-fields`; `greens-theorem` prereq `curl-divergence`; `taylor-series` prereq `secant-tangent`).

**Interfaces:**
- Produces: `neighbours(slug) -> { prereq: entry|null, next: entry|null }` using the existing `next()` and the new `prereq` field.

- [ ] **Step 1: Test + implement `neighbours` and `prereq`**

In `engine/sequencer.test.js`:

```js
describe('neighbours', () => {
  it('returns the declared prereq and the sequence next', () => {
    const n = neighbours('gradient');
    expect(n.prereq?.slug).toBe('partial-derivatives');
    expect(n.next?.slug).toBe(next('gradient').slug);
  });
  it('nulls where none exist', () => {
    const n = neighbours(PLAYGROUNDS[0].slug);
    expect(n.prereq).toBeNull();
  });
});
```

In `engine/sequencer.js`, add the `prereq` field to the entries that have one, and:

```js
export const neighbours = slug => {
  const here = bySlug(slug);
  return {
    prereq: here?.prereq ? bySlug(here.prereq) : null,
    next: next(slug),
  };
};
```

- [ ] **Step 2: Render the links in `lesson.js`**

Give `mountLesson` an optional `opts.links = { prereq, next }`. After the `.lesson-intro` paragraph, insert (only when links exist):

```js
const links = opts.links;
if (links && (links.prereq || links.next)) {
  const bits = [];
  if (links.prereq) bits.push(`Builds on <a href="/playgrounds/${links.prereq.slug}/">${links.prereq.title}</a>`);
  if (links.next) bits.push(`Leads to <a href="/playgrounds/${links.next.slug}/">${links.next.title}</a>`);
  el.querySelector('.lesson-intro').insertAdjacentHTML('afterend',
    `<p class="lesson-links">${bits.join(' &nbsp;·&nbsp; ')}</p>`);
}
```

- [ ] **Step 3: Pass `links` from every playground**

In each `playground.js`, import `neighbours` and add `links: neighbours('<slug>')` to the `mountLesson` options.

- [ ] **Step 4: Test, browser-check gradient shows "Builds on Partial Derivatives", build, commit**

```bash
npm test && npm run build
git add engine/sequencer.js engine/sequencer.test.js engine/lesson.js playgrounds/*/playground.js
git commit -m "feat: prerequisite and next-concept links in every lesson"
```

---

### Task 9: End-to-end suite — Playwright locking jump states and deep links

**Files:**
- Create: `playwright.config.js`
- Create: `e2e/jumps.spec.js`
- Create: `e2e/deep-link.spec.js`
- Modify: `package.json` — add `@playwright/test` devDependency and a `"test:e2e": "playwright test"` script.

**Interfaces:**
- Consumes: the built `dist` served by Playwright's `webServer` (`vite preview`).

- [ ] **Step 1: Install and configure**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Create `playwright.config.js`:

```js
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npm run build && npx vite preview --port 4188', port: 4188, reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://localhost:4188' },
});
```

Add to `package.json` scripts: `"test:e2e": "playwright test"`.

- [ ] **Step 2: Write the jumps spec**

```js
// e2e/jumps.spec.js
import { test, expect } from '@playwright/test';

const SLUGS = ['unit-circle','secant-tangent','related-rates','riemann-sums','taylor-series',
  'solids-of-revolution','partial-derivatives','gradient','vector-fields','curl-divergence','greens-theorem'];

for (const slug of SLUGS) {
  test(`${slug}: every lesson jump yields a distinct state and no console error`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`/playgrounds/${slug}/`);
    // open the lesson
    await page.locator('.lesson-head h2').click();
    const levels = page.locator('.lesson-levels .tbtn');
    const seen = new Set();
    let jumps = 0;
    for (let i = 0; i < await levels.count(); i++) {
      await levels.nth(i).click();
      const btns = page.locator('.lesson-jump');
      for (let k = 0; k < await btns.count(); k++) {
        await page.locator('.lesson-jump').nth(k).click();
        const readout = (await page.locator('#readout').textContent())?.replace(/\s+/g, ' ').trim();
        seen.add(readout);
        jumps++;
      }
    }
    expect(jumps).toBeGreaterThan(6);
    expect(seen.size).toBe(jumps);          // every jump moved the view
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 3: Write the deep-link spec**

```js
// e2e/deep-link.spec.js
import { test, expect } from '@playwright/test';

test('a parametered URL reproduces the state', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/?fn=sin&rule=mid&n=30');
  const readout = (await page.locator('#readout').textContent()) ?? '';
  expect(readout).toContain('sin');
  expect(readout.toLowerCase()).toContain('mid');
});

test('Copy link round-trips through a fresh navigation', async ({ page, context }) => {
  await page.goto('/playgrounds/unit-circle/');
  const t = page.locator('#theta');
  await t.fill('120');
  await t.dispatchEvent('input');
  const url = page.url();
  expect(url).toContain('deg=');
  const p2 = await context.newPage();
  await p2.goto(url);
  const r = (await p2.locator('#readout').textContent()) ?? '';
  expect(r).toContain('120');
});
```

- [ ] **Step 4: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS. If a jump does not move the view, the `seen.size === jumps` assertion pins exactly which playground — fix that playground's `applyState`/state before proceeding.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.js e2e/ package.json package-lock.json
git commit -m "test: end-to-end suite locking jump states and deep links"
```

---

### Task 10: Print stylesheet, focus styles, and a presenter mode

**Files:**
- Modify: `engine/chrome.css` — focus-visible ring, `.lesson-check`/`.lesson-why`/`.lesson-opt`/`.lesson-links` styles (from Tasks 6/8), `@media print`, and `.present` scale-up.
- Modify: each `playgrounds/<slug>/index.html` — a presenter toggle button in the header actions.
- Modify: a tiny shared helper or inline snippet toggling `document.body.classList.toggle('present')` and remembering it in localStorage.

**Interfaces:** none new; pure CSS + a class toggle.

- [ ] **Step 1: Add the CSS**

Append to `engine/chrome.css`:

```css
/* ---- keyboard focus ---- */
canvas:focus-visible, .pgpill:focus-visible, .action:focus-visible,
.tbtn:focus-visible, .fbtn:focus-visible, .lesson-opt:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}

/* ---- self-check ---- */
.lesson-check-q{font-size:14px;color:var(--ink);margin-bottom:10px;line-height:1.5}
.lesson-opts{display:flex;flex-direction:column;gap:7px;max-width:60ch}
.lesson-opt{text-align:left;font-family:inherit;font-size:12.5px;color:var(--ink);cursor:pointer;
  background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:9px 12px;transition:.15s}
.lesson-opt:hover{border-color:var(--accent)}
.lesson-opt.right{border-color:var(--approx);background:rgba(61,242,192,.12);color:var(--approx)}
.lesson-opt.wrong{border-color:var(--error);background:rgba(255,93,115,.10);color:var(--error)}
.lesson-why{margin-top:9px;font-size:12px;color:var(--muted);line-height:1.6;max-width:70ch}
.lesson-seeit{margin-top:9px;width:auto;padding:8px 14px;font-size:11px;color:var(--accent);border-color:rgba(122,162,255,.4)}
.lesson-links{font-size:11.5px;color:var(--muted);margin:-4px 0 16px}
.lesson-links a{color:var(--accent);text-decoration:none;border-bottom:1px solid transparent}
.lesson-links a:hover{border-bottom-color:var(--accent)}

/* ---- presenter mode: bigger for a lecture hall ---- */
body.present{font-size:118%}
body.present .graph-card{--graph-min:66vh}
body.present .readout{font-size:15px;max-width:min(94%,640px)}
body.present .pgnav,body.present .lesson,body.present .scoreboard{display:none}

/* ---- print: the lesson becomes a handout ---- */
@media print{
  body{background:#fff;color:#111;padding:0}
  .pgnav,.scoreboard,.toast-wrap,#fx,.graph-card,.panel,.lesson-actions,.lesson-jump,.lesson-seeit,.lesson-opts{display:none !important}
  .lesson{border:0;box-shadow:none;padding:0}
  .lesson.closed .lesson-body{display:block}       /* print unfolds it */
  .lesson-body,.lesson-intro,.lesson-step-body,.lesson-check-q,.lesson-why{color:#111}
  .lesson-fig{border:1px solid #ccc}
  .lesson-step{break-inside:avoid}
  .lesson-links a{color:#111;text-decoration:underline}
}
```

- [ ] **Step 2: Presenter as a URL flag (decision: `?present`)**

Presenter mode is driven by the URL, not a per-page toggle, so a professor sets it once and links to it — and it composes with the deep-link params from Tasks 1–3 (`?field=saddle&x=0.9&present=1`). A toggle button is still offered as a convenience, but it works by editing the URL flag, keeping the URL the single source of truth.

Add a shared helper in `engine/dom.js` and call it once from each `playground.js`:

```js
// engine/dom.js
export function mountPresenter() {
  const params = new URLSearchParams(location.search);
  const on = params.get('present') === '1';
  document.body.classList.toggle('present', on);

  const btn = document.getElementById('present');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(on));
  btn.addEventListener('click', () => {
    const p = new URLSearchParams(location.search);
    const now = p.get('present') !== '1';
    if (now) p.set('present', '1'); else p.delete('present');
    // replaceState, so toggling does not stack history entries
    history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p : ''}`);
    document.body.classList.toggle('present', now);
    btn.setAttribute('aria-pressed', String(now));
  });
}
```

In each `index.html`, add the optional toggle to the header actions:

```html
<button class="chip" id="present" title="Presenter mode" aria-pressed="false" style="cursor:pointer">Present</button>
```

Note for the roll-out: `mountPresenter()` must read the flag on load *after* any deep-link `applyState`, so opening `?present=1` alone (no other params) still enlarges the current default view. Call it as the last line of each `playground.js`.

- [ ] **Step 3: Verify**

Browser: Tab through a page — focus rings appear. Toggle Present — canvas grows, nav/lesson/scoreboard hide. Browser print preview (Cmd-P) on a page with the lesson open — the handout shows title, intro, prose and figures, with the interactive furniture gone.

- [ ] **Step 4: Full suite + build; commit**

```bash
npm test && npm run build
git add engine/chrome.css engine/dom.js playgrounds/*/index.html playgrounds/*/playground.js
git commit -m "feat: focus styles, presenter mode, and a print-to-handout stylesheet"
```

---

### Task 11: Progress export/import on the landing page

**Files:**
- Modify: `engine/score-shell.js` — `exportProgress() -> string` (base64 of the JSON of every `cmv:progress:*` key) and `importProgress(code) -> boolean` (parse, validate, write back).
- Modify: `engine/score-shell-progress.test.js` — round-trip test.
- Modify: `index.html` + `home.js` — a small "Back up / restore progress" panel with a textarea and two buttons.

**Interfaces:**
- Produces: `exportProgress()`, `importProgress(code)`.

- [ ] **Step 1: Test the round-trip**

```js
describe('export / import progress', () => {
  it('round-trips every playground', () => {
    saveProgress('a', { pts: 40, streak: 0, badges: ['x'], awards: ['solve:a'] });
    saveProgress('b', { pts: 10, streak: 2, badges: [], awards: [] });
    const code = exportProgress();
    localStorage.clear();
    expect(loadProgress('a').pts).toBe(0);
    expect(importProgress(code)).toBe(true);
    expect(loadProgress('a')).toEqual({ pts: 40, streak: 0, badges: ['x'], awards: ['solve:a'] });
    expect(loadProgress('b').streak).toBe(2);
  });
  it('rejects a corrupt code without throwing', () => {
    expect(importProgress('not base64!!')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement in `score-shell.js`**

```js
export function exportProgress() {
  const all = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) all[k.slice(PREFIX.length)] = loadProgress(k.slice(PREFIX.length));
  }
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(all)))); } catch { return ''; }
}

export function importProgress(code) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code))));
    if (!obj || typeof obj !== 'object') return false;
    for (const [slug, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') saveProgress(slug, {
        pts: Number(v.pts) || 0, streak: Number(v.streak) || 0,
        badges: Array.isArray(v.badges) ? v.badges : [], awards: Array.isArray(v.awards) ? v.awards : [],
      });
    }
    return true;
  } catch { return false; }
}
```

- [ ] **Step 3: Landing-page UI**

In `index.html`, below the course grid, add a collapsible `<details>` panel with a `<textarea id="pcode">` and buttons `#pexport` / `#pimport`. In `home.js`, wire: export fills the textarea and selects it; import reads it, calls `importProgress`, and re-renders the cards (reload is acceptable — `location.reload()`).

- [ ] **Step 4: Test, browser-check the round-trip across a simulated "new device" (clear storage, paste code), build, commit**

```bash
npm test && npm run build
git add engine/score-shell.js engine/score-shell-progress.test.js index.html home.js
git commit -m "feat: export/import progress code on the landing page"
```

---

### Phase 1 deploy + close

- [ ] Run the full unit suite (`npm test`) and the E2E suite (`npm run test:e2e`); both green.
- [ ] `npm run build`; push to `main`; confirm the auto-deploy goes Ready and spot-check a deep link, a keyboard interaction, a self-check, and a print preview on the live site.
- [ ] Commit any status-doc update. **This is the natural stopping point.** Do not roll into Phase 2 without the brainstorm + plan gate below.

---

## PHASE 2 — T4 drill generator (SEPARATE SUBSYSTEM — plan before building)

> **STOP.** This is a new subsystem, not a variation on a playground: it generates problems, parses and checks free-form answers, and ladders hints. Per the writing-plans scope rule it deserves its own brainstorm and its own detailed plan. The outline below is scope, not task-by-task code.

**What it is.** The build map's T4 rows — factoring, differentiation rules, integration techniques, trig identities — are *procedural* skills where a picture does not help. Each is a generator: emit a randomized problem, take the student's answer, check it for mathematical equivalence (not string match), and reveal hints one rung at a time.

**Proposed engine modules (each pure + tested first):**
- `engine/drill/generator.js` — per-topic problem factories producing `{ prompt, answer, steps }` from a seeded RNG (seeded so a professor can share an exact problem set by URL, reusing Phase 1's deep-link mechanism).
- `engine/drill/equiv.js` — answer equivalence. Start narrow and honest: a tiny expression normaliser for polynomials/rationals (expand, collect, compare coefficients) rather than a full CAS. Tested against known equivalent/inequivalent pairs. Explicitly scope out what it cannot judge.
- `engine/drill/hints.js` — a hint ladder: reveal the method, then the first step, then the full worked solution, one press at a time.
- `engine/drill/drill-shell.js` — the drill UI (prompt, input, check, hint button, streak), analogous to a playground's chrome but input-driven.

**Proposed content (one topic to prove the pattern, then roll out):**
- `drills/differentiation-rules/` — chain/product/quotient, the highest-value T4 row, and the one whose answer-checking is most tractable (derivatives of elementary functions normalise cleanly).

**Decisions to settle in the brainstorm:** how far the equivalence checker should reach before it is more misleading than useful; whether to lean on a vetted tiny math-parser that can be bundled offline vs. hand-rolling; how drills appear in the sequencer and landing page (a new "Practice" course? a tab on each concept?); whether seeded problem-set sharing is worth the extra surface.

**Rough shape:** ~6–9 tasks (generator, equivalence, hints, shell, one topic end-to-end, sequencer/landing integration, E2E), one detailed plan.

---

## PHASE 3 — Extensibility (SEPARATE — needs product decisions)

> **STOP.** Lightest of the three and the most speculative. Brainstorm whether it is wanted before planning.

**Custom registry entry via URL.** Let a professor add *their* function/field to a playground through a URL parameter — e.g. `?fn=custom&expr=x^3-sin(x)` — so they can demonstrate an example the built-in registry does not carry. This is the feature most likely to make professors adopt rather than merely link.

**The one hard part:** evaluating a user-supplied expression safely. `eval`/`Function` on a query string is an XSS hole; the answer is a tiny, bundled, offline expression parser restricted to a known function whitelist (`sin`, `cos`, `exp`, `+ - * / ^`, a couple of variables) that returns a numeric evaluator, never executing arbitrary JS. Tested hard, including hostile input.

**Decisions to settle:** which playgrounds accept custom content (the Grapher2D ones are easy; 3-D and vector fields need two-variable parsing and derivative estimation); whether custom entries get a challenge (probably not — they are demonstration, not assessment); how much parser surface is worth maintaining.

**Explicitly out of scope for this project:** real accounts, an LMS/LTI integration, or any server. Those require a backend and change the product's constraints; if they are ever wanted they are a new project, not a phase here.

**Rough shape:** ~4–6 tasks (safe evaluator + tests, one playground accepting custom content, URL plumbing, guardrails), one detailed plan.

---

## Self-Review

**Spec coverage** (against the six-item review that seeded this plan, plus the two deferred subsystems):
1. URL deep-linking → Tasks 1–3. ✓
2. Keyboard access + canvas ARIA → Tasks 4–5. ✓
3. Self-check questions in lessons → Tasks 6–7. ✓
4. E2E suite locking jump states → Task 9. ✓
5. Print styles + presenter flag → Task 10. ✓
6. Cross-concept links → Task 8 (added; was flagged in the review under "connective tissue"). ✓
7. "Why was I wrong" feedback → partially addressed by self-check explanations (Task 7); dynamic per-state hints noted as a future refinement, not a Phase 1 task. ✓ (scoped)
8. Progress export/import → Task 11 (the review's professor-facing "show/export progress"). ✓
9. Math rendering (KaTeX) → deliberately **not** taken: it conflicts with the no-network constraint unless self-hosted, and the review flagged it as a "decide deliberately" item, not a fix. Left out with that rationale stated here.
10. T4 drills → Phase 2 (scoped, gated). ✓
11. Custom registries → Phase 3 (scoped, gated). ✓

**Placeholder scan:** Phase 1 tasks carry complete code for the shared modules and the reference playground; the roll-out tasks (3, 5, 7) specify the exact per-file transformation plus the reference, which is legitimate for a mechanical change across eleven near-identical files. Phases 2–3 are intentionally outlines, flagged as such with STOP gates. No `TODO`/`TBD`/"handle edge cases" placeholders in executable steps.

**Type/name consistency:** `applyState(st)` is the seam name used consistently in Tasks 2, 3, 6, 8, 9. `URL_SCHEMA` / `urlState()` / `pushUrl` used consistently in Tasks 2–3, 5. `keyboardControl(el, {nudge, step, home})` matches between Task 4's definition and Task 5's use. `check` step shape matches between Task 6 (`lesson.js`) and Task 7 (content). `neighbours(slug)` and `prereq` match between Task 8's sequencer changes and its lesson use. `exportProgress`/`importProgress` match between Task 11's engine and landing-page use.

## Decisions (settled)

1. **Self-check placement:** one check at the `use` level per playground. (Task 7 as written.)
2. **Presenter mode:** a `?present` URL flag, source of truth in the URL, with a convenience toggle that edits the flag. (Task 10 Step 2 updated.)
3. **Phase 2 topic:** undecided — settle in the Phase 2 brainstorm. differentiation-rules remains the proposal (most tractable answer-checker).
