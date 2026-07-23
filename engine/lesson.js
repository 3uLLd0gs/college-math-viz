import { buttonGroup } from './control-panel.js';

/* A teaching panel that sits under a playground: prose, grouped by how far in
   the student is, where every worked example is a BUTTON that drives the
   playground to the exact configuration being described.

   That is the one thing this can do that a textbook cannot — reading the
   explanation and manipulating the thing are the same act, so an example is
   never a static picture the student has to map onto the controls themselves.

   Content shape (declared in a playground's content.js):
     { title, intro, steps: [ { level, title, body, state?, jump? } ] }
   `level` is one of LEVELS below; `state` is opaque here and handed straight
   back to the playground's own handler. */

export const LEVELS = [
  { id: 'intro', label: 'Start here' },
  { id: 'use', label: 'Using it' },
  { id: 'advanced', label: 'Going further' },
];

const KEY = slug => `cmv:lesson:${slug}`;

function readPrefs(slug) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(slug)) ?? '{}');
    return { open: v.open !== false, level: typeof v.level === 'string' ? v.level : 'intro' };
  } catch {
    return { open: true, level: 'intro' };
  }
}

function writePrefs(slug, prefs) {
  try { localStorage.setItem(KEY(slug), JSON.stringify(prefs)); } catch { /* not worth failing over */ }
}

/**
 * @param lesson        the content block described above
 * @param opts.slug     persistence key for open/level state
 * @param opts.onJump   called with a step's `state` when its button is pressed
 * @param opts.anchor   element to insert after (default: the .studio grid)
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
      <button class="lesson-toggle" type="button" aria-expanded="true"></button>
    </div>
    <div class="lesson-body">
      <p class="lesson-intro">${lesson.intro}</p>
      <div class="toggle lesson-levels" id="lesson-levels"></div>
      <div class="lesson-steps" id="lesson-steps"></div>
    </div>`;
  anchor.insertAdjacentElement('afterend', el);

  const stepsEl = el.querySelector('#lesson-steps');
  const toggle = el.querySelector('.lesson-toggle');

  function renderSteps(levelId) {
    const steps = lesson.steps.filter(s => s.level === levelId);
    stepsEl.innerHTML = steps.map((s, i) => `
      <article class="lesson-step">
        <div class="lesson-step-n">${i + 1}</div>
        <div class="lesson-step-main">
          <h3>${s.title}</h3>
          <div class="lesson-step-body">${s.body}</div>
          ${s.state ? `<button class="action lesson-jump" type="button" data-i="${i}">${s.jump ?? 'Show me on the graph'} →</button>` : ''}
        </div>
      </article>`).join('');

    stepsEl.querySelectorAll('.lesson-jump').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = steps[+btn.dataset.i];
        if (step?.state && opts.onJump) opts.onJump(step.state, step);
        // the playground is above the panel; bring it back into view
        document.querySelector('.graph-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    toggle.textContent = open ? 'Hide' : 'Show';
    toggle.setAttribute('aria-expanded', String(open));
    writePrefs(slug, prefs);
  }
  toggle.addEventListener('click', () => setOpen(el.classList.contains('closed')));
  setOpen(prefs.open);

  return { el, setOpen, showLevel: renderSteps };
}
