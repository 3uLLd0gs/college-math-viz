# Phase 5 — Two-Variable Custom Expressions (partial-derivatives + gradient) — Design

**Status:** Approved (brainstorm 2026-07-27)
**Predecessors:** Phase 3 (custom `f(x)` on riemann-sums) and Phase 4 (rollout to solids + secant-tangent, shared helpers in `engine/custom-fn.js`). **This phase stacks on the unmerged `phase4-custom-rollout` branch** — it depends on Phase 4's shared helpers.
**This phase** extends custom expressions to the two-variable playgrounds, adding the minimal machinery for `f(x,y)`.

---

## Goal

Let a professor supply a custom `f(x,y)` on **partial-derivatives** (a surface whose two slice-slopes are the partial derivatives) and **gradient** (a scalar field whose gradient a dial chases), reusing the Phase 3/4 safe-evaluation, URL, and input machinery — extended to a second variable with numeric partial derivatives.

## Settled decisions (from the brainstorm)

1. **Scope:** both partial-derivatives and gradient. The new machinery is identical for both; each playground integration is thin.
2. **Challenge:** gradient KEEPS its "align the dial with the gradient" challenge (winnable via the numeric gradient); partial-derivatives HIDES its "find the critical point" challenge (a custom surface has no guaranteed critical point in the box).
3. **Parser:** extend `engine/expr.js` to recognize `y` (one line). Backward-safe — a `y` in a single-variable playground is rejected at evaluation, so riemann/solids/secant are unaffected.
4. **UI:** a single `f(x, y)` expression field (no domain), reusing `wireCustomInput` with no `aEl`/`bEl`. Fixed default extent `a=3`; no user-set domain.
5. **Numeric partials:** `∂f/∂x`, `∂f/∂y` via central difference — the custom entries carry numeric `fx`/`fy` in place of the built-ins' analytic ones.

## Global constraints (inherited, binding)

- **No `eval`/`Function` on any user string.** `engine/expr.js` (via `compileCustom2`) is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** Displayed via `textContent`, set via `<input>.value` only — never `innerHTML`.
- **No runtime network calls; no backend.** State/sharing ride on localStorage and the URL.
- **Design system fixed.** Colours from `engine/tokens.css`; page-specific CSS in the page's own `<style>`; `engine/chrome.css` linked, never `@import`ed.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase5-twovar-custom` (off `phase4-custom-rollout`). **Custom entry id:** `custom` (verbatim).

## Existing structure this builds on

- `engine/custom-fn.js` (Phase 3/4): `compileCustom`, `viewFromDomain`, `numericDerivative`, `wireCustomInput`.
- `engine/expr.js`: `compile(src) -> (scope)=>number`, `parse`, `evaluate`, `ExprError`. `atom()` recognizes `x` via `if (name === 'x') return { t:'var', name:'x' };`; `evaluate`'s `'var'` case reads `scope[node.name]` and throws on an unbound name. Adding `y` is a sibling line; `evaluate` already generalizes over `scope`.
- **partial-derivatives** (`content.js` `SURFACES`, shape `{ id, label, f:(x,y)=>, fx:(x,y)=>, fy:(x,y)=>, a, challenge:{tol,hint} }`; `playground.js` uses `Surface3D`, a challenge meter, `buttonGroup('fbtns', SURFACES, …)`, `URL_SCHEMA` incl. `surf`/`axis`/`slice`/`probe`).
- **gradient** (`content.js` `FIELDS`, shape `{ id, label, tex, f:(x,y)=>, fx, fy, a, hint }`; `playground.js` uses `ContourMap`, a steepest-ascent/direction challenge, `buttonGroup('fbtns', FIELDS, …)`, `URL_SCHEMA` incl. `field`/`theta`/probe coords).

*(The exact `URL_SCHEMA` keys, readout lines, and challenge element ids are read verbatim during planning; the plan pins them.)*

## Shared machinery

### `engine/expr.js`
Add `y` to `atom()` (a sibling of the `x` line):
```js
if (name === 'x') return { t: 'var', name: 'x' };
if (name === 'y') return { t: 'var', name: 'y' };
```
No other change. `evaluate(node, { x, y })` already works via the generic `'var'` case. Single-variable callers pass `{ x }`; an expression using `y` there throws "Unbound variable: y" at evaluation, which `compileCustom`'s sample guard turns into a rejection — so no single-variable playground regresses.

### `engine/custom-fn.js`
- **`compileCustom2(src) -> { f: (x,y)=>number, error }`** — `compile(src)` via `expr.js`; on `ExprError` return `{ f:null, error }`. On success wrap `f = (x,y) => { try { const v = g({x,y}); return Number.isFinite(v) ? v : NaN; } catch { return NaN; } }`. Finite-guard: sample a small 2-D grid (e.g. 5×5 across `[-2.5,2.5]²`); if `f` is non-finite at every grid point, return an error. Returns `{ f, error:'' }` otherwise.
- **`numericPartials(f, eps=1e-5) -> { fx, fy }`** — `fx = (x,y) => central-diff in x`, `fy = (x,y) => central-diff in y`, each NaN-safe when a sample is non-finite. `fx(x,y) = (f(x+eps,y) - f(x-eps,y)) / (2*eps)`, `fy` analogously.

## partial-derivatives integration

