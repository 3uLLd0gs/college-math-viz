/* The gold "challenge" panel every playground carries: a goal line, a measured
   value against a target, a progress bar, and a status line that latches once
   when the target is met.

   All three playgrounds wrote this by hand and drifted in three ways — the
   measured value used id `c-err` on two pages and `c-val` on the third, each
   formatted its numbers differently, and each invented its own bar-fill curve
   (log-scale on Taylor, linear with different spans on the other two). The ids
   are standardised on `c-val` here; formatting and the fill curve stay
   per-playground because they genuinely differ, but they are now declared once
   at construction instead of recomputed inside every render. */

const el = id => document.getElementById(id);
const clamp01 = v => Math.max(0, Math.min(1, v));

/** Bar fills linearly, reaching empty at `span` multiples of the tolerance. */
export const linearProgress = (span = 6) => (value, tol) => 1 - value / (tol * span);

/** Bar fills on a log scale — right for errors that fall by orders of magnitude.
 *  Half-full exactly at the tolerance, full `decades`/2 decades below it. */
export const logProgress = (decades = 6) => (value, tol) =>
  Math.log10(tol / Math.max(value, 1e-16)) / decades + 0.5;

/**
 * @param opts.format     value -> display string        (default 2sf exponential)
 * @param opts.formatTol  tolerance -> display string    (default: same as format)
 * @param opts.progress   (value, tol) -> 0..1 bar fill  (default linearProgress(6))
 * @param opts.onSolve    fired once, the first time the target is met since the
 *                        last reset(). Read live state from the enclosing scope.
 */
export function challengeMeter(opts = {}) {
  const format = opts.format ?? (v => v.toExponential(2));
  const formatTol = opts.formatTol ?? format;
  const progress = opts.progress ?? linearProgress(6);
  let solved = false;

  /** Call once per render. Returns whether the target is currently met. */
  function update({ value, tol, goal, solvedText, hintText }) {
    const cleared = value < tol;

    if (goal !== undefined) el('c-goal').innerHTML = goal;
    el('c-val').textContent = format(value);
    el('c-tol').textContent = formatTol(tol);
    el('c-bar').style.width = (clamp01(progress(value, tol)) * 100) + '%';

    // Latch before painting the status line so onSolve can award points that a
    // caller's solvedText() might want to mention.
    if (cleared && !solved) {
      solved = true;
      if (opts.onSolve) opts.onSolve();
    }

    const state = el('c-state');
    state.textContent = cleared ? solvedText : hintText;
    state.className = cleared ? 'cstate win' : 'cstate';
    return cleared;
  }

  /** Re-arm for a new puzzle — call when the function/surface/rule changes. */
  function reset() { solved = false; }

  return { update, reset, get solved() { return solved; } };
}
