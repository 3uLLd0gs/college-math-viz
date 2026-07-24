# Phase 2 — Differentiation Drill Subsystem — Design

**Status:** Approved (brainstorm 2026-07-24)
**Predecessor:** Phase 1 (deep-linking, a11y, self-checks, cross-links, presenter/print, export-import) — shipped to `main`.
**This is a new subsystem**, gated behind its own brainstorm per the writing-plans scope rule. It generates procedural problems, checks free-form answers for mathematical equivalence, and ladders hints — none of which a playground does.

---

## Goal

A practice-drill engine for a *procedural* skill (where a picture does not help), proving the pattern with one topic: **differentiation rules** (chain / product / quotient on elementary functions). A student is shown a randomized `d/dx[...]` problem, types a free-form derivative, and the app judges it correct by **mathematical equivalence** (not string match), revealing hints one rung at a time.

## The load-bearing design decision (keeps it honest)

**We never symbolically differentiate anything.** Each problem is built from a template where both `f` and its derivative `f′` are known *by construction*. For example the product template picks two elementary factors `A`, `B` (each with a known derivative) and emits:

- `f = A·B`
- `f′ = A′·B + A·B′`

as strings, together. The only runtime math is: parse the student's typed answer and **numerically compare** it to the known `f′`. No computer-algebra system, no symbolic differentiation of arbitrary input. This is what makes the answer-checker small, offline, and honest about its limits.

## Settled decisions (from the brainstorm)

