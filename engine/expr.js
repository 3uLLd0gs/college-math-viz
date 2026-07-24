/* A tiny, dependency-free evaluator for a whitelisted math grammar. It parses
   a source string to an AST and evaluates it against a numeric scope. It never
   uses eval/Function and never touches host objects: unknown names and
   functions are rejected at parse time, so a hostile string cannot execute. */

export class ExprError extends Error {}

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
