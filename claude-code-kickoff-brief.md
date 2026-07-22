# Math Visualization Library — Build Brief for Claude Code

## What we're building
A library of standalone, interactive math playgrounds spanning **College Algebra → Calculus 3**. Each playground is a self-contained visual "aha" for one concept (Taylor series, partial derivatives, Riemann sums, gradients, …). The product runs almost entirely client-side: the intelligence went into *authoring* the playgrounds; at runtime they are deterministic HTML/JS with **no API calls and no external runtime dependencies**, so serving cost ≈ static hosting.

## What I'm giving you (attached / in this folder)
1. **`taylor-series-studio.html`** — reference template #1. The **2-D graph** family (covers College Algebra, Trig/Pre-Calc, Calc 1–2). Engine class: `Grapher2D`.
2. **`partial-derivative-explorer.html`** — reference template #2. The **3-D surface** family (covers Calc 3). Engine class: `Surface3D`.
3. **`college-math-viz-build-map.md`** — the backlog: every concept tagged with visualization value, a build tier (T1 flagship → T4 drill), and the specific interaction it needs.

**Read all three before proposing anything.** They define the design language, the code architecture, and the full scope.

## The architecture to preserve (this is the whole point)
Both templates are deliberately split into three layers. Keep this split religiously:

- **Engine** — reusable machinery. `Grapher2D` (2-D renderer) and `Surface3D` (3-D renderer) are the two engines; `ScoreShell` (points/streak/badges), `Confetti`, the CSS **design tokens**, and the small math/vector helpers are **shared by every playground**. In the templates these are currently duplicated inline — your first job is to extract them into shared modules imported by both.
- **Content** — the *only* part that changes per concept. A small registry per playground: the function(s), coefficients/partials, viewport, and challenge definition.
- **Playground** — thin per-concept wiring (event handlers + the render pass).

The design tokens + `ScoreShell` + `Confetti` are **byte-for-byte identical** across the two files today. Confirm that, then dedupe them into one source of truth. The failure mode we are explicitly avoiding is 55 drifting one-off playgrounds with copy-pasted, diverging engine code.

## Phase 1 — your task now
Stand up the repo and prove the full authoring → build → host loop on the two existing playgrounds:

1. **Propose** a repo structure and a minimal build stack, then — after I confirm — scaffold it. Bias toward **Vite + shared ES modules → static output**: this keeps zero runtime dependencies while enabling code sharing. Plain vanilla is fine; no heavy framework is needed.
2. **Extract the shared Engine** into modules, e.g.:
   - `engine/tokens.css` (the `:root` design tokens)
   - `engine/score-shell.js` (`ScoreShell`)
   - `engine/confetti.js` (`Confetti`)
   - `engine/grapher-2d.js` (`Grapher2D`)
   - `engine/surface-3d.js` (`Surface3D`)
   - `engine/math.js` (factorial, superscripts, 3-vector helpers, etc.)
3. **Refactor both templates** into `playgrounds/taylor-series/` and `playgrounds/partial-derivatives/`, each = an `index.html` + a `content.js` that imports from `engine/`. They must render and behave **identically to the originals** — verify visually.
4. Wire a **dev server** and a **static production build**.
5. **Deploy one playground to Cloudflare Pages** (my existing infra — Vercel is an acceptable alternative since I have that tooling too) and give me the URL. Proving the loop on a single artifact before we scale is the point of this phase.

**Definition of done for Phase 1:** repo scaffolded; one shared `engine/`; both playgrounds refactored to import from it and rendering identically; `dev` and `build` scripts working; one live deployed URL.

## Phase 2 — batch production (preview — do NOT start yet)
Work the build map tier by tier (T1 → T2 → T3). For each row: pick the right engine (2-D vs 3-D), write a new `content.js` + minimal wiring against the matching template, and **reuse the Engine untouched**. **T4 rows are drill generators** (randomized problems + scaffolded hints), not visualizations. Flag any row that needs a genuinely new engine capability — e.g. a `VectorField` renderer for Calc 3 vector fields / Green's theorem — so we build it deliberately as a third pattern rather than hacking it into an existing engine.

## Phase 3 — app shell + growth (preview)
A thin shell over the library: navigation by course/topic, per-user **progress persistence** (localStorage or Cloudflare KV — persistence is welcome here, unlike the in-chat previews where storage was disallowed), an optional freemium gate, and one lightweight **SEO landing page per playground** targeting a real search query. The playgrounds stay static; the shell is the only stateful layer.

## Constraints (non-negotiable)
- **No runtime API calls. No external runtime dependencies** inside the playgrounds. (The templates currently load Google Fonts via `<link>` — acceptable, but self-hosting the two fonts as `woff2` gives a fully offline-capable, privacy-clean build; do this when convenient.)
- **Deterministic math.** A grapher graphs correctly; nothing is "guessed." This correctness is the product's trust pillar — verify computed values against known references (e.g. the Taylor partial sums, the analytic partials).
- **Preserve the design system exactly** — the tokens, the phosphor-on-ink lab aesthetic, and the gamification behavior. Every new playground inherits them unchanged.
- Each playground is an **independent route that works offline** once loaded.
- **Responsive + keyboard-accessible**; touch must work (orbit/drag/pinch on mobile).

## How to work
Start by reading the three files and **restating the plan + your proposed repo structure and stack back to me** before writing code. Make any big or irreversible choice explicit and wait for confirmation. Execute Phase 1, then **stop for review before Phase 2**. Keep commits small, and keep the Engine as the single source of truth.
