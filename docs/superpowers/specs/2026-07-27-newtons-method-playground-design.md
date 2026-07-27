# New Playground — Newton's Method — Design

**Status:** Approved (brainstorm 2026-07-27)
**Context:** The first *new concept* playground since the site's improvement arc (Phases 1–6). It must ship with FULL FEATURE PARITY with the existing 11 playgrounds — every capability sharpened over the last several days.

---

## Goal

An interactive Newton's-method playground (Calc 1): drag a starting point `x₀`, step the tangent-line iteration, and watch `|f(xₙ)| → 0` — or watch it cycle, fling, or jump basins. Built on the existing `Grapher2D` renderer and the full shared playground toolkit.

## Settled decisions (from the brainstorm)

1. **Topic:** Newton's method. **Renderer:** `Grapher2D` (no new renderer). **Course:** Calc 1.
2. **Emphasis:** convergence *and* the famous failure modes — the registry includes a well-behaved case, a `f′=0` fling, a basins-of-attraction cubic, and the classic 2-cycle.
3. **Placement:** in Calc 1 after Secant → Tangent (Newton is repeated tangent-following), with `prereq: secant-tangent`.
4. **Feature parity is a hard requirement** (see the dedicated section) — the new page is a first-class citizen, not a stripped-down demo.

## Feature parity (binding requirement)

The new playground MUST include every capability the existing playgrounds have:

- **Deep-linking:** `URL_SCHEMA = { fn, x0, n }`; `applyState(st)` seam; `urlState()`; `pushUrl = makeUrlSync(() => stateToParams(urlState()))`; a Copy-link button using `syncedUrl`; on-load `readState`/`applyState`.
- **Keyboard + ARIA:** `keyboardControl` on the graph canvas (arrows nudge `x₀`, +/− step `n`, Home resets); `#graph` canvas has `role="img"`, `aria-label`, `aria-describedby="readout"`; `#readout` has `role="status" aria-live="polite"`.
- **Presenter mode + print:** `#present` toggle button (a header child, outside `.scoreboard`); `mountPresenter()` called last; the shared `body.present` and `@media print` CSS already cover a standard page.
- **Lesson panel:** `mountLesson(LESSON, { slug, onJump: applyState, links: neighbours('newtons-method') })`; a `LESSON` with intuition/use/deep prose levels, prose `jump` steps that drive the view, **one formative self-check** (`check` step MCQ that drives the view), and the cross-concept "Builds on / Leads to" line.
- **Scoreboard + challenge + rewards:** `ScoreShell` (`#s-pts`/`#s-streak`/`#s-badges`), a `challengeMeter`, and badge/award calls on meaningful actions.
- **Sequencer / landing / nav:** a `PLAYGROUNDS` entry `{ slug:'newtons-method', course:'calc1', title, tag, blurb, prereq:'secant-tangent' }` so it renders on the landing page and in the in-page nav automatically.
- **Build:** a `vite.config.js` `rollupOptions.input` entry.
- **Tests:** `content.test.js` (math correctness, TDD) + E2E — the new slug added to the existing `e2e/jumps.spec.js` and `e2e/deep-link.spec.js` slug lists, plus a Newton-specific E2E spec.

## Global constraints (inherited, binding)

- **No runtime network calls inside a playground; no backend.** Everything self-contained; math is Unicode in `<code>`.
- **Design system fixed.** Colours from `engine/tokens.css`; shared CSS in `engine/chrome.css` (linked, never `@import`ed); page-specific CSS in the page's own `<style>`.
- **TDD for the pure math layer** (`content.js` via `content.test.js`); canvas behavior verified by Playwright.
- **Conventional commits**; messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `newtons-method-playground` (off `main`). **Slug:** `newtons-method` (verbatim).

## Files

- Create `playgrounds/newtons-method/content.js` — `FUNCTIONS` registry, Newton math helpers, `LESSON`.
- Create `playgrounds/newtons-method/content.test.js` — math correctness.
- Create `playgrounds/newtons-method/index.html` — the page (mirrors the standard playground anatomy).
- Create `playgrounds/newtons-method/playground.js` — wiring.
- Modify `engine/sequencer.js` — the catalogue entry (with `prereq`).
- Modify `vite.config.js` — build input.
- Modify `e2e/jumps.spec.js`, `e2e/deep-link.spec.js` — add the slug; Create `e2e/newtons-method.spec.js`.

## Registry & math (`content.js`)

`FUNCTIONS`: `{ id, label, tex, f, df, roots, view, challenge, note? }`.

| id | `label`/`tex` | `f(x)` | `df(x)` | roots | showcases |
|---|---|---|---|---|---|
| `cosx` | `cos x − x` | `Math.cos(x)-x` | `-Math.sin(x)-1` | `[0.7390851]` | well-behaved — converges from anywhere |
| `quad` | `x² − 2` | `x*x-2` | `2*x` | `[−√2, √2]` | computes √2 fast; **fling** at `x₀=0` (f′=0) |
| `cubic` | `x³ − x` | `x**3-x` | `3*x*x-1` | `[−1, 0, 1]` | **basins** — nearby starts → different roots |
| `cycle` | `x³ − 2x + 2` | `x**3-2*x+2` | `3*x*x-2` | `[−1.7692924]` | famous **2-cycle** from `x₀=0` (0↔1 forever) |

