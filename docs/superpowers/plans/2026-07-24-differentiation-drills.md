# Differentiation Drill Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A seeded, offline practice-drill subsystem for differentiation rules — randomized `d/dx` problems whose free-form answers are judged by numeric equivalence, with a hint ladder — surfaced as a new "Practice" course.

**Architecture:** A hand-rolled safe expression evaluator (`engine/expr.js`) feeds a numeric equivalence checker (`engine/equiv.js`). A seeded RNG drives a template generator that emits each problem's function AND its known derivative together (no symbolic differentiation). An input-driven shell parses the student's answer, checks equivalence, and reveals hints. The drill is a page under `drills/`, wired into the existing sequencer/landing/nav plumbing from Phase 1.

**Tech Stack:** Vanilla JS ES modules, Vitest + happy-dom (unit), Playwright (E2E), Vite multi-page build. No runtime dependencies.

## Global Constraints

- **No runtime network calls; no backend.** Everything offline; state/sharing ride on localStorage and the URL.
- **No `eval` / `Function` on any user string.** `engine/expr.js` is a whitelist parser returning a numeric evaluator; it never executes JS.
- **Design system fixed.** Colours from `engine/tokens.css` custom properties. Shared CSS in `engine/chrome.css` (linked, never `@import`ed); page-specific CSS in the page's own `<style>`.
- **TDD for every pure module**; DOM/page behavior verified by Playwright.
- **Conventional commits**; every commit message ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `phase2-drills` (already created).
- **Drill slug (verbatim):** `differentiation-rules`. Course id (verbatim): `practice`.

---

## File Structure

- Create `engine/expr.js` — tokenize + parse + evaluate a whitelisted math grammar; `compile/parse/evaluate/ExprError`.
- Create `engine/expr.test.js`.
- Create `engine/equiv.js` — `equivalent(a, b, opts)` numeric probing.
- Create `engine/equiv.test.js`.
- Create `engine/drill/rng.js` — seeded PRNG + `randInt`/`pick`.
- Create `engine/drill/rng.test.js`.
- Create `engine/drill/differentiation.js` — `nextProblem(rng)` template generator + `RULES`.
- Create `engine/drill/differentiation.test.js`.
- Create `engine/drill/hints.js` — `makeHintLadder(steps)`.
- Create `engine/drill/hints.test.js`.
- Create `engine/drill/drill-shell.js` — `mountDrill({ root, rng, shell })`.
- Create `engine/drill/drill-shell.test.js`.
- Append `.drill-*` styles to `engine/chrome.css`.
- Create `drills/differentiation-rules/index.html` and `drills/differentiation-rules/drill.js`.
- Modify `engine/sequencer.js` (Practice course, drill entry, `kind`-aware `hrefFor`) and `engine/sequencer.test.js`.
- Modify `home.js` (course-noun label).
- Modify `vite.config.js` (build input).
- Create `e2e/drills.spec.js`.

---

## Task 1: `engine/expr.js` — safe expression parser + evaluator

**Files:**
- Create: `engine/expr.js`
- Test: `engine/expr.test.js`

**Interfaces:**
- Produces:
  - `compile(src: string) -> (scope: {x?: number}) => number`
  - `parse(src: string) -> Node` and `evaluate(node: Node, scope) -> number`
  - `class ExprError extends Error`
  - AST node shapes: `{t:'num', v}`, `{t:'var', name}`, `{t:'neg', a}`, `{t:'bin', op, a, b}`, `{t:'call', name, a}`.
- Whitelist: variable `x`; constants `pi`, `e`; functions `sin cos tan exp ln sqrt abs`; operators `+ - * / ^` (`^` right-associative), unary `-`, parentheses.

- [ ] **Step 1: Write the failing tests**

