/* Randomized differentiation problems. Each template composes elementary
   factors whose derivatives we already know, and emits BOTH the function and
   its derivative as expr-parseable strings — so no symbolic differentiation is
   ever needed. `promptText` uses Unicode for display; `fExpr`/`answer` are the
   machine-checkable forms. */

import { randInt, pick } from './rng.js';

const SUP = { 2: '²', 3: '³', 4: '⁴' };

function powFactor(rng) {
  const n = randInt(rng, 2, 4);
  return {
    f: `x^${n}`, df: `${n}*x^${n - 1}`,
    pretty: `x${SUP[n]}`, dpretty: `${n}x${n > 2 ? SUP[n - 1] : ''}`,
  };
}

const ATOMS = [
  () => ({ f: 'sin(x)', df: 'cos(x)', pretty: 'sin(x)', dpretty: 'cos(x)' }),
  () => ({ f: 'cos(x)', df: '-sin(x)', pretty: 'cos(x)', dpretty: '−sin(x)' }),
  () => ({ f: 'exp(x)', df: 'exp(x)', pretty: 'eˣ', dpretty: 'eˣ' }),
  () => ({ f: 'ln(x)', df: '1/x', pretty: 'ln(x)', dpretty: '1/x' }),
];

const atomFactor = rng => pick(rng, ATOMS)();
const anyFactor = rng => (rng() < 0.4 ? powFactor(rng) : atomFactor(rng));

function product(rng) {
  const A = anyFactor(rng), B = anyFactor(rng);
  return {
    rule: 'product',
    promptText: `${A.pretty} · ${B.pretty}`,
    fExpr: `(${A.f})*(${B.f})`,
    answer: `(${A.df})*(${B.f})+(${A.f})*(${B.df})`,
    steps: [
      'Use the product rule: (u·v)′ = u′·v + u·v′.',
      `Here u = ${A.pretty}, v = ${B.pretty}, so u′ = ${A.dpretty}, v′ = ${B.dpretty}.`,
      `Combine: ${A.dpretty}·${B.pretty} + ${A.pretty}·${B.dpretty}.`,
    ],
  };
}

function quotient(rng) {
  const A = anyFactor(rng), B = atomFactor(rng);
  return {
    rule: 'quotient',
    promptText: `(${A.pretty}) / (${B.pretty})`,
    fExpr: `(${A.f})/(${B.f})`,
    answer: `((${A.df})*(${B.f})-(${A.f})*(${B.df}))/((${B.f})^2)`,
    steps: [
      'Use the quotient rule: (u/v)′ = (u′·v − u·v′) / v².',
      `Here u = ${A.pretty}, v = ${B.pretty}, so u′ = ${A.dpretty}, v′ = ${B.dpretty}.`,
      'Assemble (u′v − uv′)/v² with those pieces.',
    ],
  };
}

const INNERS = [
  { f: 'x^2+1', df: '2*x', pretty: 'x²+1' },
  { f: '2*x+1', df: '2', pretty: '2x+1' },
  { f: '3*x', df: '3', pretty: '3x' },
  { f: 'x^3', df: '3*x^2', pretty: 'x³' },
];
const OUTERS = [
  { f: u => `sin(${u})`, d: u => `cos(${u})`, pretty: 'sin', dpretty: 'cos' },
  { f: u => `cos(${u})`, d: u => `-sin(${u})`, pretty: 'cos', dpretty: '−sin' },
  { f: u => `exp(${u})`, d: u => `exp(${u})`, pretty: 'exp', dpretty: 'exp' },
];

function chain(rng) {
  const g = pick(rng, INNERS), o = pick(rng, OUTERS);
  return {
    rule: 'chain',
    promptText: `${o.pretty}(${g.pretty})`,
    fExpr: o.f(g.f),
    answer: `(${o.d(g.f)})*(${g.df})`,
    steps: [
      'Use the chain rule: (f(g(x)))′ = f′(g(x))·g′(x).',
      `Outer ${o.pretty}, inner ${g.pretty}: outer derivative ${o.dpretty}(${g.pretty}), inner derivative (${g.pretty})′.`,
      `Multiply the two: ${o.dpretty}(${g.pretty}) · (${g.pretty})′.`,
    ],
  };
}

const TEMPLATES = [product, quotient, chain];
export const RULES = ['product', 'quotient', 'chain'];

export function nextProblem(rng) {
  const p = pick(rng, TEMPLATES)(rng);
  return { id: Math.floor(rng() * 1e9).toString(36), ...p };
}
