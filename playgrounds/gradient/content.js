/* ---- CONTENT: the FIELDS registry — the only part that changes per concept ----
   Each field carries f and its two analytic partials. `a` is the half-extent of
   the square domain; `hint` names where a student should look to find a spot
   where the gradient vanishes (there the directional derivative is zero in every
   direction, which the challenge deliberately excludes — see playground.js). */
export const FIELDS = [
  { id: 'bowl', label: 'x² + y²', tex: 'x² + y²',
    f: (x, y) => x * x + y * y,
    fx: (x, y) => 2 * x, fy: (x, y) => 2 * y, a: 2,
    hint: 'the gradient points straight out from the bottom of the bowl' },

  { id: 'saddle', label: 'x² − y²', tex: 'x² − y²',
    f: (x, y) => x * x - y * y,
    fx: (x, y) => 2 * x, fy: (x, y) => -2 * y, a: 2,
    hint: 'on a saddle the uphill direction swings sharply as you cross the pass' },

  { id: 'plane', label: '2x + y', tex: '2x + y',
    f: (x, y) => 2 * x + y,
    fx: () => 2, fy: () => 1, a: 2,
    hint: 'a plane has the same gradient everywhere — the arrow never turns' },

  { id: 'ripple', label: 'sin x · cos y', tex: 'sin x · cos y',
    f: (x, y) => Math.sin(x) * Math.cos(y),
    fx: (x, y) => Math.cos(x) * Math.cos(y), fy: (x, y) => -Math.sin(x) * Math.sin(y), a: 3.1,
    hint: 'the gradient runs from each trough toward the neighbouring crest' },

  { id: 'hill', label: 'e^(−r²/3)', tex: 'e^(−r²/3)',
    f: (x, y) => Math.exp(-(x * x + y * y) / 3),
    fx: (x, y) => -2 * x / 3 * Math.exp(-(x * x + y * y) / 3),
    fy: (x, y) => -2 * y / 3 * Math.exp(-(x * x + y * y) / 3), a: 3,
    hint: 'everywhere on the hill the gradient points back toward the summit' },
];

/** ∇f at a point, as [∂f/∂x, ∂f/∂y]. */
export const grad = (field, x, y) => [field.fx(x, y), field.fy(x, y)];

/** |∇f| — the steepest slope available at a point, in any direction. */
export const gradMag = (field, x, y) => Math.hypot(...grad(field, x, y));

/** Compass angle of steepest ascent, in radians, or null where ∇f = 0. */
export function steepestAngle(field, x, y) {
  const [gx, gy] = grad(field, x, y);
  if (Math.hypot(gx, gy) < 1e-12) return null;
  return Math.atan2(gy, gx);
}

/**
 * Directional derivative D_u f = ∇f · u for the unit vector u at angle `theta`.
 * This is the whole lesson in one line: it peaks at |∇f| when u aligns with ∇f,
 * is zero along the contour, and is −|∇f| pointing downhill.
 */
export function directional(field, x, y, theta) {
  const [gx, gy] = grad(field, x, y);
  return gx * Math.cos(theta) + gy * Math.sin(theta);
}

