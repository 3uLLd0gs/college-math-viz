import { fact, sup } from '../../engine/math.js';

/* ---- CONTENT: the FUNCTIONS registry — the only part that changes per concept ---- */
export const FUNCTIONS = [
  { id: 'exp', label: 'eˣ',
    f: x => Math.exp(x),
    coeff: n => 1 / fact(n),
    term: n => n === 0 ? { neg: false, body: '1' } : n === 1 ? { neg: false, body: 'x' } : { neg: false, body: `x${sup(n)}/${n}!` },
    view: { xmin: -3, xmax: 3.4, ymin: -1.6, ymax: 14 },
    challenge: { x0: 2, tol: 0.05, label: 'e²' } },

  { id: 'sin', label: 'sin x',
    f: x => Math.sin(x),
    coeff: n => n % 2 === 1 ? (((n - 1) / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
    term: n => { if (n % 2 === 0) return null; if (n === 1) return { neg: false, body: 'x' };
      return { neg: ((n - 1) / 2) % 2 !== 0, body: `x${sup(n)}/${n}!` }; },
    view: { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 },
    challenge: { x0: 3, tol: 0.02, label: 'sin 3' } },

  { id: 'cos', label: 'cos x',
    f: x => Math.cos(x),
    coeff: n => n % 2 === 0 ? ((n / 2) % 2 === 0 ? 1 : -1) / fact(n) : 0,
    term: n => { if (n % 2 === 1) return null; if (n === 0) return { neg: false, body: '1' };
      return { neg: (n / 2) % 2 !== 0, body: `x${sup(n)}/${n}!` }; },
    view: { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 },
    challenge: { x0: 3, tol: 0.02, label: 'cos 3' } },

  { id: 'ln', label: 'ln(1+x)',
    f: x => x > -1 ? Math.log(1 + x) : NaN,
    coeff: n => n === 0 ? 0 : (n % 2 === 1 ? 1 : -1) / n,
    term: n => { if (n === 0) return null; if (n === 1) return { neg: false, body: 'x' };
      return { neg: n % 2 === 0, body: `x${sup(n)}/${n}` }; },
    view: { xmin: -0.95, xmax: 3, ymin: -4, ymax: 2.2 },
    challenge: { x0: 0.8, tol: 0.01, label: 'ln 1.8' } },

  { id: 'geo', label: '1/(1−x)',
    f: x => x < 1 ? 1 / (1 - x) : NaN,
    coeff: n => 1,
    term: n => n === 0 ? { neg: false, body: '1' } : n === 1 ? { neg: false, body: 'x' } : { neg: false, body: `x${sup(n)}` },
    view: { xmin: -3, xmax: 0.97, ymin: -2, ymax: 9 },
    challenge: { x0: 0.5, tol: 0.005, label: '1/(1−½) = 2' } },
];

export function polyAt(fn, N, x) { let s = 0; for (let n = 0; n <= N; n++) s += fn.coeff(n) * Math.pow(x, n); return s; }

export function formula(fn, N) {
  let parts = [], shown = 0;
  for (let n = 0; n <= N && shown < 7; n++) {
    const t = fn.term(n); if (!t) continue;
    if (parts.length === 0) parts.push((t.neg ? '−' : '') + t.body);
    else parts.push((t.neg ? ' − ' : ' + ') + t.body);
    shown++;
  }
  return parts.join('') + (moreTerms(fn, N) ? ' <span class="dots">+ …</span>' : '');
}
function moreTerms(fn, N) { let c = 0; for (let n = 0; n <= N; n++) if (fn.term(n)) c++; return c > 7; }
