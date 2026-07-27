# Phase 4 — Custom Expressions Rollout (solids-of-revolution + secant-tangent) — Design

**Status:** Approved (brainstorm 2026-07-26)
**Predecessor:** Phase 3 (custom expressions on riemann-sums, via `engine/custom-fn.js` + `engine/expr.js`), shipped to `main`.
**This phase** extends the custom-`f(x)` feature to two more single-variable playgrounds, factoring the genuinely-common pure logic into shared, tested helpers.

---

## Goal

Let a professor supply a custom `f(x)` on **solids-of-revolution** (a profile to revolve) and **secant-tangent** (a curve whose derivative the secant chases), reusing the Phase-3 safe-evaluation and URL machinery. Extract the reusable pure pieces into `engine/custom-fn.js` so the three integrations share one tested implementation of each, without forcing a heavyweight abstraction over playgrounds that genuinely differ.

## Settled decisions (from the brainstorm)

1. **Scope:** two single-variable playgrounds — solids-of-revolution and secant-tangent. NO two-variable playgrounds (partial-derivatives / gradient) — those need a parser extension to `y` and numeric partials, deferred to a later phase. `engine/expr.js` is unchanged this phase.
2. **Sharing:** light shared PURE helpers in `engine/custom-fn.js` (each unit-tested); each playground keeps its own thin integration, because the three genuinely differ (domain vs none, hide vs keep challenge, numeric `df` vs not). No heavyweight `mountCustomFn` state machine.
3. **secant-tangent keeps its challenge:** the custom entry carries a numeric derivative (`df = numericDerivative(f)`), so the secant still converges to a valid reference and the error meter/challenge stay meaningful.
4. **solids hides its challenge:** a custom profile has no known closed-form volume (`region.exact`), so — like riemann — the challenge is hidden for custom.
5. **riemann backfill:** riemann's inline `customView` is *extracted* into the shared `viewFromDomain` (behavior-preserving) so there is one tested copy, not a duplicate.

## Global constraints (inherited, binding)

- **No `eval`/`Function` on any user string.** `engine/expr.js` (via `compileCustom`) is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** The expression is displayed via `textContent` and set via `<input>.value` only — never `innerHTML`.
- **No runtime network calls; no backend.** State/sharing ride on localStorage and the URL.
- **Design system fixed.** Colours from `engine/tokens.css`; shared CSS in `engine/chrome.css` (linked, never `@import`ed); page-specific CSS in the page's own `<style>`.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase4-custom-rollout`. **Custom entry id:** `custom` (verbatim).

## Existing structure this builds on

- `engine/custom-fn.js` exports `compileCustom(src) -> { f, error }` (Phase 3).
- `engine/deep-link.js` `syncedUrl`/`makeUrlSync` accept a `managed` key list (Phase 3) so optional URL params drop cleanly.
- **riemann-sums** (`playgrounds/riemann-sums/playground.js`) is the reference integration: `URL_SCHEMA` incl. `expr/a/b`, `activateCustom`/`selectCustom`/`deactivateCustom`, a `#customPill` appended to `#fbtns`, an in-page input row, a custom `render()` branch, `managed` URL sync, and an inline `customView(f,a,b)` to extract.
- **solids-of-revolution** (`content.js` `REGIONS`, shape `{ id, label, tex, f, a, b, exact:{x,y}, [g], [note] }`; `playground.js` `URL_SCHEMA = { region, axis, n }`, a `challengeMeter` reading `region.exact[axis]`, a 3-D camera `view.cam`, `buttonGroup('fbtns', REGIONS, …)`).
- **secant-tangent** (`content.js` `FUNCTIONS`, shape `{ id, label, tex, f, df, probe, view }`; `secantSlope`, `slopeError` use `fn.f`/`fn.df`; `playground.js` `URL_SCHEMA = { fn, x0, h }`, `challengeMeter` using `fn.df(x0)`, `buttonGroup('fbtns', FUNCTIONS, …)`).

## Shared helpers (added to `engine/custom-fn.js`)

Each is pure and unit-tested before wiring.

- **`viewFromDomain(f, a, b) -> { xmin, xmax, ymin, ymax }`** — samples `f` across `[a,b]` for a finite y-range, pads x and y, includes `y = 0`; falls back to `[-1,1]` when all samples are non-finite or `lo === hi`. This is riemann's current `customView` logic, relocated. Consumed by riemann (backfill) and secant-tangent.
- **`numericDerivative(f, eps = 1e-5) -> (x) => number`** — central difference `(f(x+eps) − f(x−eps)) / (2·eps)`; returns `NaN` when either sample is non-finite. Consumed by secant-tangent as the custom `df`.
- **`wireCustomInput({ exprEl, aEl, bEl, msgEl, onSubmit }) -> { setFields, setMsg }`** — attaches `input`+Enter on `exprEl` and `change` on `aEl`/`bEl` (when provided), each calling `onSubmit(src, a, b)` (empty `src` clears the message and does not submit); `setFields(src, a, b)` writes the fields via `.value` (guarded, only when changed, to avoid cursor jank); `setMsg(text)` writes `msgEl.textContent`. `aEl`/`bEl` are optional (secant-tangent omits them; `a`/`b` come back `undefined`).

## solids-of-revolution integration

