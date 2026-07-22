# College Math Visualization — Build Map & Production Backlog
**Scope:** College Algebra → Calculus 3 (Trig/Pre-Calc included as the bridge)
**Purpose:** A concept-by-concept backlog for generating standalone, API-free interactive playgrounds. Each row is one buildable artifact.

---

## How to read this map

**Viz Value** — how much a live, manipulable visualization beats static text/formulas for *this specific concept*.
- **High** — the concept is inherently dynamic or spatial but taught symbolically. Visualization is the unlock.
- **Med** — visualization helps, but the concept is partly procedural.
- **Low** — mostly mechanical. A drill generator serves better than a playground.

**Build Tier** — production priority, combining Viz Value with *competitive whitespace* (how rare a good version is).
- **T1 — Flagship.** High viz + real whitespace. These prove the product. Build first.
- **T2 — Core.** High/medium viz, foundational, completes the sequence.
- **T3 — Fill-in.** Medium viz, often commoditized (Desmos-grade), needed for coverage.
- **T4 — Drill (not a playground).** Procedural skill → randomized problem generator with scaffolded hints, not a visualization.

**Guiding principle:** *Viz value and whitespace both rise as you climb the sequence.* College-algebra graphs are commoditized; high-quality multivariable Calc 3 visualization is rare and high-impact. **Anchor the product in Calc 2–3, extend downward.** That's the opposite of what most tools do — and it's your defensible seam.

---

## 1. College Algebra

| Concept | Viz | Tier | The interaction |
|---|---|---|---|
| Functions as input → output | Med | T2 | "Machine" box: slide an input, watch it map to output on a number line and the graph |
| Linear functions & slope | Low | T3 | Slope/intercept sliders — commoditized (Desmos-level) but foundational |
| Function transformations | High | T2 | Sliders for a·f(b(x−h))+k over parent functions; graph shifts/stretches/reflects live |
| Quadratics & the parabola | High | T2 | Vertex-form sliders; vertex, axis, roots, discriminant sign update in real time |
| Polynomial behavior & roots | Med | T3 | Degree/leading-coeff sliders; end behavior + root multiplicity (bounce vs cross) shown |
| Rational functions & asymptotes | High | T2 | Build numerator/denominator; vertical/horizontal asymptotes and holes appear as you edit |
| Exponential vs polynomial growth | High | T1 | A growth "race" with a log-scale toggle — the aha for *why* exponential wins |
| Logarithms as inverses | High | T2 | Reflect exp over y=x; slide to see log undo exp |
| Systems of equations | Med | T3 | Two curves; intersection highlighted as the solution; 3-plane case previewed in 3D |
| Complex numbers | Med | T3 | Argand plane; plot a+bi; multiply to see rotation + scaling |
| Factoring / simplifying | Low | T4 | Randomized drill generator with step hints — no visualization |

---

## 2. Trigonometry / Pre-Calculus (the bridge)

| Concept | Viz | Tier | The interaction |
|---|---|---|---|
| Unit circle ↔ sine wave | High | T1 | Drag the angle around the circle; the height *unwraps* to trace the sine curve |
| Sinusoid transformations | High | T2 | A, B, C, D sliders reshape amplitude/period/phase/shift on the wave live |
| Tangent & reciprocal ratios | Med | T3 | Ratios drawn on the circle; asymptotes of tan shown |
| Inverse trig & restricted domains | Med | T3 | Highlight the restricted domain that makes the inverse a function |
| Polar curves | High | T1 | r=f(θ) traced as θ sweeps; presets for roses, cardioids, spirals |
| Parametric equations | High | T1 | (x(t), y(t)) drawn by a moving pen over t — see time as the hidden variable |
| Conic sections | High | T2 | Eccentricity slider morphs circle → ellipse → parabola → hyperbola |
| 2D vectors | Med | T2 | Tip-to-tail addition; components and magnitude update as you drag |
| Trig identities | Low | T4 | Drill generator, not a playground |

---

## 3. Calculus 1

| Concept | Viz | Tier | The interaction |
|---|---|---|---|
| Limits (ε–δ) | High | T1 | Choose δ for a given ε; watch the band trap the function — played as a game |
| Continuity & discontinuity types | Med | T3 | Toggle removable/jump/infinite; see the break on the graph |
| Secant → tangent (derivative definition) | High | T1 | Drag h→0; the secant collapses into the tangent — the flagship of Calc 1 |
| Derivative as a slope function | High | T1 | Trace f(x); f′(x) plots beneath in real time; zeros of f′ line up with extrema of f |
| Differentiation rules | Low | T4 | Drill generator with chain/product/quotient step hints |
| Related rates | High | T1 | *Animate it* — sliding ladder, inflating balloon, moving shadow — the pain point solved |
| Linear approximation / differentials | Med | T2 | Zoom into the tangent to see local linearity; error grows as you move away |
| Curve sketching (f, f′, f″) | High | T1 | Three stacked graphs; increasing/concavity/inflection light up from the derivatives |
| Optimization | High | T1 | Drag the cardboard-box cut; the volume curve traces; find the max interactively |
| Mean Value Theorem | Med | T2 | Secant fixed; slide the tangent until parallel; the guaranteed point c appears |
| Newton's method | Med | T2 | Iterate tangent-to-x-axis; watch convergence (or divergence on a bad start) |
| Riemann sums → definite integral | High | T1 | n-slider fills rectangles; left/right/mid toggle; area converges as n→∞ |

---

## 4. Calculus 2

