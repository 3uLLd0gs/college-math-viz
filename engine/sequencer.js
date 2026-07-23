/* Sequencer — the single source of truth for which playgrounds exist and what
   order a student meets them in. Both the landing page and the in-page nav read
   this, so a new row is added in exactly one place.

   `course` is the institution-facing grouping; the array order within a course
   is the teaching order, which is NOT the order the playgrounds were built in. */

export const COURSES = [
  { id: 'precalc', label: 'Trigonometry & Pre-Calculus' },
  { id: 'calc1', label: 'Calculus 1' },
  { id: 'calc2', label: 'Calculus 2' },
  { id: 'calc3', label: 'Calculus 3' },
];

export const PLAYGROUNDS = [
  {
    slug: 'unit-circle', course: 'precalc',
    title: 'Unit Circle Unwrap',
    tag: 'Where the sine wave comes from',
    blurb: 'Drag the radius around the circle and watch the height it marks unwrap, point by point, into the sine curve. Same for cosine and tangent.',
  },
  {
    slug: 'secant-tangent', course: 'calc1',
    title: 'Secant → Tangent',
    tag: 'The derivative, defined',
    blurb: 'Shrink the step h and watch a secant line through two points collapse onto the tangent. The difference quotient becoming f′(x₀), live.',
  },
  {
    slug: 'related-rates', course: 'calc1',
    title: 'Related Rates',
    tag: 'One rate drives another',
    blurb: 'A ladder slips, a balloon inflates, a tank fills. You set one rate; geometry decides the other, and it rarely holds still. Let time run and watch them diverge.',
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
    slug: 'curl-divergence', course: 'calc3',
    title: 'Curl & Divergence',
    tag: 'Spin and spread, made visible',
    blurb: 'A paddle wheel that turns at curl/2 and a ring of tracers whose area changes at rate div. Find the one spot where both go completely still.',
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
 * One menu per course, each listing that course's playgrounds. A flat strip of
 * pills was fine at six rows and will not survive the sixty the build map plans.
 *
 * Deliberately NOT a native <select>: a focused dropdown swallows the scroll
 * wheel and silently navigates away mid-page, which is a nasty surprise on pages
 * you scroll. This is a button plus a panel, which behaves.
 */
export function mountNav(slug) {
  const wrap = document.querySelector('.wrap');
  if (!wrap) return null;

  const here = bySlug(slug);
  const n = next(slug);
  const courses = COURSES.filter(c => inCourse(c.id).length);

  const menus = courses.map(c => {
    const isCurrent = here?.course === c.id;
    const items = inCourse(c.id).map(pg => pg.slug === slug
      ? `<span class="pgmenu-item on" aria-current="page">${pg.title}</span>`
      : `<a class="pgmenu-item" href="${hrefFor(pg.slug)}">${pg.title}</a>`).join('');
    return `
      <div class="pgmenu${isCurrent ? ' current' : ''}" data-course="${c.id}">
        <button class="pgmenu-btn" type="button" aria-expanded="false" aria-haspopup="true">
          ${c.label}<span class="pgmenu-caret" aria-hidden="true">▾</span>
        </button>
        <div class="pgmenu-list" role="menu" hidden>${items}</div>
      </div>`;
  }).join('');

  const nav = document.createElement('nav');
  nav.className = 'pgnav';
  nav.setAttribute('aria-label', 'Playgrounds');
  nav.innerHTML = `
    <a class="pgnav-home" href="/">◂ All</a>
    <div class="pgnav-menus">${menus}</div>
    <span class="pgnav-here">${here ? here.title : ''}</span>
    ${n ? `<a class="pgnav-next" href="${hrefFor(n.slug)}">Next: ${n.title}&nbsp;→</a>`
        : '<span class="pgnav-next pgnav-off">End of the sequence</span>'}`;
  wrap.insertBefore(nav, wrap.firstChild);

  const menuEls = [...nav.querySelectorAll('.pgmenu')];
  const closeAll = except => menuEls.forEach(m => {
    if (m === except) return;
    m.classList.remove('open');
    m.querySelector('.pgmenu-list').hidden = true;
    m.querySelector('.pgmenu-btn').setAttribute('aria-expanded', 'false');
  });

  menuEls.forEach(m => {
    const btn = m.querySelector('.pgmenu-btn');
    const list = m.querySelector('.pgmenu-list');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = m.classList.contains('open');
      closeAll(m);
      m.classList.toggle('open', !open);
      list.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  // A menu left hanging open over a canvas you are dragging is worse than one
  // that is slightly too eager to close.
  document.addEventListener('click', () => closeAll(null));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(null); });

  return { nav, closeAll };
}
