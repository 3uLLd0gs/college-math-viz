/* The drill UI: prompt, an answer input, Check / Hint / New-problem. On Check
   it parses the student's input (inline message if unreadable), checks numeric
   equivalence against the problem's known derivative, and updates the score. */

import { equivalent } from '../equiv.js';
import { parse, ExprError } from '../expr.js';
import { makeHintLadder } from './hints.js';
import { nextProblem } from './differentiation.js';

export function mountDrill({ root, rng, shell, generator = nextProblem }) {
  const el = typeof root === 'string' ? document.getElementById(root) : root;
  el.innerHTML = `
    <div class="drill-prompt">d/dx <span id="drill-fx"></span></div>
    <div class="drill-io">
      <input id="drill-input" type="text" autocomplete="off" spellcheck="false"
             placeholder="type the derivative, e.g. 2*x*sin(x)+x^2*cos(x)"
             aria-label="Your derivative">
      <button class="action primary" id="drill-check">Check</button>
    </div>
    <div class="drill-feedback" id="drill-feedback" role="status" aria-live="polite"></div>
    <ul class="drill-hints" id="drill-hints"></ul>
    <div class="drill-actions">
      <button class="action" id="drill-hint">Hint</button>
      <button class="action" id="drill-next">New problem</button>
    </div>`;

  const $ = id => el.querySelector('#' + id);
  let problem, ladder;

  function setFeedback(text, kind) {
    const f = $('drill-feedback');
    f.textContent = text;
    f.className = 'drill-feedback' + (kind ? ` ${kind}` : '');
  }

  function load() {
    problem = generator(rng);
    ladder = makeHintLadder(problem.steps);
    $('drill-fx').textContent = `[ ${problem.promptText} ]`;
    $('drill-input').value = '';
    setFeedback('', '');
    $('drill-hints').innerHTML = '';
  }

  function check() {
    const src = $('drill-input').value.trim();
    if (!src) return;
    try { parse(src); }
    catch (e) {
      if (e instanceof ExprError) { setFeedback("Couldn't read that expression — check your syntax.", 'warn'); return; }
      throw e;
    }
    if (equivalent(src, problem.answer)) {
      setFeedback('Correct — that matches the derivative.', 'right');
      shell?.add?.(10);
      shell?.hitStreak?.();
    } else {
      setFeedback('Not equivalent to the derivative. Try a hint?', 'wrong');
      shell?.resetStreak?.();
    }
  }

  function hint() {
    const step = ladder.reveal();
    if (step == null) return;
    const li = document.createElement('li');
    li.textContent = step;
    $('drill-hints').appendChild(li);
  }

  $('drill-check').addEventListener('click', check);
  $('drill-input').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  $('drill-hint').addEventListener('click', hint);
  $('drill-next').addEventListener('click', load);

  load();
  return { load, check, hint, current: () => problem };
}