| Concept | Viz | Tier | The interaction |
|---|---|---|---|
| FTC & accumulation | High | T1 | An "area-so-far" tracer sweeps left→right; the accumulation function draws as it goes |
| Area between curves | Med | T2 | Shade between two curves; drag bounds; region area updates |
| Solids of revolution | High | T1 | Spin a 2D region into a rotating 3D solid; disk/washer/shell toggle |
| Integration techniques | Low | T4 | Drill generator (u-sub, parts, partial fractions, trig sub) with hints |
| Improper integrals | Med | T3 | Area stretching to infinity; convergence verdict |
| Sequences & convergence | Med | T3 | Plot terms; watch approach (or not) to a limit |
| Series & partial sums | Med | T2 | Partial-sum staircase climbs toward the sum; divergence shown as runaway |
| Convergence tests | Med | T3 | Visual comparison / integral-test area overlay |
| Power series & radius of convergence | Med | T2 | Interval on the number line expands/contracts with the ratio test |
| **Taylor / Maclaurin series** | High | T1 | Add terms one by one; each polynomial hugs the curve tighter — the single best calculus viz |
| Polar & parametric area / arc length | Med | T2 | Sweep area in polar; arc traced parametrically |

---

## 5. Calculus 3 (Multivariable)

| Concept | Viz | Tier | The interaction |
|---|---|---|---|
| 3D coordinates & orientation | Med | T2 | Plot and rotate points/vectors in an orbit-controlled 3D scene |
| Dot & cross product | High | T1 | Cross product draws the perpendicular; dot shows projection; rotate to feel it |
| Lines & planes in space | Med | T3 | A normal vector defines a plane; drag to reorient |
| Space curves (vector functions) | High | T2 | Trace r(t) in 3D; the tangent/normal frame rides along |
| Surfaces z = f(x,y) | High | T1 | Render and rotate the surface — the foundational 3D object |
| Contour / level curves | High | T1 | Slice the surface horizontally; watch contours drop to the floor map |
| Partial derivatives | High | T1 | Cut the surface with an x- or y-plane; the 1D cross-section slope *is* the partial |
| Gradient & directional derivative | High | T1 | The gradient arrow points steepest-uphill on the contour map; spin the direction dial |
| Tangent planes | Med | T2 | A plane kisses the surface at a point; zoom to see local flatness |
| Multivariable optimization & Lagrange | High | T1 | Constraint curve on the contour map; tangency = solution; saddle points on the surface |
| Double integrals (volume) | High | T1 | Boxes fill the volume under the surface; refine the grid to converge |
| Double integrals in polar | Med | T2 | Wedge elements tile a circular region |
| Triple integrals | Med | T3 | Shade a 3D region; harder to see but attemptable with slicing |
| Change of variables / Jacobian | Med | T3 | Watch a grid distort under the map; the Jacobian is the area-scale factor |
| Vector fields | High | T1 | A field of arrows; drop a particle and watch it flow |
| Line integrals | High | T2 | Accumulate work along a path threading the field |
| Green's Theorem | High | T1 | Boundary circulation ↔ interior curl shown to match — the equivalence made visible |
| Curl & divergence | High | T1 | Spin (curl) and source/sink (divergence) visualized on a live field |
| Surface integrals & flux | High | T2 | Flow through a surface; flux as net throughput |
| Stokes' & Divergence Theorems | High | T1 | The capstone equivalences — boundary vs region — impossible from symbols alone |

---

## The flagship set — build these ~11 first

These span the whole range but concentrate on the Calc 2–3 whitespace. Together they prove the product and force you to build every shared engine component (see below).

1. **Taylor / Maclaurin series** (Calc 2) — the crown jewel
2. **Solids of revolution** (Calc 2)
3. **Riemann sums → integral** (Calc 1)
4. **Secant → tangent** (Calc 1)
5. **Related rates animation** (Calc 1)
6. **Surfaces z = f(x,y)** (Calc 3) — the 3D foundation
7. **Partial derivatives via slicing** (Calc 3)
8. **Gradient & directional derivative** (Calc 3)
9. **Vector fields + Green's Theorem** (Calc 3)
10. **Unit circle unwrap** (Trig) — the downward bridge
11. **Function transformations** (College Algebra) — proves the engine reuses cleanly at the bottom

---

## Shared engine — build once, reuse everywhere

The reason NOT to build these as 60 independent one-offs. Every playground is a thin config on top of a small set of reusable parts:

- **Grapher2D** — axes, function plotting, tangent/secant/shaded regions, zoom
- **Surface3D** — orbit controls, surface mesh, slicing planes, contour projection
- **VectorField** — arrow grid (2D/3D), particle flow, curl/divergence overlays
- **ControlPanel** — sliders, numeric inputs, presets, play/pause
- **ScoreShell** — points, streaks, achievements, progress (the gamification wrapper)
- **Sequencer** — maps each playground to the actual §-by-§ course order (the institution-specific layer)

Building the flagship set above exercises all six. After that, most remaining rows are assembly, not invention.

---

## Recommended build sequence

1. **Design** the 3–5 hardest flagships visually until they're genuinely great (Taylor, solids of revolution, gradient, secant→tangent). These become your reference templates + design system.
2. **Extract** the six engine components out of those prototypes into a real component library + repo.
3. **Batch-produce** the remaining rows against the templates, tier by tier (T1 → T2 → T3), with T4 rows built as drill generators.
4. **Wrap** in the app shell (progress/account, freemium gate, SEO landing pages) and deploy static.

*Cost note:* every artifact is deterministic, self-contained HTML/JS with no runtime API. Serving cost ≈ static hosting. The only "smart" cost is authoring, which happens once per row.