- `index.html`: `id="challenge"` on the challenge card; a custom input row (`#customExpr`, `#customA`, `#customB`, `#customMsg`); page-local `.custom-*` CSS.
- `playground.js`:
  - `URL_SCHEMA` += `expr:'string', a:'number', b:'number'`.
  - `compileCustom`, `wireCustomInput` imported from `engine/custom-fn.js`.
  - a custom `#customPill` (id set) appended to `#fbtns`; `activateCustom(src,a,b)` builds `{ id:'custom', label:'◆ custom', tex:src, f, a, b, custom:true }`, guards `b<=a`, selects it (`fnButtons.select(-1,{notify:false})`, pill `.on`), hides the challenge, renders, pushes URL; `deactivateCustom()` on built-in select restores the challenge.
  - `render()` custom branch: revolve the custom profile over `[a,b]` about the current axis; readout writes `fn.tex` via a `.cx` `textContent` span (never `innerHTML`); `#challenge` `display:none` and RETURN before `meter.update`.
  - `urlState()` emits `expr/a/b` (and `region:'custom'`) only when custom active; `pushUrl`/Copy-link pass `{ managed: Object.keys(URL_SCHEMA) }`.
  - `applyState` handles `expr` last; `wireCustomInput` wired to `activateCustom`, field consts declared before the on-load `readState`/`applyState`.

## secant-tangent integration

- `index.html`: a custom input row (`#customExpr`, `#customMsg` — NO from/to); page-local CSS. (The challenge card stays; no `id` change needed unless the page lacks one — add `id="challenge"` only if hiding is ever required; here it is NOT hidden.)
- `playground.js`:
  - `URL_SCHEMA` += `expr:'string'`.
  - `compileCustom`, `numericDerivative`, `viewFromDomain`, `wireCustomInput` imported.
  - a custom `#customPill` appended to `#fbtns`; `activateCustom(src)` builds `{ id:'custom', label:'◆ custom', tex:src, f, df: numericDerivative(f), probe: 0.8, view: viewFromDomain(f, -3, 3), custom:true }`, selects it (pill `.on`, `fnButtons.select(-1,{notify:false})`, `g.setView(entry.view)`), renders, pushes URL; `deactivateCustom()` on built-in select.
  - `render()` uses `fn.df(x0)` for the true tangent + `slopeError` exactly as today — with the numeric `df`, the tangent line, error readout, and challenge all work. The readout writes the custom `fn.tex` via a `.cx` `textContent` span; the built-in `tex` path is unchanged and unreachable on the custom branch.
  - `urlState()` emits `expr` only when custom active; `pushUrl`/Copy-link pass `{ managed: Object.keys(URL_SCHEMA) }`.
  - `applyState` handles `expr` last; `wireCustomInput` wired (no `aEl`/`bEl`).

## riemann backfill

Replace riemann's inline `customView(f,a,b)` with an import of `viewFromDomain` from `engine/custom-fn.js` (identical logic). Behaviour-preserving; guarded by the existing riemann E2E.

## Data flow (both playgrounds)

```
?expr[,a,b]  OR  in-page typing (wireCustomInput)
        │
   compileCustom(expr) → { f, error }
        │ ok                              │ error
   build entry (+df for secant)           setMsg(error), no entry,
   → select, render, pushUrl(managed)     keep prior state
   → solids: hide challenge;
     secant: keep challenge (numeric df)
```

## Error handling

- Unparseable / hostile `expr` → inline message, no entry, no DOM markup injection (rejected by `expr.js`).
- `f` non-finite across the sample range → `compileCustom` returns an error; no entry.
- solids `a >= b` → inline guard, no activation.
- secant-tangent numeric `df` at a pole (e.g. `1/x` at `x₀→0`) yields large/NaN slope — the existing renderer tolerates non-finite tangents; the professor frames `x₀` via the existing probe control.

## Testing

- `engine/custom-fn.test.js` adds:
  - `viewFromDomain`: finite range for `x^2` on `[0,2]`; degenerate (all-NaN) → `[-1,1]` fallback; includes `y=0`.
  - `numericDerivative`: matches `2x` for `x^2`, `cos` for `sin`, within a tight tolerance; `NaN` where `f` is undefined.
  - `wireCustomInput` (happy-dom): typing fires `onSubmit(src, …)`; empty input does not submit; `change` on a number field fires; the no-`aEl`/`bEl` case works; `setFields`/`setMsg` write `.value`/`textContent`.
- E2E (`e2e/custom-rollout.spec.js`):
  - solids `?expr=x&a=0&b=2` → custom pill selected, `#challenge` hidden, readout shows `x` via `.cx`.
  - secant-tangent `?expr=sin(x)&x0=0.7` → custom pill selected, `#challenge` still visible, the rendered tangent slope readout ≈ `cos(0.7)` (numeric `df`), readout shows `sin(x)` via `.cx`.
  - hostile `?expr=alert(1)` on both → inline error, no custom entry, no console error.
  - Copy-link round-trips the custom function on both.
- The existing riemann E2E must stay green after the `viewFromDomain` backfill.

## Scope / YAGNI

- Two playgrounds; single variable `x`. No two-variable parser, no partial derivatives, no new challenge types.
- riemann touched only to adopt the extracted `viewFromDomain`.

## Rough shape

~5 tasks, one plan:
1. `engine/custom-fn.js` — add `viewFromDomain` (extracted from riemann), `numericDerivative`, `wireCustomInput` + tests; backfill riemann to import `viewFromDomain`.
2. solids-of-revolution custom integration (URL + entry + pill + input row + challenge-hide + secure readout).
3. secant-tangent custom integration (URL + entry + numeric `df` + pill + input row + challenge-keep + secure readout).
4. E2E suite for both.
5. (folded into 2/3 if small) any page CSS + final full-suite/build pass.

## Out of scope (future phases)

- Two-variable `f(x,y)` on partial-derivatives / gradient (parser extension + numeric partials).
- Custom content on the remaining playgrounds (unit-circle, related-rates, vector-fields, curl-divergence, greens-theorem, taylor-series).
