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
