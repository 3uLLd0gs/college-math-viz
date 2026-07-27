# Phase 6 — Vector-Valued Custom Fields (vector-fields + curl-divergence + greens-theorem) — Design

**Status:** Approved (brainstorm 2026-07-27)
**Predecessors:** Phases 3–5 (custom scalar `f(x)` and `f(x,y)` on five playgrounds, shared helpers in `engine/custom-fn.js`), all merged to `main`.
**This is the final phase of the custom-expression arc** — vector-valued custom fields `F(x,y) = (P(x,y), Q(x,y))`.

---

## Goal

Let a professor supply a custom vector field `F=(P,Q)` on the three vector-field playgrounds — **vector-fields**, **curl-divergence**, **greens-theorem** — reusing the two-variable parser and numeric-partials machinery, with numeric divergence and curl.

## Settled decisions (from the brainstorm)

1. **Scope:** all three playgrounds. The machinery is shared; each integration is thin (greens-theorem uses only `curl`).
2. **Challenge:** HIDDEN for custom on all three. Each challenge hunts a special point/configuration (a stagnation point where `F=0`; a spot where both `div` and `curl` vanish; a spin-balance that cancels circulation) that a custom field has no guarantee of — so custom is demonstration-only, like riemann/solids/partial.
3. **Numeric div/curl:** a custom field carries numeric `div = ∂P/∂x + ∂Q/∂y` and `curl = ∂Q/∂x − ∂P/∂y`, built from `numericPartials` on `P` and `Q`.
4. **Two-field UI:** two expression inputs (`P` and `Q`), via a new `wireCustomInput2` helper (the two-field analogue of `wireCustomInput`).
5. **Extent:** fixed default `a=3`.

## Global constraints (inherited, binding)

- **No `eval`/`Function` on any user string.** `engine/expr.js` (via `compileCustom2`) is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** `P`/`Q` reach the DOM via `<input>.value` only — never `innerHTML`. (All three readouts are numeric.)
- **No runtime network calls; no backend.**
- **Design system fixed.** Page-specific CSS in the page's own `<style>` (tokens only); `engine/chrome.css` untouched.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase6-vector-custom` (off `main`). **Custom entry id:** `custom` (verbatim).

## Existing structure this builds on

- `engine/custom-fn.js`: `compileCustom` (1-var), `compileCustom2` (2-var, `{f:(x,y)=>, error}`), `numericPartials(f) → {fx, fy}`, `numericDerivative`, `viewFromDomain`, `wireCustomInput` (one field).
- `engine/expr.js`: whitelist parser, `x` and `y` variables.
- **vector-fields** (`content.js` `FIELDS`, shape `{ id, label, tex, P, Q, div, curl, ... }`; `playground.js` `URL_SCHEMA = { field, x, y }`, numeric readout, `buttonGroup('fbtns', FIELDS, …)`, challenge = find stagnation point, `<div class="challenge">` no id).
- **curl-divergence** (`FIELDS` `{ id, label, tex, P, Q, div, curl, … }`; `URL_SCHEMA = { field, x, y, r }`; numeric readout showing `div F`/`curl F`; challenge = both vanish; `<div class="challenge">` no id).
- **greens-theorem** (`FIELDS` `{ id, label, P, Q, curl }` — no `div`; `URL_SCHEMA = { field, x, y, r }`; numeric readout showing `∮F·dr`/`∬curl dA`; challenge = balance to cancel; `<div class="challenge">` no id).

*(Exact readout lines, challenge ids, field-select/render calls, and `placeProbe`-style helpers are read verbatim during planning; the plan pins them.)*

## Shared machinery (`engine/custom-fn.js`)

- **`vectorDiffOps(P, Q, eps=1e-5) → { div, curl }`** — using `numericPartials(P) = {fx: Px, fy: Py}` and `numericPartials(Q) = {fx: Qx, fy: Qy}`:
  - `div = (x,y) => Px(x,y) + Qy(x,y)`
  - `curl = (x,y) => Qx(x,y) - Py(x,y)`
  - NaN-safe (inherited from `numericPartials`).
- **`wireCustomInput2({ pEl, qEl, msgEl, onSubmit }) → { setFields, setMsg }`** — attaches `input`+Enter to `pEl` and `qEl`; on any change reads BOTH trimmed values and, when BOTH are non-empty, calls `onSubmit(pSrc, qSrc)` (if either is empty, clears the message and does not submit). `setFields(pSrc, qSrc)` writes each `.value` (guarded against cursor-jank); `setMsg(text)` writes `msgEl.textContent`.

## Custom entry (all three)