/** Smallest absolute angle between two directions, in radians (0..π). */
export function angleGap(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

/* ---- LESSON: the teaching layer ----
   Every step that carries a `state` becomes a button that drives the playground
   to exactly the configuration being described, so reading and manipulating are
   the same act. `state` is interpreted by playground.js. */
export const LESSON = {
  title: 'Which way is uphill, and how steep is it?',
  intro: `A function of two variables is a <b>landscape</b>. The map below is that landscape seen
    from above: colour is height, and each thin line joins points at one height, exactly like a
    contour on a hiking map. Standing anywhere on it, two questions have answers — <b>which
    direction is uphill</b>, and <b>how steep is it</b> if you walk some other way instead.`,
  steps: [
    {
      level: 'intro',
      title: 'Read the map first',
      body: `Where the contour lines are <b>close together</b>, height changes fast — the ground is
        steep. Where they spread apart, it is gentle. On this bowl the lines are rings, tight near
        the rim and loose near the bottom. Drag the probe around and watch the two arrows swing.`,
      state: { field: 'bowl', x: 1.1, y: -0.8, thetaDeg: 20 },
      jump: 'Put me on the steep part',
    },
    {
      level: 'intro',
      title: 'The gradient is a vector, not a number',
      body: `The gradient collects both partial derivatives into one arrow:
        <code>∇f = (∂f/∂x, ∂f/∂y)</code>. Its <em>direction</em> is the way the ground rises fastest;
        its <em>length</em> |∇f| is how fast it rises that way. That is the dashed red arrow. For
        <code>f = x² + y²</code> it works out to <code>(2x, 2y)</code> — always pointing straight
        away from the bottom of the bowl.`,
      state: { field: 'bowl', x: 0.9, y: -0.6, snap: true },
      jump: 'Point me straight uphill',
    },
    {
      level: 'use',
      title: 'The directional derivative picks a direction and asks for the slope',
      body: `Choose any unit vector <code>u</code> — that is the mint arrow, and the dial sets its
        angle. The slope of the ground if you walk that way is
        <code>Dᵤf = ∇f · u</code>, a single number. Turn the dial and watch it change while ∇f
        stays put: the landscape has not moved, only the direction you asked about.`,
      state: { field: 'bowl', x: 0.9, y: -0.6, thetaDeg: 0 },
      jump: 'Set the dial to 0°',
    },
    {
      level: 'use',
      title: 'It is largest exactly when you face the gradient',
      body: `Because <code>Dᵤf = ∇f · u = |∇f| cos θ</code>, where θ is the angle between your
        direction and the gradient. Cosine is biggest at θ = 0, so the steepest possible slope is
        <b>|∇f|</b>, and it happens when u lines up with ∇f. That is the whole challenge on this
        page, and it is why "the gradient points uphill" is a theorem rather than a definition.`,
      state: { field: 'bowl', x: 0.9, y: -0.6, snap: true },
      jump: 'Line them up',
    },
    {
      level: 'use',
      title: 'Walk along a contour and the slope is zero',
      body: `Turn a quarter turn from the gradient and cos θ = 0, so <code>Dᵤf = 0</code>. You are
        walking along a contour line — the same height the whole way. This is the fast way to see
        that <b>the gradient is perpendicular to the contour through your point</b>: the only
        direction with no rise is the one at right angles to steepest ascent.`,
      state: { field: 'bowl', x: 0.9, y: -0.6, thetaOffsetDeg: 90 },
      jump: 'Turn me along the contour',
    },
    {
      level: 'advanced',
      title: 'Downhill is just the other end of the same arrow',
      body: `At θ = 180°, cos θ = −1 and <code>Dᵤf = −|∇f|</code> — the steepest possible
        <em>descent</em>. Gradient descent, the workhorse of machine learning, is exactly this:
        stand somewhere, compute ∇f, and step the other way.`,
      state: { field: 'bowl', x: 0.9, y: -0.6, thetaOffsetDeg: 180 },
      jump: 'Point me downhill',
    },
    {
      level: 'advanced',
      title: 'A plane has the same gradient everywhere',
      body: `For <code>f = 2x + y</code> the partials are constants, so ∇f = (2, 1) at every single
        point and |∇f| = √5 ≈ 2.24 wherever you stand. Drag the probe anywhere — the red arrow never
        turns. A curved surface is exactly the case where it does.`,
      state: { field: 'plane', x: -1.2, y: 0.9, snap: true },
      jump: 'Try it on a plane',
    },
    {
      level: 'advanced',
      title: 'Where the gradient vanishes, no direction is steepest',
      body: `At the bottom of the bowl ∇f = (0, 0). Then <code>Dᵤf = 0</code> for <em>every</em>
        direction — the ground is flat to first order, and asking "which way is uphill" has no
        answer. These are the critical points, and they are where maxima, minima and saddles live.
        The page refuses the challenge here rather than pretending some direction wins.`,
      state: { field: 'bowl', x: 0, y: 0, thetaDeg: 45 },
      jump: 'Take me to the flat spot',
    },

    {
      level: 'real',
      title: 'Training almost every machine-learning model',
      body: `A model's error is a function of its parameters — millions of them, but the idea is
        identical to this two-variable picture. <b>Gradient descent</b> computes ∇(error) and takes
        a step in the <em>opposite</em> direction, because that is the fastest way down. Repeat a few
        million times and you have a trained network. The "learning rate" is just how big a step you
        take; too big and you overshoot the valley, which is the same thing as jumping past the
        bottom of this bowl.`,
      state: { field: 'bowl', x: 0.9, y: -0.6, thetaOffsetDeg: 180 },
      jump: 'Show me the descent step',
    },
    {
      level: 'real',
      title: 'Where rain goes, and where a watershed ends',
      body: `Let <code>h(x, y)</code> be ground elevation. Water on a hillside runs along
        <code>−∇h</code> — steepest descent, exactly the arrow above reversed. Hydrologists compute
        this over elevation data to work out which river basin any square metre of land drains into,
        and the ridges where the gradient flips are watershed boundaries. The contour map you are
        looking at is the same object a hiking map draws.`,
      state: { field: 'ripple', x: 1.0, y: 0.6, snap: true },
      jump: 'Show me a ridged landscape',
    },
    {
      level: 'real',
      title: 'How heat moves',
      body: `Fourier's law says heat flows down the temperature gradient:
        <code>q = −k∇T</code>. Not "from hot to cold" loosely — specifically along −∇T, at a rate
        proportional to how steep the temperature change is. This is what a CPU heatsink, a
        double-glazed window and a thermal-imaging camera are all reasoning about. The Gaussian hill
        here is close to what a hot spot on a chip actually looks like.`,
      state: { field: 'hill', x: 0.8, y: 0.5, snap: true },
      jump: 'Show me a hot spot',
    },
    {
      level: 'real',
      title: 'Finding edges in an image',
      body: `A greyscale image is a function of two pixel coordinates. Its gradient is large exactly
        where brightness changes fast — which is to say, <b>at edges</b>. Sobel and Scharr filters
        compute a discrete ∇I, and |∇I| is the edge map; the <em>direction</em> of ∇I tells you which
        way the edge runs. That is how your phone finds the borders of a document you photograph,
        and the first layer of most vision pipelines.`,
      state: { field: 'ripple', x: -0.4, y: 1.2, snap: true },
      jump: 'Show me a field full of edges',
    },
  ],
};