- `index.html`: `id="challenge"` on the challenge card (for hiding); a custom input row (`#customExpr`, `#customMsg` — no domain fields); page-local `.custom-*` CSS.
- `playground.js`:
  - `URL_SCHEMA` += `expr:'string'`.
  - import `compileCustom2`, `numericPartials`, `wireCustomInput`.
  - a `#customPill` appended to `#fbtns`; `activateCustom(src)` → `compileCustom2(src)` → on success build `{ id:'custom', label:src, tex:src, f, ...numericPartials(f), a:3, custom:true }`, select it, hide the challenge, render, push URL; inline error otherwise.
  - `selectCustom` sets `state.surf` (or the page's surface variable) to the custom entry, clears built-in highlights (`fnButtons.select(-1,{notify:false})`), pill `.on`, frames the surface (whatever the page does on surface change), `meter.reset()`, render, pushUrl. Built-in select calls `deactivateCustom()` first.
  - `render()` custom branch: renders the Surface3D as usual (reads `f`/`fx`/`fy`), writes any surface label/expression into the readout via `textContent` (a `.cx` span), sets `#challenge` `display:none`, and returns before any challenge/`exact`-style code that a custom surface lacks.
  - `urlState()` emits `expr` (+ `surf:'custom'`) only when custom active; `pushUrl`/Copy-link pass `{ managed: Object.keys(URL_SCHEMA) }`; `applyState` skips the built-in lookup for `surf:'custom'` and applies `expr` (order chosen so URL slice/probe coords still win, matching the secant-tangent lesson).
  - `wireCustomInput` wired (no `aEl`/`bEl`); field consts before the on-load `readState`/`applyState`.

## gradient integration

- `index.html`: a custom input row (`#customExpr`, `#customMsg`); page-local CSS. The challenge card stays (no hide) — no `id="challenge"` needed unless one already exists.
- `playground.js`:
  - `URL_SCHEMA` += `expr:'string'`.
  - import `compileCustom2`, `numericPartials`, `wireCustomInput`.
  - a `#customPill`; `activateCustom(src)` builds `{ id:'custom', label:src, tex:src, f, ...numericPartials(f), a:3, custom:true }`, selects it, renders, pushes URL. The direction dial + directional-derivative readout + steepest-ascent challenge all read `f`/`fx`/`fy` — with numeric partials, they work and the CHALLENGE STAYS.
  - `render()`: writes the field's label/expression into the readout via `textContent` for custom (secure); no challenge hide.
  - `urlState`/`pushUrl`/Copy-link managed keys; `applyState` handles `expr`; `wireCustomInput` wired.

## Data flow (both)

```
?expr  OR  in-page typing (wireCustomInput, single f(x,y) field)
        │
   compileCustom2(expr) → { f, error }
        │ ok                                   │ error
   { id:'custom', f, ...numericPartials(f), a }  setMsg(error), no entry,
   → select, render, pushUrl(managed)            keep prior state
   → partial: hide challenge; gradient: keep
```

## Error handling

- Unparseable / hostile `expr` → rejected by `expr.js`; inline message; no entry; no DOM markup injection.
- `f` non-finite across the whole 2-D sample grid → `compileCustom2` returns an error; no entry.
- A custom surface with no critical point (partial) → challenge is hidden anyway, so no unwinnable state. A custom field flat at the probe (gradient) → the directional derivative is ~0 in every direction; the challenge is degenerate but not broken (the renderer tolerates a zero gradient).
- Numeric partials at a non-differentiable point yield a plausible-but-wrong slope (same caveat as Phase 4's `numericDerivative`); the professor frames the probe via existing controls; the renderer tolerates non-finite values.

## Testing

- `engine/expr.test.js`: `compile('x*y')({x:2,y:3})` → 6; `compile('y^2')({x:0,y:3})` → 9; `compile('y')({x:1})` throws (backward-safety — no `y` supplied).
- `engine/custom-fn.test.js`:
  - `compileCustom2('x^2+y^2').f(1,2)` → 5; `error` is `''`.
  - hostile (`alert(1)`, `__proto__`, `x.constructor`) → `{ f:null, error:<non-empty> }`.
  - non-finite-everywhere (`ln(-1-x^2-y^2)`) → error.
  - `numericPartials` for `x^2+y^2` → `fx(1,2)≈2`, `fy(1,2)≈4`; for `sin(x)*cos(y)` matches `cos x·cos y` / `−sin x·sin y` to tolerance; NaN-safe at a domain edge.
- E2E (`e2e/twovar-custom.spec.js`):
  - partial `?expr=x^2-y^2` → custom surface renders, `#customPill` on, `#challenge` HIDDEN, readout shows the expression via `.cx`.
  - gradient `?expr=x^2+y^2` → custom field renders, `#customPill` on, challenge VISIBLE (kept).
  - hostile `?expr=alert(1)` on both → inline error, no entry, no console error.
  - Copy-link round-trips the custom function on both.
- Existing suites stay green after the `expr.js` `y` addition (backward-safe).

## Scope / YAGNI

- Two playgrounds; `f(x,y)`; numeric partials; fixed extent `a=3`.
- **No** analytic partials, **no** user-set domain, **no** rollout to the vector-valued playgrounds (vector-fields / curl-divergence / greens-theorem need `F(x,y) = (P, Q)` — two expressions — a separate future phase).

## Rough shape

~5 tasks, one plan:
1. `engine/expr.js` `y` + `engine/custom-fn.js` `compileCustom2` + `numericPartials` + tests.
2. partial-derivatives custom surface (URL + entry + pill + input + challenge-hide + secure readout).
3. gradient custom field (URL + entry + pill + input + challenge-keep + secure readout).
4. E2E for both.
5. (folded into 2/3 if small) page CSS + final full-suite/build pass.

## Out of scope (future phases)

- Vector-valued custom fields `F(x,y)=(P,Q)` on vector-fields / curl-divergence / greens-theorem.
- Analytic (symbolic) partials.
- Custom content on the remaining playgrounds (unit-circle, related-rates, taylor-series).