Math helpers (pure, exported, tested):
- `newtonStep(fn, x)` → `x - fn.f(x)/fn.df(x)` (the single iteration).
- `newtonRun(fn, x0, steps)` → array `[x0, x1, …, x_steps]` (applies `newtonStep` repeatedly; a step where `|fn.df(x)| < EPS` marks a fling — the run records it as the last finite point / flags `flung`).
- `nearestRoot(fn, x)` → the registry root closest to `x` (for the challenge/basin readout).

`newtonStep`/`newtonRun` never throw on `f′≈0`; they surface a `flung`/non-finite outcome the UI reports.

## Rendering (`Grapher2D`)

`render()` draws: the curve `f`; the x-axis roots as small ticks; the iterate points `x₀…xₙ` on the curve; the **tangent at the current `xₙ`** (dashed) and its **drop-line** to `xₙ₊₁` on the axis; the current point highlighted. The panel readout (numeric, `innerHTML` of controlled values only): `xₙ`, `f(xₙ)`, `|f(xₙ)|`, step count, and a status word (converging / converged / cycling / flung / diverging). A log-scale **inset** plots `|f(xₖ)|` vs `k`.

Controls: a function `buttonGroup` (`#fbtns`); a step slider `#n` (0…`MAX_STEPS`) and a "▸ Iterate → root" ticker (auto-advances `n`, mirroring Riemann's refine); `x₀` is dragged on the canvas and nudged by the keyboard. Reset returns `x₀` to the function's default start and `n=0`.

## Challenge & lesson

- **Challenge (`challengeMeter`):** reach a root — `value = |f(xₙ)|`, `tol = ROOT_TOL`; solved when `|f(xₙ)| < tol`; `onSolve` awards points (bonus for fewer steps) and a badge. When the current function/start is a known non-converger (the `cycle` from 0, the `quad` fling from 0), the meter's hint text says so rather than dangling an unwinnable goal.
- **Lesson:** intuition ("follow the tangent to the axis, repeat"), use (prose jumps that set `fn`/`x₀`/`n` to show a fast convergence and a wrong-basin landing), deep (the failure modes). **Self-check** (one, `use` level): e.g. "You start Newton's method exactly at a point where `f′(x₀)=0`. What happens to `x₁`?" with options driving the view to the fling case.
- **Cross-concept links:** `prereq: secant-tangent` (Newton is repeated tangent-following); "Leads to" resolves via the sequencer's `next()`.

## Data flow

```
?fn,x0,n  OR  drag x₀ / step n / pick function
     │
  state {fn, x0, n} → newtonRun(fn, x0, n) → iterate points
     │
  render (curve, tangent at xₙ, drop-line, iterates, inset) + readout + challenge
     │
  pushUrl(fn, x0, n)   ·   lesson jumps / self-check call applyState
```

## Error handling

- `f′(xₙ) ≈ 0` → `newtonStep` returns a non-finite / flagged result; the renderer stops drawing further tangents and the readout says "flung — the tangent was nearly flat." No crash.
- A start that diverges/cycles → the readout/inset show it; the challenge hint acknowledges it.
- Deep-link `x0`/`n` out of range → clamped to the view / `[0, MAX_STEPS]`.

## Testing

- `content.test.js`:
  - `newtonStep(quad, 1)` moves toward √2; `newtonRun(quad, 1, 8)` last point ≈ `√2` (within 1e-6).
  - `newtonRun(cosx, 1, 8)` last point ≈ `0.7390851`.
  - `newtonRun(cycle, 0, 6)` alternates ≈ `[0,1,0,1,0,1,…]` (the 2-cycle) and does NOT approach the real root.
  - each `df` matches a central-difference of `f` at sample points; each listed root satisfies `|f(root)| < 1e-9`.
  - `nearestRoot(cubic, 0.4)` → `0` (nearest of −1/0/1).
- E2E:
  - Add `'newtons-method'` to `e2e/jumps.spec.js` and `e2e/deep-link.spec.js` slug lists (so the lesson-jump and deep-link invariants cover it).
  - `e2e/newtons-method.spec.js`: `?fn=quad&x0=1&n=8` shows a converged readout near `√2`; the "Iterate" control advances `n` and `|f(xₙ)|` shrinks in the readout; a deep-link with the `cycle` case shows the cycling status; Copy-link round-trips `fn`/`x0`/`n`.

## Scope / YAGNI

- One playground; `Grapher2D`; four functions. Full feature parity. No new renderer, no basin-strip fractal (the basins case is taught via the `cubic` registry entry + lesson, not a rendered strip).

## Out of scope (future)

- A rendered basins-of-attraction strip; secant-method or Halley's-method variants; custom `f(x)` (would reuse the `engine/custom-fn.js` seam — a later phase if wanted).