```js
// engine/expr.test.js
import { describe, it, expect } from 'vitest';
import { compile, parse, ExprError } from './expr.js';

const at = (src, x) => compile(src)({ x });

describe('expr evaluate', () => {
  it('evaluates arithmetic with precedence', () => {
    expect(at('1+2*3', 0)).toBe(7);
    expect(at('(1+2)*3', 0)).toBe(9);
    expect(at('2*x+1', 4)).toBe(9);
  });
  it('exponent is right-associative and binds tighter than unary minus', () => {
    expect(at('2^3^2', 0)).toBe(512);      // 2^(3^2)
    expect(at('-x^2', 3)).toBe(-9);        // -(x^2)
    expect(at('2^-1', 0)).toBeCloseTo(0.5, 12);
  });
  it('evaluates whitelisted functions and constants', () => {
    expect(at('sin(0)+cos(0)', 0)).toBeCloseTo(1, 12);
    expect(at('ln(exp(x))', 2)).toBeCloseTo(2, 12);
    expect(at('sqrt(x)', 9)).toBeCloseTo(3, 12);
    expect(compile('pi')({})).toBeCloseTo(Math.PI, 12);
  });
});

describe('expr safety', () => {
  it('rejects unknown functions and names', () => {
    expect(() => parse('alert(1)')).toThrow(ExprError);
    expect(() => parse('__proto__')).toThrow(ExprError);
    expect(() => parse('y+1')).toThrow(ExprError);
  });
  it('rejects out-of-grammar characters and structure', () => {
    expect(() => parse('x.constructor')).toThrow(ExprError);
    expect(() => parse('1;2')).toThrow(ExprError);
    expect(() => parse('2*(3')).toThrow(ExprError);
    expect(() => parse('')).toThrow(ExprError);
  });
  it('an unbound variable throws rather than leaking globals', () => {
    // x is grammatical but unbound here → ExprError, never a global lookup
    expect(() => compile('x')({})).toThrow(ExprError);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/expr.test.js`
Expected: FAIL (module not found / exports missing).

- [ ] **Step 3: Implement `engine/expr.js`**

```js
/* A tiny, dependency-free evaluator for a whitelisted math grammar. It parses
   a source string to an AST and evaluates it against a numeric scope. It never
   uses eval/Function and never touches host objects: unknown names and
   functions are rejected at parse time, so a hostile string cannot execute. */

export class ExprError extends Error {}

// Object.create(null): tables with NO prototype chain. A plain object literal
// would make `'__proto__' in CONSTS` and `'constructor' in FUNCS` resolve true
// via Object.prototype, letting `parse('__proto__')` or `constructor(...)`
// slip through — a prototype-pollution-style hole. Null-prototype tables mean
// `in` only sees whitelisted OWN keys.
const FUNCS = Object.assign(Object.create(null), {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  exp: Math.exp, ln: Math.log, sqrt: Math.sqrt, abs: Math.abs,
});
const CONSTS = Object.assign(Object.create(null), { pi: Math.PI, e: Math.E });

function tokenize(src) {
  const tokens = [];
  const re = /\s*([A-Za-z_]\w*|\d+\.?\d*|\.\d+|[()+\-*/^])/y;
  let i = 0;
  const trimmed = src.trimEnd();
  while (i < trimmed.length) {
    re.lastIndex = i;
    const m = re.exec(trimmed);
    if (!m || m.index + m[0].length <= i) {
      throw new ExprError(`Unexpected character: ${trimmed.slice(i)}`);
    }
    tokens.push(m[1]);
    i = re.lastIndex;
  }
  return tokens;
}

export function parse(src) {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const expect = t => { if (next() !== t) throw new ExprError(`Expected '${t}'`); };

  const expr = () => addition();
  function addition() {
    let a = multiplication();
    while (peek() === '+' || peek() === '-') a = { t: 'bin', op: next(), a, b: multiplication() };
    return a;
  }
  function multiplication() {
    let a = unary();
    while (peek() === '*' || peek() === '/') a = { t: 'bin', op: next(), a, b: unary() };
    return a;
  }
  function unary() {
    if (peek() === '-') { next(); return { t: 'neg', a: unary() }; }
    if (peek() === '+') { next(); return unary(); }
    return power();
  }
  function power() {
    const base = atom();
    if (peek() === '^') { next(); return { t: 'bin', op: '^', a: base, b: unary() }; }
    return base;
  }
  function atom() {
    const t = peek();
    if (t === undefined) throw new ExprError('Unexpected end of expression');
    if (t === '(') { next(); const e = expr(); expect(')'); return e; }
    if (/^(\d|\.)/.test(t)) return { t: 'num', v: parseFloat(next()) };
    if (/^[A-Za-z_]/.test(t)) {
      const name = next();
      if (peek() === '(') {
        if (!(name in FUNCS)) throw new ExprError(`Unknown function: ${name}`);
        next(); const arg = expr(); expect(')');
        return { t: 'call', name, a: arg };
      }
      if (name === 'x') return { t: 'var', name: 'x' };
      if (name in CONSTS) return { t: 'num', v: CONSTS[name] };
      throw new ExprError(`Unknown name: ${name}`);
    }
    throw new ExprError(`Unexpected token: ${t}`);
  }

  const tree = expr();
  if (pos !== toks.length) throw new ExprError(`Unexpected trailing token: ${peek()}`);
  return tree;
}

export function evaluate(node, scope = {}) {
  switch (node.t) {
    case 'num': return node.v;
    case 'var':
      if (!(node.name in scope)) throw new ExprError(`Unbound variable: ${node.name}`);
      return scope[node.name];
    case 'neg': return -evaluate(node.a, scope);
    case 'call': return FUNCS[node.name](evaluate(node.a, scope));
    case 'bin': {
      const a = evaluate(node.a, scope), b = evaluate(node.b, scope);
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '^': return Math.pow(a, b);
        default: throw new ExprError(`Bad operator: ${node.op}`);
      }
    }
    default: throw new ExprError('Bad node');
  }
}

export function compile(src) {
  const tree = parse(src);
  return scope => evaluate(tree, scope);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/expr.test.js`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add engine/expr.js engine/expr.test.js
