# Phase 3 — Custom Expressions (riemann-sums) — Design

**Status:** Approved direction (brainstorm 2026-07-24)
**Predecessors:** Phase 1 (deep-linking, a11y, self-checks, cross-links, presenter/print, export-import) and Phase 2 (differentiation-drill subsystem + `engine/expr.js` safe evaluator) — both shipped to `main`.
**This is the final piece of the 3-phase improvement plan.** It reuses the Phase-2 safe expression evaluator to let a professor demonstrate *their own* function, rather than only the built-in registry.

---

## Goal

Let a professor add a custom function `f(x)` to the **riemann-sums** playground via an in-page input (and shareable URL), integrated numerically over a domain they choose. This proves the extensibility pattern — untrusted expression → safe parse → registry entry → plot + Riemann sum — with the smallest honest surface. Rollout to other playgrounds is a future phase.

## The security crux (what this phase is really about)

The custom expression is **untrusted input** (it arrives from a URL parameter a stranger could craft). It must reach executable form **only** through the Phase-2 `engine/expr.js` whitelist parser — never `eval`/`Function`, and never injected into the DOM as markup. The raw expression string is safe in exactly three places:

1. passed to `expr.compile(src)` (the whitelist parser; rejects anything outside the grammar),
2. assigned to an `<input>.value` (inert text),
3. shown as a label via `textContent` (never `innerHTML`).