Built by each playground's `activateCustom(pSrc, qSrc)`:
```
const { f: P, error: eP } = compileCustom2(pSrc);
const { f: Q, error: eQ } = compileCustom2(qSrc);
if (!P || !Q) → inline error, no entry
entry = { id:'custom', label:'◆ custom', srcP: pSrc, srcQ: qSrc, P, Q, ...vectorDiffOps(P, Q), a:3, custom:true };
```
greens-theorem uses only `entry.curl` (its `div` is present but unused — harmless).

## Per-playground integration (thin; challenge hidden on all three)

Each `playground.js`:
- import `compileCustom2`, `vectorDiffOps`, `wireCustomInput2`.
- `URL_SCHEMA += exprP:'string', exprQ:'string'`.
- a `#customPill` (id set) appended to `#fbtns`; `activateCustom(pSrc, qSrc)` builds the entry and selects it; `selectCustom` clears built-in highlights (`fieldButtons.select(-1,{notify:false})`), pill `.on`, sets the field on the renderer, places the probe, hides the challenge, renders, pushes URL; built-in select calls `deactivateCustom()` first.
- the render/readout path hides `#challenge` for a custom field (add `id="challenge"` to each card) and returns before any challenge/`meter.update` code that reads a built-in-only field (the readouts are numeric and safe for custom).
- `urlState` emits `exprP`/`exprQ` (+ `field:'custom'`) only when custom active; `pushUrl`/Copy-link pass `{ managed: Object.keys(URL_SCHEMA) }`; `applyState` skips the built-in lookup for `field:'custom'` and applies `exprP`/`exprQ` BEFORE the probe coords (`x`/`y`/`r`) so a shared link's probe wins.
- a two-field input row (`#customP`, `#customQ`, `#customMsg`) wired via `wireCustomInput2`; field consts before the on-load `readState`/`applyState`.

Per-playground specifics:
- **vector-fields** — arrows from `P`/`Q`; `div`/`curl` feed the classifier; challenge (stagnation) hidden.
- **curl-divergence** — tracers + paddle-wheel from `P`/`Q`/`div`/`curl`; readout shows numeric `div`/`curl`; challenge (both vanish) hidden.
- **greens-theorem** — field + loop; `∮F·dr` and `∬curl dA` computed numerically from `P`/`Q`/`curl`; challenge (balance) hidden.

## Data flow

```
?exprP,exprQ  OR  in-page typing (wireCustomInput2: two fields)
        │
   compileCustom2(pSrc), compileCustom2(qSrc) → P, Q (or error)
        │ both ok                              │ either error
   { id:'custom', P, Q, ...vectorDiffOps(P,Q) }  setMsg(error), no entry
   → select, render, pushUrl(managed)            keep prior state
   → hide challenge (all three)
```

## Error handling

- Either `P` or `Q` unparseable / hostile (`alert(1)`, `<script>`, `__proto__`) / non-finite-everywhere → inline message, no entry, no DOM markup injection.
- All three challenges hidden for custom → no unwinnable state.
- Numeric `div`/`curl` at a non-differentiable point yields a plausible-but-wrong value (same caveat as Phase 4/5); the renderer tolerates non-finite values.

## Testing

- `engine/custom-fn.test.js`:
  - `vectorDiffOps`: for `P=x, Q=y` (source) → `div(1,1)≈2`, `curl(1,1)≈0`; for `P=-y, Q=x` (vortex) → `div(1,1)≈0`, `curl(1,1)≈2`; for `P=x^2-y^2, Q=2*x*y` → `div≈4x`, `curl≈0` (analytic harmonic) at a sample point. Uses `compileCustom2` to build `P`/`Q`.
  - `wireCustomInput2` (happy-dom): both non-empty → `onSubmit(pSrc, qSrc)`; one empty → no submit; `setFields`/`setMsg` write `.value`/`textContent`.
- E2E (`e2e/vector-custom.spec.js`): for each of the three playgrounds, `?exprP=…&exprQ=…` → `#customPill` on, `#challenge` hidden, both `#customP`/`#customQ` values reflected; hostile in `P` (or `Q`) → inline error, no entry, no console error; Copy-link round-trips both `exprP`/`exprQ`.
- Existing suites stay green (the shared additions are additive; no change to `compileCustom2`/`numericPartials`).

## Scope / YAGNI

- Three playgrounds; `F=(P,Q)`; numeric `div`/`curl`; challenge hidden uniformly; fixed extent.
- **No** analytic div/curl, **no** user-set domain, **no** vector potentials or higher operators.

## Rough shape

~5 tasks, one plan:
1. `engine/custom-fn.js` — `vectorDiffOps` + `wireCustomInput2` + tests.
2. vector-fields custom `F` (URL + entry + two-field input + pill + challenge-hide).
3. curl-divergence custom `F`.
4. greens-theorem custom `F`.
5. E2E for all three.

## Out of scope (future)

- Anything beyond the custom-expression arc, which this phase completes.
- Analytic (symbolic) vector operators; vector potentials; 3-D fields.
