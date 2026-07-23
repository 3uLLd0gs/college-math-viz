import { COURSES, PLAYGROUNDS, inCourse, hrefFor } from './engine/sequencer.js';
import { loadProgress, totalProgress } from './engine/score-shell.js';

const el = id => document.getElementById(id);

const totals = totalProgress(PLAYGROUNDS.map(p => p.slug));
el('t-pts').textContent = String(totals.pts);
el('t-badges').textContent = String(totals.badges);
el('t-started').textContent = `${totals.started}/${PLAYGROUNDS.length}`;

el('courses').innerHTML = COURSES
  .filter(c => inCourse(c.id).length)
  .map(course => `
    <section class="course">
      <div class="course-head">
        <h2>${course.label}</h2>
        <span class="count">${inCourse(course.id).length} playground${inCourse(course.id).length === 1 ? '' : 's'}</span>
      </div>
      <div class="grid">
        ${inCourse(course.id).map(card).join('')}
      </div>
    </section>`).join('');

function card(p) {
  const prog = loadProgress(p.slug);
  const played = prog.pts > 0 || prog.badges.length > 0;
  return `
    <a class="pcard${played ? ' played' : ''}" href="${hrefFor(p.slug)}">
      <div class="pcard-tag">${p.tag}</div>
      <h3>${p.title}</h3>
      <p>${p.blurb}</p>
      <div class="pcard-foot">
        ${played
          ? `<span class="pts">${prog.pts} pts</span><span class="bdg">${prog.badges.length} badge${prog.badges.length === 1 ? '' : 's'}</span>`
          : '<span class="new">Not started</span>'}
        <span class="go">Open →</span>
      </div>
    </a>`;
}
