/* ---- CONTENT: the SURFACES registry — the only part that changes per concept ---- */
export const SURFACES = [
  { id: 'parab', label: 'x² + y²', f: (x, y) => x * x + y * y, fx: (x, y) => 2 * x, fy: (x, y) => 2 * y, a: 2, challenge: { tol: 0.06, hint: 'the bottom of the bowl' } },
  { id: 'saddle', label: 'x² − y²', f: (x, y) => x * x - y * y, fx: (x, y) => 2 * x, fy: (x, y) => -2 * y, a: 2, challenge: { tol: 0.06, hint: 'the saddle pass' } },
  { id: 'ripple', label: 'sin x · cos y', f: (x, y) => Math.sin(x) * Math.cos(y), fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y), a: 3.1, challenge: { tol: 0.05, hint: 'a crest or a trough' } },
  { id: 'gauss', label: 'e^(−r²/4)', f: (x, y) => Math.exp(-(x * x + y * y) / 4), fx: (x, y) => -x / 2 * Math.exp(-(x * x + y * y) / 4), fy: (x, y) => -y / 2 * Math.exp(-(x * x + y * y) / 4), a: 3, challenge: { tol: 0.04, hint: 'the summit of the hill' } },
];

// Both sliders start off-origin, as fractions of the surface's half-extent `a`.
// Every surface here has a critical point at the origin, so starting the probe at
// x = 0 would hand the student a solved challenge before they touch anything. The
// slice is offset too: on `ripple`, holding y = 0 makes the cross-section z = f(x,0)
// degenerate (identically zero) in the ∂f/∂y direction, which likewise reads as solved.
// Both fractions are multiples of the slider step (a/100), so they land exactly.
export const SLICE_START_FRAC = 0.35;
export const PROBE_START_FRAC = 0.6;
export const sliceStart = sf => sf.a * SLICE_START_FRAC;
export const probeStart = sf => sf.a * PROBE_START_FRAC;

