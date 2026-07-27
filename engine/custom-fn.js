/* Turns an untrusted expression string into a safe numeric function for the
   custom-content feature. It never executes the string as code — it delegates
   entirely to engine/expr.js's whitelist parser. The returned f is total: it
   yields NaN where the expression is undefined (e.g. ln of a negative) rather
   than throwing, because the playground's plot/sum code tolerates NaN. */

import { compile, ExprError } from './expr.js';

// A spread of sample points to sanity-check that the function is a real number
// SOMEWHERE — catches expressions that are NaN everywhere (e.g. sqrt of a
// always-negative argument) without rejecting ordinary poles like 1/x.
const SAMPLES = [-2.3, -1.1, -0.3, 0.4, 0.9, 1.7, 2.6, 3.4];

export function compileCustom(src) {
  let g;
  try {
    g = compile(src);
  } catch (e) {
    if (e instanceof ExprError) return { f: null, error: "Couldn't read that expression." };
    throw e;
  }

  const f = x => {
    try {
      const y = g({ x });
      return Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };

  const anyFinite = SAMPLES.some(x => Number.isFinite(f(x)));
  if (!anyFinite) return { f: null, error: "That function isn't a real number anywhere here." };

  return { f, error: '' };
}

/** A 2-D view rectangle bracketing f over [a,b]: samples for the y-range,
   pads x and y, and always includes y=0. Falls back to a [-1,1] band when f
   is non-finite everywhere. (Extracted from riemann-sums' inline customView.) */
export function viewFromDomain(f, a, b) {
  const N = 64; let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= N; i++) {
    const y = f(a + (b - a) * i / N);
    if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) { lo = -1; hi = 1; }
  const padX = (b - a) * 0.15 || 0.5, padY = (hi - lo) * 0.2 || 0.5;
  return { xmin: a - padX, xmax: b + padX, ymin: Math.min(0, lo) - padY, ymax: hi + padY };
}

/** Central-difference derivative of a numeric function. NaN-safe: if either
   sample is non-finite (a domain edge), returns NaN rather than a bogus slope. */
export function numericDerivative(f, eps = 1e-5) {
  return x => {
    const a = f(x + eps), b = f(x - eps);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
    return (a - b) / (2 * eps);
  };
}

/** Wire a custom-function input row: `input`+Enter on the expression field and
   `change` on the optional from/to number fields all call
   `onSubmit(src, a, b)` (empty src clears the message and does not submit).
   Returns setters the playground uses to reflect URL-loaded state back into the
   fields (.value — inert) and to show inline errors (textContent). */
export function wireCustomInput({ exprEl, aEl, bEl, msgEl, onSubmit }) {
  const setMsg = text => { if (msgEl) msgEl.textContent = text; };
  function submit() {
    const src = exprEl.value.trim();
    if (!src) { setMsg(''); return; }
    onSubmit(src, aEl ? aEl.value : undefined, bEl ? bEl.value : undefined);
  }
  exprEl.addEventListener('input', submit);
  exprEl.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  if (aEl) aEl.addEventListener('change', submit);
  if (bEl) bEl.addEventListener('change', submit);
  return {
    setMsg,
    setFields(src, a, b) {
      if (exprEl && exprEl.value.trim() !== src) exprEl.value = src;
      if (aEl && a !== undefined) aEl.value = String(a);
      if (bEl && b !== undefined) bEl.value = String(b);
    },
  };
}

// A 5×5 grid across [-2.5,2.5]² to sanity-check a two-variable function is a
// real number SOMEWHERE (catches "never real" without rejecting ordinary poles).
const GRID2 = [-2.5, -1.2, 0, 1.2, 2.5];

/** Compile an untrusted f(x,y) to a NaN-safe two-argument numeric function.
   Delegates all evaluation to engine/expr.js — never executes the string. */
export function compileCustom2(src) {
  let g;
  try {
    g = compile(src);
  } catch (e) {
    if (e instanceof ExprError) return { f: null, error: "Couldn't read that expression." };
    throw e;
  }
  const f = (x, y) => {
    try {
      const v = g({ x, y });
      return Number.isFinite(v) ? v : NaN;
    } catch {
      return NaN;
    }
  };
  let anyFinite = false;
  outer: for (const x of GRID2) for (const y of GRID2) {
    if (Number.isFinite(f(x, y))) { anyFinite = true; break outer; }
  }
  if (!anyFinite) return { f: null, error: "That function isn't a real number anywhere here." };
  return { f, error: '' };
}

/** Numeric partial derivatives of a two-variable function, via central
   differences. NaN-safe when a sample is non-finite. */
export function numericPartials(f, eps = 1e-5) {
  return {
    fx: (x, y) => {
      const a = f(x + eps, y), b = f(x - eps, y);
      return (Number.isFinite(a) && Number.isFinite(b)) ? (a - b) / (2 * eps) : NaN;
    },
    fy: (x, y) => {
      const a = f(x, y + eps), b = f(x, y - eps);
      return (Number.isFinite(a) && Number.isFinite(b)) ? (a - b) / (2 * eps) : NaN;
    },
  };
}
