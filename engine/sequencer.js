/* Sequencer — the single source of truth for which playgrounds exist and what
   order a student meets them in. Both the landing page and the in-page nav read
   this, so a new row is added in exactly one place.

   `course` is the institution-facing grouping; the array order within a course
   is the teaching order, which is NOT the order the playgrounds were built in. */

export const COURSES = [
  { id: 'calc1', label: 'Calculus 1' },
  { id: 'calc2', label: 'Calculus 2' },
  { id: 'calc3', label: 'Calculus 3' },
];

export const PLAYGROUNDS = [
  {
    slug: 'secant-tangent', course: 'calc1',
    title: 'Secant → Tangent',
    tag: 'The derivative, defined',
    blurb: 'Shrink the step h and watch a secant line through two points collapse onto the tangent. The difference quotient becoming f′(x₀), live.',
  },
  {
    slug: 'riemann-sums', course: 'calc1',
    title: 'Riemann Sums',
    tag: 'Area converges to the integral',
    blurb: 'Fill the region with rectangles and watch the sum climb toward the true area. Left, midpoint and right sampling converge at visibly different rates.',
  },
  {
    slug: 'taylor-series', course: 'calc2',
    title: 'Taylor Series',
    tag: 'Polynomials that hug a curve',
    blurb: 'Add one term at a time and watch each polynomial grip the function tighter. Drag anywhere to probe the error.',
  },
  {
    slug: 'solids-of-revolution', course: 'calc2',
    title: 'Solids of Revolution',
    tag: 'Disks, washers and shells',
    blurb: 'Spin a plane region into a 3-D solid and stack the slices that measure its volume. The axis you revolve about decides whether you need disks, washers or shells.',
  },
  {
    slug: 'partial-derivatives', course: 'calc3',
    title: 'Partial Derivatives',
    tag: 'Slice a surface, read the slope',
    blurb: 'Cut a 3-D surface with an x- or y-plane. The slope of the 1-D cross-section is the partial derivative.',
  },
  {
    slug: 'gradient', course: 'calc3',
    title: 'Gradient & Direction',
    tag: 'Which way is uphill',
    blurb: 'On a contour map, spin a direction dial and watch the directional derivative peak exactly when it aligns with the gradient.',
  },
  {
    slug: 'vector-fields', course: 'calc3',
    title: 'Vector Fields',
    tag: 'Flow, divergence and curl',
    blurb: 'Release a particle into a field and follow it. Divergence and curl classify what the flow is doing at every point.',
  },
  {
    slug: 'greens-theorem', course: 'calc3',
    title: "Green's Theorem",
    tag: 'Boundary equals interior',
    blurb: 'Circulation around a loop and the curl inside it, computed independently and shown to agree. Balance the spin to cancel it.',
  },
];

export const bySlug = slug => PLAYGROUNDS.find(p => p.slug === slug) ?? null;

export const courseOf = slug => {
  const p = bySlug(slug);
  return p ? COURSES.find(c => c.id === p.course) ?? null : null;
};

/** Playgrounds of one course, in teaching order. */
export const inCourse = courseId => PLAYGROUNDS.filter(p => p.course === courseId);

const indexOf = slug => PLAYGROUNDS.findIndex(p => p.slug === slug);

/** The next/previous playground in sequence, or null at either end. */
export const next = slug => {
  const i = indexOf(slug);
  return i >= 0 && i < PLAYGROUNDS.length - 1 ? PLAYGROUNDS[i + 1] : null;
};
export const prev = slug => {
  const i = indexOf(slug);
  return i > 0 ? PLAYGROUNDS[i - 1] : null;
};

export const hrefFor = slug => `/playgrounds/${slug}/`;

/**
 * Insert the cross-playground nav at the top of `.wrap`. Creating the element
 * here rather than requiring markup in every index.html means adding a
 * playground needs no edit to any existing page.
 *
 * Every playground is shown as a pill, so any page is ONE click from any other.
 * Deliberately not a <select>: a focused dropdown swallows the scroll wheel and
 * silently navigates away mid-page, which is a nasty surprise on pages you
 * scroll. With a catalogue this size, showing them all is also simply clearer.
 */
export function mountNav(slug) {
  const wrap = document.querySelector('.wrap');
  if (!wrap) return null;

  const n = next(slug);
  const pills = PLAYGROUNDS.map(pg => pg.slug === slug
    ? `<span class="pgpill on" aria-current="page">${pg.title}</span>`
    : `<a class="pgpill" href="${hrefFor(pg.slug)}" title="${courseOf(pg.slug)?.label ?? ''}">${pg.title}</a>`
  ).join('');

  const nav = document.createElement('nav');
  nav.className = 'pgnav';
  nav.setAttribute('aria-label', 'Playgrounds');
  nav.innerHTML = `
    <a class="pgnav-home" href="/">◂ All</a>
    <span class="pgnav-pills">${pills}</span>
    ${n ? `<a class="pgnav-next" href="${hrefFor(n.slug)}">Next: ${n.title}&nbsp;→</a>`
        : '<span class="pgnav-next pgnav-off">End of the sequence</span>'}`;
  wrap.insertBefore(nav, wrap.firstChild);
  return nav;
}