1. **First topic:** differentiation rules (answers normalize cleanly; highest-value T4 row).
2. **Equivalence checking:** numeric probing — evaluate both expressions at several random points, skipping singularities; agreement at enough valid points ⇒ equivalent. Handles every algebraic rearrangement (`2x·sin x + x²·cos x` ≡ `x(2 sin x + x cos x)`). Not symbolic — it cannot explain *why* an answer is wrong, only that it is.
3. **Expression evaluator:** hand-rolled tiny parser (zero dependencies, matches the project's deliberate no-runtime-dependency stance; auditable; tested against hostile input). Shared with Phase 3's custom-expression feature.
4. **Placement:** a new "Practice" course in the sequencer; drills render as landing-page cards and nav entries alongside the concept playgrounds, reusing all Phase 1 plumbing.
5. **Seeded sharing:** yes — `?seed=1234` reproduces an exact problem sequence via the seeded RNG and the existing deep-link mechanism; no seed ⇒ fresh randomized set.

## Global constraints (inherited, binding)

- **No runtime network calls; no backend.** Everything offline; state and sharing ride on localStorage and the URL.
- **No `eval` / `Function` on any user-supplied string.** The expression evaluator is a whitelist parser that returns a numeric evaluator, never executing JS.
- **Design system fixed.** Colours from `engine/tokens.css`; new shared CSS in `engine/chrome.css`, page-specific in the page's own `<style>`. `chrome.css` linked, never `@import`ed into a `<style>`.
- **TDD for every pure module**; canvas/DOM behavior verified by Playwright.
- **Conventional commits**, messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Modules

Each pure module is tested against known values before wiring.

### `engine/expr.js` (shared foundation — also used by Phase 3)
- Tokenize a source string → tokens; reject any character outside the grammar.
- Recursive-descent / Pratt parse → AST of nodes: number, variable, unary minus, binary op (`+ − * / ^`, with `^` right-associative and correct precedence), function call.
- Whitelist only: variable `x`; functions `sin cos tan exp ln sqrt` (and `abs`); constants `pi`, `e` optional. Any unknown identifier or function name ⇒ `ExprError` (never silently accepted).
- Public interface:
  - `compile(src) -> (scope) => number` — returns an evaluator; `scope` supplies `{ x }`.
  - `parse(src) -> AST` and `evaluate(ast, scope) -> number` if the shell needs the tree.
  - `ExprError` — thrown on tokenize/parse/whitelist failure.
- **No `eval`, no `Function`, no property access on host objects.** Evaluation dispatches over the AST node type against a fixed function table.

### `engine/equiv.js`
- `equivalent(a, b, opts) -> boolean` where `a`, `b` are expression source strings (or compiled evaluators), `opts = { vars = ['x'], samples = 12, minValid = 6, tol = 1e-9, range = [-3, 3] }`.
- Compile both; evaluate at `samples` random points in `range` (seeded or Math.random — deterministic seed injectable for tests); discard a point if either side is non-finite (pole/domain edge). Require agreement (relative tolerance `tol`) at `≥ minValid` valid points ⇒ equivalent; too few valid points ⇒ resample once, else `false`.
- Honest scope, documented: probabilistic, not a proof; false positives made negligible by point count; never claims to explain a mismatch.

### `engine/drill/rng.js`
- `makeRng(seed) -> () => number` in `[0,1)` — a small deterministic PRNG (e.g. mulberry32). Helpers: `int(rng, lo, hi)`, `pick(rng, array)`.
- Determinism is the contract: same seed ⇒ same sequence. Tested.

### `engine/drill/differentiation.js`
- `nextProblem(rng) -> Problem` where
  `Problem = { id, promptText, fExpr, answer, rule, steps: string[] }`.
  - `promptText`: e.g. `d/dx [ x² · sin(x) ]`.
  - `fExpr`: the function as an `engine/expr`-parseable string.
  - `answer`: the reference derivative `f′` as an `engine/expr`-parseable string, emitted from the template (not computed by differentiating `fExpr`).
  - `rule`: `'product' | 'quotient' | 'chain'`.
  - `steps`: the hint ladder — `[method, first step, full worked solution]`.
- Templates compose a small factor alphabet: `x^n` (n small int), `sin x`, `cos x`, `exp x` (`e^x`), `ln x`, each with its known derivative. Product = two factors; quotient = two factors; chain = outer(inner) with inner a simple polynomial/trig.

### `engine/drill/hints.js`
- `makeHintLadder(steps) -> { reveal(), revealed: string[], done: boolean }` — pure state machine that reveals one step per `reveal()` call. Tested independently of the DOM.

### `engine/drill/drill-shell.js`
- Input-driven UI analogous to a playground's chrome: renders the prompt, an answer `<input>`, a **Check** button, a **Hint** button, a **Next** button, and a streak/score readout (reuses `engine/score-shell`).
- On Check: `parse` the student's input (catching `ExprError`), run `equivalent(input, problem.answer)`, mark right/wrong, update streak/score, and surface any parse failure inline ("couldn't read that expression") — no modal dialogs.
- On Hint: advance the ladder. On Next: pull `nextProblem(rng)`.

## The page

`drills/differentiation-rules/`:
- `index.html` — links `engine/chrome.css`; a short intro; the drill shell's mount points; the `#present` toggle (Phase 1) in the header.
- `drill.js` — reads `?seed` (via `URLSearchParams` / the deep-link reader), builds `makeRng(seed ?? randomSeed)`, mounts `drill-shell` with the differentiation generator, calls `mountPresenter()` last (Phase 1 parity).

## Integration (reuses Phase 1)

- `engine/sequencer.js`:
  - Add `{ id: 'practice', label: 'Practice' }` to `COURSES`.
  - Add a catalogue entry for the drill with a new `kind: 'drill'` field (existing playground entries are implicitly `kind: 'playground'`).
  - `hrefFor(slug)` returns `/drills/<slug>/` for `kind:'drill'`, `/playgrounds/<slug>/` otherwise.
  - `mountNav` and the landing page iterate courses already, so the Practice course and its card/menu render with no further change.
- `vite.config.js`: add `drills/differentiation-rules/index.html` to the multi-page `rollupOptions.input` map.

## Data flow

```
?seed ──► makeRng(seed) ──► differentiation.nextProblem(rng)
                                   │  { promptText, fExpr, answer, rule, steps }
                                   ▼
                          drill-shell renders prompt
                                   │  student types g
        Check ──► expr.parse(g) ──► equiv(g, answer) ──► right / wrong ──► score/streak
        Hint  ──► hints.reveal()  (method → first step → full solution)
        Next  ──► rng advances ──► next problem
```

## Error handling

- Unparseable student input ⇒ inline message, not counted as a hard failure crash; no `alert/confirm/prompt`.
- `equiv` skips singular sample points; degenerate sampling resamples once before returning `false`.
- Hostile input is inert: the whitelist parser rejects unknown identifiers, property access, and any non-grammar character before evaluation; there is no path to `eval`/`Function`.

## Testing

- `engine/expr.test.js` — grammar, operator precedence & associativity, whitelist enforcement, numeric correctness, and hostile inputs (`alert(1)`, `x.constructor`, `__proto__`, `1;2`, unbalanced parens) all rejected without executing.
- `engine/equiv.test.js` — equivalent rearrangements pass; genuinely different expressions fail; pole handling; tolerance boundaries.
- `engine/drill/rng.test.js` — same seed ⇒ same sequence; basic spread.
- `engine/drill/differentiation.test.js` — **generator self-check:** for each of many seeds, numerically differentiate the emitted `fExpr` (`(f(x+h)−f(x−h))/2h`) at sample points and confirm it matches the emitted `answer` via `equiv` — any template bug fails here. Also assert `steps.length ≥ 2` and `rule` ∈ the three.
- `engine/drill/hints.test.js` — ladder reveals one at a time, `done` flips correctly.
- E2E (`e2e/drills.spec.js`) — type the exact answer ⇒ marked right; type an equivalent rearrangement ⇒ right; type a wrong answer ⇒ wrong; Hint reveals the ladder; `?seed=<n>` renders the same first prompt across two page loads.

## Scope / YAGNI

- **One topic** (differentiation rules), three rules (product, quotient, chain), a small factor alphabet. Not exhaustive.
- **No "why you're wrong" symbolic diagnosis** — equivalence verdict + hint ladder only. Dynamic per-error hints are explicitly out.
- No accounts, no server, no LMS.

## Rough shape

~8–9 tasks, one detailed plan:
1. `engine/expr.js` + tests
2. `engine/equiv.js` + tests
3. `engine/drill/rng.js` + tests
4. `engine/drill/differentiation.js` + tests (with the numeric self-check)
5. `engine/drill/hints.js` + tests
6. `engine/drill/drill-shell.js`
7. `drills/differentiation-rules/` page + `drill.js` (seed + presenter wiring)
8. Sequencer / landing / nav / `vite.config.js` integration
9. E2E suite for the drill

## Out of scope (future phases)

- Additional topics (factoring, integration, trig identities) — each a later plan reusing this engine.
- Phase 3 custom-expression registry — will reuse `engine/expr.js`.
