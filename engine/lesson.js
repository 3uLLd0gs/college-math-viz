import { buttonGroup } from './control-panel.js';

/* A teaching panel that sits under a playground: prose, grouped by how far in
   the student is, where every worked example is a BUTTON that drives the
   playground to the exact configuration being described.

   That is the one thing this can do that a textbook cannot — reading the
   explanation and manipulating the thing are the same act, so an example is
   never a static picture the student has to map onto the controls themselves.

   Content shape (declared in a playground's content.js):
     { title, intro, steps: [ { level, title, body, figure?, state?, jump? } ] }
   `figure` is inline SVG. Inline rather than an image file because the whole
   site is offline-capable with no external requests, and because a diagram that
   uses the design tokens stays in step with the theme for free.
   `level` is one of LEVELS below; `state` is opaque here and handed straight
   back to the playground's own handler. */

export const LEVELS = [
  { id: 'intro', label: 'Start here' },
  { id: 'use', label: 'Using it' },
  { id: 'advanced', label: 'Going further' },
  { id: 'real', label: 'Where it shows up' },
];

const KEY = slug => `cmv:lesson:${slug}`;

/* Folded on a first visit. The panel sits ABOVE the playground so a student
   cannot miss that an explanation exists, but leaving it open by default would
   push the thing they came for below the fold. Once toggled, the choice sticks. */
function readPrefs(slug) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(slug)) ?? '{}');
    return { open: v.open === true, level: typeof v.level === 'string' ? v.level : 'intro' };
  } catch {
    return { open: false, level: 'intro' };
  }
}

function writePrefs(slug, prefs) {
  try { localStorage.setItem(KEY(slug), JSON.stringify(prefs)); } catch { /* not worth failing over */ }
}

/**
 * @param lesson        the content block described above
 * @param opts.slug     persistence key for open/level state
 * @param opts.onJump   called with a step's `state` when its button is pressed
 * @param opts.anchor   element to sit next to (default: the .studio grid)
 * @param opts.place    'before' the anchor (default) or 'after' it
 */