/* ---- LESSON: the teaching layer ---- */
export const LESSON = {
  title: 'One surface, two slopes, and a plane to cut with',
  intro: `On a curve, "the slope" is one number. On a <b>surface</b> it is not — walk east and you may
    climb, walk north and you may fall. A partial derivative fixes that by refusing to move in more
    than one direction at a time: hold one variable still, and what is left is an ordinary
    single-variable curve you already know how to differentiate.`,
  steps: [
    { level: 'intro', title: 'Freeze one variable and you get a curve',
      body: `The translucent blue plane is <code>y = constant</code>. Where it cuts the surface, the
        intersection is the orange curve — a plain 1-D graph, shown small in the panel. Holding y
        still is what turns a surface problem back into a curve problem.`,
      state: { surf: 'parab', axis: 'x', slice: 0.7, probe: 1.2 }, jump: 'Show me the slice' },

    { level: 'intro', title: 'The partial is that curve’s ordinary slope',
      body: `The red tangent sits on the cross-section, not on the surface at large. Its slope is
        <code>∂f/∂x</code>. Nothing new is happening: it is the Calculus 1 derivative of the curve the
        plane exposed.`,
      state: { surf: 'parab', axis: 'x', slice: 0.7, probe: 1.4 }, jump: 'Show me the tangent' },

    { level: 'use', title: 'Turn the plane and you get the other partial',
      body: `Switch to <code>∂f/∂y</code> and the cutting plane rotates a quarter turn. Now x is held
        and y moves. Same point on the same surface, a different question, and generally a different
        number.`,
      state: { surf: 'saddle', axis: 'y', slice: 0.7, probe: 1.2 }, jump: 'Cut the other way' },

    { level: 'use', title: 'A saddle is where the two disagree loudest',
      body: `On <code>x² − y²</code> one direction curves up and the other curves down. Sitting at the
        centre, <code>∂f/∂x</code> and <code>∂f/∂y</code> can both read zero while the point is neither
        a peak nor a valley. That is why "both partials vanish" is not enough to call something a
        maximum.`,
      state: { surf: 'saddle', axis: 'x', slice: 0.7, probe: 0 }, jump: 'Sit on the saddle' },

    { level: 'advanced', title: 'Where the slice sits changes the answer',
      body: `On the ripple, slide the holding plane and the cross-section changes shape entirely — crest
        becomes trough. So <code>∂f/∂x</code> is itself a function of both x <em>and</em> y. Partial
        derivatives are not constants; they are new surfaces.`,
      state: { surf: 'ripple', axis: 'x', slice: 1.085, probe: 1.55 }, jump: 'Slide the plane on a ripple' },

    { level: 'real', title: 'Every weather forecast',
      body: `Atmospheric models track pressure, temperature and wind as functions of longitude,
        latitude, altitude and time. The governing equations are built almost entirely from partial
        derivatives — how fast temperature changes with height at fixed position, how pressure changes
        eastward at fixed altitude. A forecast is those partials, stepped forward.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A temperature field with separate rates of change along altitude and along the ground">
  <rect x="20" y="16" width="216" height="84" rx="6" fill="none" stroke="#7e98c4" stroke-opacity=".45"/>
  <g fill="none" stroke="#ffb454" stroke-opacity=".55">
    <path d="M20 34 Q90 22 236 40"/><path d="M20 58 Q90 46 236 64"/><path d="M20 82 Q90 70 236 88"/>
  </g>
  <g stroke="#ff5d73" stroke-width="2" fill="#ff5d73">
    <path d="M84 92 V38"/><path d="M84 32 l-4 8 h8 z"/>
  </g>
  <g stroke="#3df2c0" stroke-width="2" fill="#3df2c0">
    <path d="M100 66 H176"/><path d="M182 66 l-8 -4 v8 z"/>
  </g>
  <g font-family="JetBrains Mono, monospace" font-size="9">
    <text x="70" y="112" fill="#ff5d73">∂T/∂z</text>
    <text x="150" y="112" fill="#3df2c0">∂T/∂x</text>
  </g>
</svg>`,
      state: { surf: 'gauss', axis: 'x', slice: 1.05, probe: 1.8 }, jump: 'Show me a pressure bump' },

    { level: 'real', title: 'Sensitivity: which input actually matters',
      body: `An engineer models cost, or a bank models a portfolio's value, as a function of many
        inputs. The partial with respect to each input answers "if only <em>this</em> moves, how much
        does the output move?" — options traders call them the Greeks, and every risk system computes
        them. Ranking those numbers tells you which variable is worth controlling.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="Bars showing the size of the partial derivative with respect to each input">
  <path d="M52 100 H244" stroke="#7e98c4" stroke-opacity=".4"/>
  <g fill="#3df2c0" fill-opacity=".55">
    <rect x="66" y="34" width="30" height="66"/><rect x="112" y="62" width="30" height="38"/>
    <rect x="158" y="80" width="30" height="20"/><rect x="204" y="90" width="30" height="10"/>
  </g>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#8b95ab" text-anchor="middle">
    <text x="81" y="114">∂/∂a</text><text x="127" y="114">∂/∂b</text>
    <text x="173" y="114">∂/∂c</text><text x="219" y="114">∂/∂d</text>
    <text x="26" y="66" fill="#ffd76a">size</text>
  </g>
  <text x="150" y="22" fill="#ffd76a" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="middle">a dominates; d barely matters</text>
</svg>`,
      state: { surf: 'gauss', axis: 'y', slice: 1.05, probe: 1.8 }, jump: 'Compare the two directions' },

    { level: 'use', title: 'Differentiate twice, in either order, and get the same thing',
      body: `Take <code>∂/∂x</code> then <code>∂/∂y</code>, or the other way round, and for any surface
        smooth enough you land on the same mixed partial. That is <b>Clairaut's theorem</b>, and it is
        why <code>∂²f/∂x∂y</code> is written without fussing about order. On the saddle both come out
        to zero; on the ripple both come out to <code>−cos x · sin y</code>.`,
      state: { surf: 'ripple', axis: 'y', slice: 1.085, probe: 1.55 }, jump: 'Cut the ripple the other way' },

    { level: 'advanced', title: 'The two partials build the tangent PLANE',
      body: `One derivative gives a tangent line; two give a tangent plane, spanned by the slope east and
        the slope north. Its equation is
        <code>z = f(a,b) + f<sub>x</sub>·(x−a) + f<sub>y</sub>·(y−b)</code> — the two-variable version of
        linear approximation, and the object that makes a curved surface look flat when you zoom far
        enough in.`,
      state: { surf: 'gauss', axis: 'x', slice: 1.05, probe: 0 }, jump: 'Sit where the plane is level' },

    { level: 'advanced', title: 'Having both partials is not enough',
      body: `Partials only probe along two special directions. A surface can have both of them exist at a
        point and still be torn or creased along some diagonal — differentiability needs the tangent
        plane to approximate well in <em>every</em> direction, which is strictly stronger. The usual
        rescue: if the partials exist and are continuous nearby, the function is differentiable.`,
      state: { surf: 'saddle', axis: 'y', slice: 0.7, probe: 0 }, jump: 'Sit at the saddle point' },

    { level: 'real', title: 'Thermodynamics is almost entirely partial derivatives',
      body: `State variables — pressure, volume, temperature, entropy — are tied together, so every
        quantity is a partial with something else held fixed. Heat capacity <em>at constant volume</em>
        and <em>at constant pressure</em> are different numbers for the same substance, and the subscript
        in <code>C<sub>V</sub></code> is exactly the "hold this still" of the blue plane here. Maxwell's
        relations come from Clairaut's theorem applied to those.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="A pressure volume surface with two paths, one at constant volume and one at constant pressure">
  <path d="M30 106 H236" stroke="#7e98c4" stroke-opacity=".45"/>
  <path d="M40 106 V18" stroke="#7e98c4" stroke-opacity=".45"/>
  <path d="M52 96 Q104 30 220 24" fill="none" stroke="#ffb454" stroke-width="2"/>
  <g stroke="#ff5d73" stroke-width="2" fill="#ff5d73">
    <path d="M96 106 V44"/><path d="M96 38 l-3 7 h6 z"/>
  </g>
  <g stroke="#3df2c0" stroke-width="2" fill="#3df2c0">
    <path d="M40 60 H150"/><path d="M156 60 l-7 -3 v6 z"/>
  </g>
  <g font-family="JetBrains Mono, monospace" font-size="9">
    <text x="102" y="34" fill="#ff5d73">hold V</text>
    <text x="160" y="56" fill="#3df2c0">hold P</text>
    <text x="34" y="16" fill="#8b95ab">P</text><text x="238" y="120" fill="#8b95ab">V</text>
  </g>
</svg>`,
      state: { surf: 'parab', axis: 'y', slice: 0.7, probe: 1.2 }, jump: 'Hold the other variable' },

    { level: 'real', title: 'The Greeks, and why a trading desk cares',
      body: `An option's price depends on the underlying price, volatility, interest rate and time. Each
        partial has a name: <b>delta</b> is <code>∂V/∂S</code>, <b>vega</b> is the partial in volatility,
        <b>theta</b> the one in time. Desks hedge by holding a position whose delta cancels theirs, and
        the Black–Scholes equation that prices the thing is a partial differential equation built from
        exactly these.`,
      figure: `<svg viewBox="0 0 260 128" role="img" aria-label="An option price curve with its slope marked as delta">
  <path d="M22 104 H242" stroke="#7e98c4" stroke-opacity=".45"/>
  <path d="M26 100 Q120 96 158 68 Q198 38 238 20" fill="none" stroke="#ffb454" stroke-width="2"/>
  <path d="M118 104 L206 34" stroke="#3df2c0" stroke-width="2"/>
  <circle cx="162" cy="69" r="4" fill="#ffd76a"/>
  <g font-family="JetBrains Mono, monospace" font-size="9">
    <text x="206" y="30" fill="#3df2c0">slope = delta</text>
    <text x="24" y="122" fill="#8b95ab">underlying price →</text>
  </g>
</svg>`,
      state: { surf: 'gauss', axis: 'x', slice: 1.05, probe: 1.8 }, jump: 'Read one sensitivity' },
  ],
};