The design commits to those three and no others. A hostile `?expr=<script>…` or `?expr=alert(1)` is rejected at parse time (the `<` never tokenizes; `alert` isn't whitelisted) and never touches the DOM as markup.

## Settled decisions (from the brainstorm)

1. **Scope:** riemann-sums only. Custom `f(x)`, single variable `x`, **no challenge** (a custom function has no known exact integral, so it is demonstration, not assessment).
2. **Entry UI:** an in-page input row (expression field + `from`/`to` domain fields) that syncs to the URL, so Copy-link shares the exact demo. Not URL-only.
3. **Domain:** settable `from`/`to` number fields, default `[0, 2]`, synced to `?a=…&b=…`. The domain is central to a Riemann demo (e.g. integrate `1/x` over `[1,3]` to avoid the pole at 0).
4. **Parser surface:** single variable `x` only — no extension to two variables and no derivative estimation (those are the hard tier, deferred).

## Global constraints (inherited, binding)

- **No `eval`/`Function` on any user string.** `engine/expr.js` is the sole evaluation path.
- **Never inject a user string into the DOM as markup.** Display via `textContent`/`.value` only.
- **No runtime network calls; no backend.** State/sharing ride on localStorage and the URL.
- **Design system fixed.** Colours from `engine/tokens.css`; shared CSS in `engine/chrome.css` (linked, never `@import`ed); page-specific CSS in the page's own `<style>`.
- **TDD for pure modules**; DOM/page behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase3-custom`.

## Existing structure this builds on

- `playgrounds/riemann-sums/content.js` exports `INTEGRANDS` — entries shaped `{ id, label, tex, f: x=>number, a, b, exact, tol }`. `exact`/`tol` drive the built-in challenge; a custom entry omits them.
- `playgrounds/riemann-sums/playground.js` wires a `Grapher2D`, a `buttonGroup` over `INTEGRANDS` (the function pills), a slider for `n`, a rule `buttonGroup`, a `challengeMeter` (reads `exact`/`tol` of the current integrand), the deep-link seam (`URL_SCHEMA = {fn, rule, n}`, `applyState`, `pushUrl`, Copy-link), `keyboardControl`, `mountLesson`, `mountPresenter`.
- `engine/expr.js` exports `compile(src) -> (scope)=>number`, `parse`, `ExprError` (whitelist: `x`, `pi`, `e`, `sin cos tan exp ln sqrt abs`, `+ - * / ^`, unary `-`, parens; null-prototype tables).

## Modules

### `engine/custom-fn.js` (new — the reusable extensibility seam)
- `compileCustom(src) -> { f, error }`:
  - `f`: a `x => number` evaluator on success, else `null`.
  - `error`: a friendly string on failure (`''` on success).
  - Implementation: `try { const g = compile(src); }` (from `engine/expr.js`) → on `ExprError`, return `{ f: null, error: "Couldn't read that expression." }`. On success, **sample-guard**: evaluate `g({x})` at a few points across a default range; if it is non-finite at *every* sampled point (e.g. `sqrt(x)` sampled only at negatives, or a constant `NaN`), return `{ f: null, error: "That function isn't a real number anywhere here." }`. Otherwise return `{ f: g, error: '' }`.
  - Wraps `f` so a per-point throw or non-finite value returns `NaN` rather than throwing (the caller's plot/sum already tolerates `NaN`/`Infinity`).
- This is the documented seam future playgrounds reuse; it is playground-agnostic (knows nothing about `a`/`b` or Riemann sums).

### `playgrounds/riemann-sums/playground.js` (modify)
- `URL_SCHEMA` gains `expr: 'string'`, `a: 'number'`, `b: 'number'`.
- A working integrand list = `INTEGRANDS` plus, when a valid custom function exists, a custom entry `{ id: 'custom', label: 'your f(x)', tex: <expr>, f, a, b, custom: true }` (no `exact`/`tol`).
- `applyState(st)`: if `st.expr` is present, `compileCustom(st.expr)` → on success build/replace the custom entry (with `a = st.a ?? 0`, `b = st.b ?? 2`), select it, render; on failure show the inline error and leave the prior selection. The custom pill appears in the function `buttonGroup` when a custom entry exists.
- Challenge: when the selected integrand is `custom` (has no `exact`), **hide/disable** the challenge meter (custom = demonstration).
- `pushUrl` writes `expr`/`a`/`b` alongside `fn`/`rule`/`n`, composing with the existing deep-link (and `present`). The custom `tex`/label is set via `textContent`; the raw `expr` is only ever a parser input, an `<input>.value`, or `textContent`.

### `playgrounds/riemann-sums/index.html` (modify)
- A custom input row in the panel: an expression text field (`#customExpr`), `from`/`to` number inputs (`#customA`/`#customB`), and an inline message element (`#customMsg`). Styled with existing tokens; page-specific CSS in the page's own `<style>`.

## Data flow

```
?expr,a,b  (on load)   OR   in-page typing/change
              │
      compileCustom(expr) → { f, error }
        │ ok                         │ error
   entry {id:'custom', f, a, b}      inline #customMsg,
   → add pill, select, render        no entry, keep prior state,
   → hide challenge                  field retains text for editing
   → pushUrl(expr, a, b)
```

## Error handling

- Unparseable / hostile `expr` (`alert(1)`, `<script>…`, `__proto__`, `x.constructor`) → rejected by `engine/expr.js`; inline `#customMsg` message; no entry created; no DOM markup injection.
- `f` non-finite across the whole sample range → inline "isn't a real number anywhere here"; no entry.
- `a >= b` → clamp/guard with a gentle inline note (default to a valid interval); do not integrate a degenerate range.
- Domain singularities inside `[a,b]` (e.g. `1/x` over an interval crossing 0) are the professor's to frame via `from`/`to`; the existing renderer already tolerates large/`Infinity` sample values, and the readout surfaces the numeric result.

## Testing

- `engine/custom-fn.test.js`:
  - `compileCustom('x^2').f(3)` → `9`; `error` is `''`.
  - `compileCustom('1/x').f` is a function (finite off 0).
  - `compileCustom('alert(1)')` → `{ f: null, error: <non-empty> }`; same for `'__proto__'`, `'x.constructor'`, `'<script>'`, `'1;2'` (delegates to `expr.js` rejection — no execution).
  - a function non-finite across the sample range → `{ f: null, error: <non-empty> }`.
  - the returned `f` yields `NaN` (not a throw) at a domain point where the expression is undefined.
- E2E (`e2e/custom-fn.spec.js`):
  - `/playgrounds/riemann-sums/?expr=x^2&a=0&b=2` → a custom entry is present and selected; the Riemann readout approaches ≈ `2.667` as `n` grows.
  - `?expr=alert(1)` → the inline error shows and NO custom entry/pill is created; no console errors.
  - typing a valid expression in `#customExpr` updates the URL (`?expr=…`) and the plot; the challenge meter is hidden while custom is selected.
  - Copy-link round-trips `expr`/`a`/`b` through a fresh page load (the custom demo reproduces).

## Scope / YAGNI

- **riemann-sums only.** Single variable `x`. **No challenge** for custom. **No** two-variable parser, **no** derivative estimation.
- Rollout to solids-of-revolution / secant-tangent (single-var) and partial-derivatives / gradient (two-var) is explicitly a **future phase**, each its own plan reusing `engine/custom-fn.js`.

## Rough shape

~4–5 tasks, one plan:
1. `engine/custom-fn.js` + tests.
2. riemann-sums integration: `URL_SCHEMA` + `applyState` custom entry + custom pill + challenge-hide.
3. riemann-sums in-page custom input row (`index.html` + wiring, inline error, URL sync of `expr`/`a`/`b`).
4. E2E suite.

(Tasks 2 and 3 may split or merge during planning depending on reviewable boundaries.)

## Out of scope (future phases)

- Custom expressions on any other playground.
- Two-variable (`f(x,y)`) support and numeric partial derivatives.
- Any challenge/assessment for custom functions.
- Real accounts, LMS/LTI, or any backend.
