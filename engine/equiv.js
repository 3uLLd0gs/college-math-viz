/* Numeric equivalence: two expressions are equivalent if they agree at enough
   random sample points. This handles every algebraic rearrangement without a
   symbolic engine. It is probabilistic, not a proof — but with a dozen-plus
   points the chance of a false match is negligible. It never claims to explain
   WHY two expressions differ, only whether they match. */

import { compile } from './expr.js';

export function equivalent(aSrc, bSrc, opts = {}) {
  const {
    samples = 16, minValid = 8, tol = 1e-7, range = [-3, 3], rng = Math.random,
  } = opts;

  let fa, fb;
  try { fa = compile(aSrc); fb = compile(bSrc); }
  catch { return false; }

  let valid = 0;
  const maxAttempts = samples * 4;
  for (let i = 0; i < maxAttempts && valid < samples; i++) {
    const x = range[0] + rng() * (range[1] - range[0]);
    let va, vb;
    try { va = fa({ x }); vb = fb({ x }); } catch { continue; }
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    valid++;
    const denom = Math.max(1, Math.abs(va), Math.abs(vb));
    if (Math.abs(va - vb) > tol * denom) return false;
  }
  return valid >= minValid;
}