export function mountLesson(lesson, opts = {}) {
  const anchor = opts.anchor ?? document.querySelector('.studio');
  if (!anchor || !lesson) return null;

  const slug = opts.slug ?? null;
  const prefs = readPrefs(slug);
  const levels = LEVELS.filter(L => lesson.steps.some(s => s.level === L.id));
  if (!levels.some(L => L.id === prefs.level)) prefs.level = levels[0]?.id ?? 'intro';

  const el = document.createElement('section');
  el.className = 'lesson card';
  el.innerHTML = `
    <div class="lesson-head">
      <div>
        <div class="lesson-kicker">The idea</div>
        <h2>${lesson.title}</h2>
      </div>
      <div class="lesson-actions">
        <button class="lesson-skip" type="button">Skip to the playground ↓</button>
        <button class="lesson-toggle" type="button" aria-expanded="false"></button>
      </div>
    </div>
    <div class="lesson-body">
      <p class="lesson-intro">${lesson.intro}</p>
      <div class="toggle lesson-levels" id="lesson-levels"></div>
      <div class="lesson-steps" id="lesson-steps"></div>
    </div>`;
  anchor.insertAdjacentElement(opts.place === 'after' ? 'afterend' : 'beforebegin', el);

  const links = opts.links;
  if (links && (links.prereq || links.next)) {
    const bits = [];
    if (links.prereq) bits.push(`Builds on <a href="/playgrounds/${links.prereq.slug}/">${links.prereq.title}</a>`);
    if (links.next) bits.push(`Leads to <a href="/playgrounds/${links.next.slug}/">${links.next.title}</a>`);
    el.querySelector('.lesson-intro').insertAdjacentHTML('afterend',
      `<p class="lesson-links">${bits.join(' &nbsp;·&nbsp; ')}</p>`);
  }

  const stepsEl = el.querySelector('#lesson-steps');
  const toggle = el.querySelector('.lesson-toggle');

  // The panel sits above the playground so it is impossible to miss, which also
  // means it is in the way of anyone who does not want it. One press gets past.
  const toGraph = () =>
    (document.querySelector('.graph-card') ?? anchor).scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.querySelector('.lesson-skip').addEventListener('click', toGraph);

  function renderSteps(levelId) {
    const steps = lesson.steps.filter(s => s.level === levelId);
    stepsEl.innerHTML = steps.map((s, i) => s.check ? checkHtml(s, i) : proseHtml(s, i)).join('');

    stepsEl.querySelectorAll('.lesson-jump').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = steps[+btn.dataset.i];
        if (step?.state && opts.onJump) opts.onJump(step.state, step);
        toGraph();   // the change happens in the playground, so go look at it
      });
    });

    stepsEl.querySelectorAll('.lesson-check').forEach(art => {
      const step = steps[+art.dataset.i], c = step.check;
      const why = art.querySelector('.lesson-why');
      const seeit = art.querySelector('.lesson-seeit');
      art.querySelectorAll('.lesson-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          const o = c.options[+opt.dataset.k];
          art.querySelectorAll('.lesson-opt').forEach(b => b.classList.remove('right', 'wrong'));
          opt.classList.add(o.correct ? 'right' : 'wrong');
          why.innerHTML = o.why ?? '';
          why.hidden = false;
          if (seeit) seeit.hidden = false;
        });
      });
      if (seeit) seeit.addEventListener('click', () => {
        if (opts.onJump) opts.onJump(c.state, step);
        toGraph();
      });
    });
  }

  buttonGroup(el.querySelector('#lesson-levels'), levels, L => {
    prefs.level = L.id;
    writePrefs(slug, prefs);
    renderSteps(L.id);
  }, { className: 'tbtn', selected: Math.max(0, levels.findIndex(L => L.id === prefs.level)) });

  renderSteps(prefs.level);

  function setOpen(open) {
    prefs.open = open;
    el.classList.toggle('closed', !open);
    toggle.textContent = open ? 'Hide' : 'Read this';
    toggle.setAttribute('aria-expanded', String(open));
    writePrefs(slug, prefs);
  }
  const flip = () => setOpen(el.classList.contains('closed'));
  toggle.addEventListener('click', flip);
  // While folded the whole header is the affordance — a thin strip with one
  // small button is a fiddly target for the primary action on the page.
  el.querySelector('.lesson-head').addEventListener('click', e => {
    if (e.target.closest('.lesson-skip') || e.target.closest('.lesson-toggle')) return;
    if (el.classList.contains('closed')) flip();
  });
  setOpen(prefs.open);

  return { el, setOpen, showLevel: renderSteps };
}

function proseHtml(s, i) {
  return `
    <article class="lesson-step${s.figure ? ' has-fig' : ''}">
      <div class="lesson-step-n">${i + 1}</div>
      <div class="lesson-step-main">
        <h3>${s.title}</h3>
        <div class="lesson-step-cols">
          <div>
            <div class="lesson-step-body">${s.body}</div>
            ${s.state ? `<button class="action lesson-jump" type="button" data-i="${i}">${s.jump ?? 'Show me on the graph'} →</button>` : ''}
          </div>
          ${s.figure ? `<figure class="lesson-fig">${s.figure}</figure>` : ''}
        </div>
      </div>
    </article>`;
}

function checkHtml(s, i) {
  const c = s.check;
  return `
    <article class="lesson-step lesson-check" data-i="${i}">
      <div class="lesson-step-n">?</div>
      <div class="lesson-step-main">
        <div class="lesson-check-q">${c.q}</div>
        <div class="lesson-opts">
          ${c.options.map((o, k) => `<button class="lesson-opt" type="button" data-k="${k}">${o.text}</button>`).join('')}
        </div>
        <div class="lesson-why" hidden></div>
        ${c.state ? `<button class="action lesson-seeit" type="button" hidden>See it on the graph →</button>` : ''}
      </div>
    </article>`;
}