git commit -m "feat: safe whitelist expression parser and evaluator"
```

---

## Task 2: `engine/equiv.js` — numeric equivalence checker

**Files:**
- Create: `engine/equiv.js`
- Test: `engine/equiv.test.js`

**Interfaces:**
- Consumes: `compile` from `engine/expr.js`.
- Produces: `equivalent(aSrc: string, bSrc: string, opts?) -> boolean`. `opts = { samples=16, minValid=8, tol=1e-7, range=[-3,3], rng=Math.random }`.

- [ ] **Step 1: Write the failing tests**

```js
// engine/equiv.test.js
import { describe, it, expect } from 'vitest';
import { equivalent } from './equiv.js';

// deterministic rng for reproducible tests
const seq = (() => { let s = 0.123; return () => (s = (s * 9301 + 49297) % 233280 / 233280); });

describe('equivalent', () => {
  it('accepts algebraic rearrangements of the same function', () => {
    expect(equivalent('2*x*sin(x)+x^2*cos(x)', 'x*(2*sin(x)+x*cos(x))', { rng: seq() })).toBe(true);
    expect(equivalent('(x+1)^2', 'x^2+2*x+1', { rng: seq() })).toBe(true);
  });
  it('rejects genuinely different functions', () => {
    expect(equivalent('2*x', '2*x+1', { rng: seq() })).toBe(false);
    expect(equivalent('sin(x)', 'cos(x)', { rng: seq() })).toBe(false);
  });
  it('returns false for unparseable input rather than throwing', () => {
    expect(equivalent('2*x', 'alert(1)', { rng: seq() })).toBe(false);
  });
  it('handles functions with poles by sampling around them', () => {
    // 1/x vs 1/x — equal wherever defined; sampling skips x≈0
    expect(equivalent('1/x', '1/x', { rng: seq() })).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/equiv.test.js`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `engine/equiv.js`**

```js
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/equiv.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/equiv.js engine/equiv.test.js
git commit -m "feat: numeric expression-equivalence checker"
```

---

## Task 3: `engine/drill/rng.js` — seeded PRNG

**Files:**
- Create: `engine/drill/rng.js`
- Test: `engine/drill/rng.test.js`

**Interfaces:**
- Produces: `makeRng(seed: number) -> () => number` (in `[0,1)`, deterministic); `randInt(rng, lo, hi) -> int` (inclusive both ends); `pick(rng, array) -> element`.

- [ ] **Step 1: Write the failing tests**

```js
// engine/drill/rng.test.js
import { describe, it, expect } from 'vitest';
import { makeRng, randInt, pick } from './rng.js';

describe('makeRng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(42), b = makeRng(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it('differs across seeds and stays in [0,1)', () => {
    const a = makeRng(1), b = makeRng(2);
    expect(a()).not.toBe(b());
    const r = makeRng(7);
    for (let i = 0; i < 100; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  it('randInt is inclusive and pick returns a member', () => {
    const r = makeRng(3);
    for (let i = 0; i < 100; i++) { const n = randInt(r, 2, 4); expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(4); }
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) expect(arr).toContain(pick(makeRng(i), arr));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/drill/rng.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `engine/drill/rng.js`**

```js
/* A tiny deterministic PRNG (mulberry32). Same seed → same sequence, so a
   professor can share an exact problem set by URL and tests are reproducible. */

export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/drill/rng.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/drill/rng.js engine/drill/rng.test.js
git commit -m "feat: seeded PRNG for reproducible drill problem sets"
```

---

## Task 4: `engine/drill/differentiation.js` — problem generator

**Files:**
- Create: `engine/drill/differentiation.js`
- Test: `engine/drill/differentiation.test.js`

**Interfaces:**
- Consumes: `randInt, pick` from `engine/drill/rng.js`; `compile` from `engine/expr.js` (test only).
- Produces:
  - `nextProblem(rng) -> { id, promptText, fExpr, answer, rule, steps: string[] }` where `fExpr` and `answer` are `engine/expr`-parseable strings and `answer` is the derivative of `fExpr`.
  - `RULES = ['product', 'quotient', 'chain']`.

**Note on correctness:** each template emits `fExpr` and `answer` together from known pieces (never differentiating `fExpr`). The test proves the emitted `answer` really is the derivative by numeric central difference.

- [ ] **Step 1: Write the failing test**

```js
// engine/drill/differentiation.test.js
import { describe, it, expect } from 'vitest';
import { compile } from '../expr.js';
import { makeRng } from './rng.js';
import { nextProblem, RULES } from './differentiation.js';

const numDeriv = (f, x, h = 1e-5) => (f({ x: x + h }) - f({ x: x - h })) / (2 * h);

describe('nextProblem', () => {
  it('emits an answer that is the true derivative of fExpr (numeric self-check)', () => {
    const rng = makeRng(2024);
    for (let i = 0; i < 200; i++) {
      const p = nextProblem(rng);
      const f = compile(p.fExpr);
      const df = compile(p.answer);
      let checked = 0;
      for (const x of [0.3, 0.7, 1.2, 1.8, 2.4]) {
        const approx = numDeriv(f, x), stated = df({ x });
        if (!Number.isFinite(approx) || !Number.isFinite(stated)) continue;
        checked++;
        expect(Math.abs(approx - stated)).toBeLessThan(1e-3 * Math.max(1, Math.abs(stated)));
      }
      expect(checked).toBeGreaterThan(0);
      expect(RULES).toContain(p.rule);
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
      expect(typeof p.promptText).toBe('string');
      expect(p.promptText.length).toBeGreaterThan(0);
    }
  });
  it('is deterministic for a given seed', () => {
    const a = nextProblem(makeRng(5)), b = nextProblem(makeRng(5));
    expect(a.fExpr).toBe(b.fExpr);
    expect(a.answer).toBe(b.answer);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/drill/differentiation.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `engine/drill/differentiation.js`**

```js
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/drill/differentiation.test.js`
Expected: PASS (the numeric self-check validates every template).

- [ ] **Step 5: Commit**

```bash
git add engine/drill/differentiation.js engine/drill/differentiation.test.js
git commit -m "feat: differentiation problem generator with numeric self-check"
```

---

## Task 5: `engine/drill/hints.js` — hint ladder

**Files:**
- Create: `engine/drill/hints.js`
- Test: `engine/drill/hints.test.js`

**Interfaces:**
- Produces: `makeHintLadder(steps: string[]) -> { reveal(): string|null, revealed: string[], done: boolean, remaining: number }`.

- [ ] **Step 1: Write the failing test**

```js
// engine/drill/hints.test.js
import { describe, it, expect } from 'vitest';
import { makeHintLadder } from './hints.js';

describe('makeHintLadder', () => {
  it('reveals one step at a time, then reports done', () => {
    const L = makeHintLadder(['a', 'b', 'c']);
    expect(L.done).toBe(false);
    expect(L.remaining).toBe(3);
    expect(L.reveal()).toBe('a');
    expect(L.revealed).toEqual(['a']);
    expect(L.reveal()).toBe('b');
    expect(L.reveal()).toBe('c');
    expect(L.done).toBe(true);
    expect(L.remaining).toBe(0);
    expect(L.reveal()).toBeNull();
    expect(L.revealed).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/drill/hints.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `engine/drill/hints.js`**

```js
/* A pure hint-ladder state machine: reveal one step per call, no DOM. */

export function makeHintLadder(steps) {
  let i = 0;
  return {
    reveal() { return i < steps.length ? steps[i++] : null; },
    get revealed() { return steps.slice(0, i); },
    get done() { return i >= steps.length; },
    get remaining() { return steps.length - i; },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/drill/hints.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/drill/hints.js engine/drill/hints.test.js
git commit -m "feat: hint-ladder state machine"
```

---

## Task 6: `engine/drill/drill-shell.js` — input-driven UI + styles

**Files:**
- Create: `engine/drill/drill-shell.js`
- Test: `engine/drill/drill-shell.test.js`
- Modify: `engine/chrome.css` (append `.drill-*` styles)

**Interfaces:**
- Consumes: `equivalent` (`engine/equiv.js`), `parse`/`ExprError` (`engine/expr.js`), `makeHintLadder` (`./hints.js`), `nextProblem` (`./differentiation.js`).
- Produces: `mountDrill({ root, rng, shell, generator=nextProblem }) -> { load(), check(), hint(), current() }`. `root` is an element or element id. `shell` is a `ScoreShell`-like object with `add(n)`, `hitStreak()`, `resetStreak()` (optional — calls are guarded).

- [ ] **Step 1: Write the failing test**

```js
// engine/drill/drill-shell.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountDrill } from './drill-shell.js';

// A generator returning one fixed problem, so the test knows the answer.
const fixed = () => ({
  id: 'x', rule: 'product', promptText: 'x² · sin(x)',
  fExpr: '(x^2)*(sin(x))', answer: '(2*x)*(sin(x))+(x^2)*(cos(x))',
  steps: ['step one', 'step two', 'step three'],
});

let root, shell;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root');
  shell = { add: vi.fn(), hitStreak: vi.fn(), resetStreak: vi.fn() };
});

describe('mountDrill', () => {
  it('accepts a correct (rearranged) answer and rewards the streak', () => {
    mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-input').value = 'x*(2*sin(x)+x*cos(x))';
    root.querySelector('#drill-check').click();
    expect(root.querySelector('#drill-feedback').className).toContain('right');
    expect(shell.add).toHaveBeenCalled();
    expect(shell.hitStreak).toHaveBeenCalled();
  });
  it('rejects a wrong answer and resets the streak', () => {
    mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-input').value = '2*x';
    root.querySelector('#drill-check').click();
    expect(root.querySelector('#drill-feedback').className).toContain('wrong');
    expect(shell.resetStreak).toHaveBeenCalled();
  });
  it('shows an inline message for unreadable input without scoring', () => {
    mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-input').value = 'alert(1)';
    root.querySelector('#drill-check').click();
    expect(root.querySelector('#drill-feedback').className).toContain('warn');
    expect(shell.add).not.toHaveBeenCalled();
    expect(shell.resetStreak).not.toHaveBeenCalled();
  });
  it('reveals hints one at a time and loads a new problem', () => {
    const api = mountDrill({ root, rng: () => 0.5, shell, generator: fixed });
    root.querySelector('#drill-hint').click();
    expect(root.querySelectorAll('#drill-hints li').length).toBe(1);
    root.querySelector('#drill-hint').click();
    expect(root.querySelectorAll('#drill-hints li').length).toBe(2);
    root.querySelector('#drill-next').click();
    expect(root.querySelectorAll('#drill-hints li').length).toBe(0);
    expect(api.current().promptText).toBe('x² · sin(x)');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/drill/drill-shell.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `engine/drill/drill-shell.js`**

```js
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run engine/drill/drill-shell.test.js`
Expected: PASS.

- [ ] **Step 5: Append `.drill-*` styles to `engine/chrome.css`**

Append at the end of `engine/chrome.css`:

```css
/* ---- differentiation drill ---- */
.drill-prompt{font-family:"Fraunces",serif;font-weight:700;font-size:26px;color:var(--ink);margin-bottom:16px}
.drill-prompt #drill-fx{color:var(--accent)}
.drill-io{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.drill-io #drill-input{flex:1;min-width:240px;font-family:"JetBrains Mono",monospace;font-size:14px;
  color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:11px 13px}
.drill-io #drill-input:focus{outline:2px solid var(--accent);outline-offset:2px}
.drill-feedback{font-size:13px;min-height:20px;line-height:1.5;margin-bottom:10px}
.drill-feedback.right{color:var(--approx)}
.drill-feedback.wrong{color:var(--error)}
.drill-feedback.warn{color:var(--gold)}
.drill-hints{list-style:none;padding:0;margin:0 0 12px;display:flex;flex-direction:column;gap:7px}
.drill-hints li{font-size:12.5px;color:var(--muted);line-height:1.6;background:var(--panel-2);
  border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:8px;padding:9px 12px;max-width:72ch}
.drill-actions{display:flex;gap:10px}
```

- [ ] **Step 6: Run the full suite, build, commit**

Run: `npm test && npm run build`
Expected: all green; build clean.

```bash
git add engine/drill/drill-shell.js engine/drill/drill-shell.test.js engine/chrome.css
git commit -m "feat: input-driven drill shell with hint reveal and styles"
```

---

## Task 7: `drills/differentiation-rules/` page

**Files:**
- Create: `drills/differentiation-rules/index.html`
- Create: `drills/differentiation-rules/drill.js`

**Interfaces:**
- Consumes: `ScoreShell` (`engine/score-shell.js`), `createConfetti` (`engine/confetti.js`), `mountNav` (`engine/sequencer.js`), `mountPresenter` (`engine/dom.js`), `makeRng` (`engine/drill/rng.js`), `mountDrill` (`engine/drill/drill-shell.js`).

- [ ] **Step 1: Create `drills/differentiation-rules/index.html`**

Mirrors the playground header (brand + scoreboard + `#present` header child + `#fx` confetti canvas + `.toast-wrap`), links `engine/chrome.css`, and mounts the drill into `#drill-root`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Differentiation Drills · Practice the Chain, Product &amp; Quotient Rules</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../engine/chrome.css">
<style>
  .drill-card{max-width:720px}
  .drill-intro{font-size:13.5px;color:var(--muted);line-height:1.7;margin-bottom:20px;max-width:68ch}
</style>
</head>
<body>
<canvas id="fx"></canvas>
<div class="toast-wrap" id="toasts"></div>
<div class="wrap">
  <header>
    <div class="brand">
      <div class="kicker">Math · Visual Studio</div>
      <h1>Differentiation <em>Drills</em></h1>
    </div>
    <button class="chip" id="present" type="button" title="Presenter mode" aria-pressed="false" style="cursor:pointer">Present</button>
    <div class="scoreboard">
      <div class="chip pts"><div class="lab">Points</div><div class="val" id="s-pts">0</div></div>
      <div class="chip streak"><div class="lab">Streak</div><div class="val" id="s-streak">0</div></div>
      <div class="chip"><div class="lab">Badges</div><div class="val" id="s-badges">0</div></div>
    </div>
  </header>
  <div class="card drill-card">
    <p class="drill-intro">Differentiate each expression and type the result — any algebraically equivalent form is accepted. Stuck? Reveal the rule, then the steps, one at a time. Add <code>?seed=1234</code> to the URL to share an identical problem set.</p>
    <div id="drill-root"></div>
  </div>
</div>
<script type="module" src="./drill.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `drills/differentiation-rules/drill.js`**

```js
import { ScoreShell } from '../../engine/score-shell.js';
import { createConfetti } from '../../engine/confetti.js';
import { mountNav } from '../../engine/sequencer.js';
import { mountPresenter } from '../../engine/dom.js';
import { makeRng } from '../../engine/drill/rng.js';
import { mountDrill } from '../../engine/drill/drill-shell.js';

const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? (Number(params.get('seed')) >>> 0) : ((Math.random() * 2 ** 32) >>> 0);
const rng = makeRng(seed);

const shell = new ScoreShell(createConfetti(), { slug: 'differentiation-rules' });
mountNav('differentiation-rules');
mountDrill({ root: 'drill-root', rng, shell });
mountPresenter();
```

- [ ] **Step 3: Verify the wiring**

The page cannot build until Task 8 adds it to the Vite input map and the sequencer entry (so `mountNav('differentiation-rules')` resolves). Confirm by reading: `drill.js` imports resolve to real exports; `#drill-root`, `#present`, `#fx`, `#s-pts/#s-streak/#s-badges` exist in the HTML. Do NOT commit yet — commit together with Task 8 so the branch never has a page that isn't wired in. Proceed to Task 8.

---

## Task 8: Sequencer, landing, and build integration

**Files:**
- Modify: `engine/sequencer.js`
- Modify: `engine/sequencer.test.js`
- Modify: `home.js`
- Modify: `vite.config.js`

**Interfaces:**
- Consumes: the drill page from Task 7.
- Produces: catalogue entry `{ slug:'differentiation-rules', course:'practice', kind:'drill', title, tag, blurb }`; `hrefFor(slug)` returns `/drills/<slug>/` when `kind==='drill'`.

- [ ] **Step 1: Add the failing sequencer tests**

Append to `engine/sequencer.test.js` (inside the existing top-level scope; it already imports from `./sequencer.js` — add `hrefFor`, `inCourse` to that import if not present):

```js
import { hrefFor, inCourse } from './sequencer.js';

describe('drills in the catalogue', () => {
  it('routes drills to /drills/ and playgrounds to /playgrounds/', () => {
    expect(hrefFor('differentiation-rules')).toBe('/drills/differentiation-rules/');
    expect(hrefFor('gradient')).toBe('/playgrounds/gradient/');
  });
  it('groups the drill under the practice course', () => {
    expect(inCourse('practice').map(p => p.slug)).toContain('differentiation-rules');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run engine/sequencer.test.js`
Expected: FAIL (`hrefFor('differentiation-rules')` returns `/playgrounds/...`; `practice` course empty).

- [ ] **Step 3: Edit `engine/sequencer.js`**

Add the Practice course to `COURSES` (append after `calc3`):

```js
  { id: 'calc3', label: 'Calculus 3' },
  { id: 'practice', label: 'Practice' },
```

Append the drill entry to the end of the `PLAYGROUNDS` array (after `greens-theorem`):

```js
  {
    slug: 'differentiation-rules', course: 'practice', kind: 'drill',
    title: 'Differentiation Drills',
    tag: 'Practice the chain, product & quotient rules',
    blurb: 'Randomized d/dx problems checked for mathematical equivalence, with hints revealed one rung at a time. Add ?seed to share an exact set.',
  },
```

Replace the `hrefFor` definition (currently `export const hrefFor = slug => \`/playgrounds/${slug}/\`;`) with a `kind`-aware version:

```js
export const hrefFor = slug => {
  const p = bySlug(slug);
  return p?.kind === 'drill' ? `/drills/${slug}/` : `/playgrounds/${slug}/`;
};
```

- [ ] **Step 4: Edit `home.js` — course-appropriate noun**

In `home.js`, the course header hardcodes "playground". Replace the count line inside the `COURSES.filter(...).map(course => ...)` template. Change:

```js
        <span class="count">${inCourse(course.id).length} playground${inCourse(course.id).length === 1 ? '' : 's'}</span>
```

to:

```js
        <span class="count">${inCourse(course.id).length} ${course.id === 'practice' ? 'drill' : 'playground'}${inCourse(course.id).length === 1 ? '' : 's'}</span>
```

- [ ] **Step 5: Edit `vite.config.js` — add the build input**

In the `rollupOptions.input` map, after the `greens-theorem` line, add:

```js
        'greens-theorem': resolve(__dirname, 'playgrounds/greens-theorem/index.html'),
        'differentiation-rules': resolve(__dirname, 'drills/differentiation-rules/index.html'),
```

- [ ] **Step 6: Run tests + build**

Run: `npm test && npm run build`
Expected: sequencer tests PASS; build emits `drills/differentiation-rules/index.html` with no error.

- [ ] **Step 7: Commit Task 7 + Task 8 together**

```bash
git add drills/differentiation-rules/ engine/sequencer.js engine/sequencer.test.js home.js vite.config.js
git commit -m "feat: differentiation drill page wired into the Practice course"
```

---

## Task 9: End-to-end suite for the drill

**Files:**
- Create: `e2e/drills.spec.js`

**Interfaces:**
- Consumes: the built drill page (served by Playwright's `webServer`), and — imported directly in the spec — `makeRng`/`nextProblem` to compute the expected seeded problem.

- [ ] **Step 1: Write the spec**

```js
// e2e/drills.spec.js
import { test, expect } from '@playwright/test';
import { makeRng } from '../engine/drill/rng.js';
import { nextProblem } from '../engine/drill/differentiation.js';

test('the seeded first problem shows the expected prompt and accepts its reference answer', async ({ page }) => {
  const p = nextProblem(makeRng(42));            // same seed the page will use
  await page.goto('/drills/differentiation-rules/?seed=42');
  await expect(page.locator('#drill-fx')).toContainText(p.promptText);   // seed reproduces the problem
  await page.fill('#drill-input', p.answer);
  await page.click('#drill-check');
  await expect(page.locator('#drill-feedback')).toHaveClass(/right/);
});

test('a wrong answer is rejected', async ({ page }) => {
  await page.goto('/drills/differentiation-rules/?seed=42');
  await page.fill('#drill-input', '0');
  await page.click('#drill-check');
  await expect(page.locator('#drill-feedback')).toHaveClass(/wrong/);
});

test('unreadable input gets an inline warning, not a crash', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/drills/differentiation-rules/?seed=1');
  await page.fill('#drill-input', 'alert(1)');
  await page.click('#drill-check');
  await expect(page.locator('#drill-feedback')).toHaveClass(/warn/);
  expect(errors).toEqual([]);
});

test('hints reveal one at a time', async ({ page }) => {
  await page.goto('/drills/differentiation-rules/?seed=7');
  await expect(page.locator('#drill-hints li')).toHaveCount(0);
  await page.click('#drill-hint');
  await expect(page.locator('#drill-hints li')).toHaveCount(1);
  await page.click('#drill-hint');
  await expect(page.locator('#drill-hints li')).toHaveCount(2);
});

test('the same seed reproduces the same first problem across loads', async ({ page, context }) => {
  await page.goto('/drills/differentiation-rules/?seed=99');
  const a = await page.locator('#drill-fx').textContent();
  const p2 = await context.newPage();
  await p2.goto('/drills/differentiation-rules/?seed=99');
  expect(await p2.locator('#drill-fx').textContent()).toBe(a);
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS. If the seeded-answer test fails, the page's seed handling (`Number(seed)>>>0`) or the generator's determinism is the culprit — the spec and the page must call `makeRng` with the identical seed value.

- [ ] **Step 3: Commit**

```bash
git add e2e/drills.spec.js
git commit -m "test: end-to-end suite for the differentiation drill"
```

---

## Phase 2 close

- [ ] Run the full unit suite (`npm test`) and E2E (`npm run test:e2e`); both green.
- [ ] `npm run build`; confirm the drill page emits.
- [ ] Merge `phase2-drills` → `main` (auto-deploys) **only on explicit user go-ahead**; spot-check the live drill (type a correct answer, a wrong one, reveal a hint, reload a `?seed` link).
- [ ] This is the natural stopping point. Phase 3 (custom-expression registry, reusing `engine/expr.js`) is a separate brainstorm + plan.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-24-differentiation-drills-design.md`):
1. `engine/expr.js` safe evaluator → Task 1. ✓
2. `engine/equiv.js` numeric probing → Task 2. ✓
3. `engine/drill/rng.js` seeded RNG → Task 3. ✓
4. `engine/drill/differentiation.js` generator (with numeric self-check) → Task 4. ✓
5. `engine/drill/hints.js` ladder → Task 5. ✓
6. `engine/drill/drill-shell.js` UI + `.drill-*` CSS → Task 6. ✓
7. `drills/differentiation-rules/` page (seed + presenter) → Task 7. ✓
8. Sequencer Practice course + `kind` `hrefFor` + landing + Vite → Task 8. ✓
9. E2E (correct/wrong/unreadable/hint/seed-reproduces) → Task 9. ✓

**Placeholder scan:** every code step carries complete code; no TBD/TODO/"handle edge cases". ✓

**Type/name consistency:** `compile/parse/evaluate/ExprError` (Task 1) used verbatim by Tasks 2, 4, 6. `equivalent(a,b,opts)` (Task 2) used by Task 6. `makeRng/randInt/pick` (Task 3) used by Tasks 4, 7, 9. `nextProblem(rng) -> {id,promptText,fExpr,answer,rule,steps}` (Task 4) consumed by Tasks 6, 9. `makeHintLadder` (Task 5) used by Task 6. `mountDrill({root,rng,shell,generator})` (Task 6) used by Task 7. `hrefFor`/`kind:'drill'`/`course:'practice'`/slug `differentiation-rules` consistent across Tasks 7–9. ✓
