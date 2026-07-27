import { describe, it, expect, vi } from 'vitest';
import { compileCustom, viewFromDomain, numericDerivative, wireCustomInput } from './custom-fn.js';
import { compileCustom2, numericPartials, vectorDiffOps, wireCustomInput2 } from './custom-fn.js';

describe('compileCustom', () => {
  it('compiles a valid expression to a numeric function', () => {
    const { f, error } = compileCustom('x^2');
    expect(error).toBe('');
    expect(f(3)).toBe(9);
  });
  it('compiles a function with a pole (finite off the pole)', () => {
    const { f, error } = compileCustom('1/x');
    expect(error).toBe('');
    expect(f(2)).toBeCloseTo(0.5, 12);
  });
  it('returns a NaN (not a throw) where the expression is undefined', () => {
    const { f } = compileCustom('ln(x)');
    expect(Number.isNaN(f(-1))).toBe(true);   // ln of a negative → NaN, no throw
  });
  it('rejects hostile / unparseable input without executing', () => {
    for (const bad of ['alert(1)', '__proto__', 'x.constructor', '<script>', '1;2', 'y+1']) {
      const { f, error } = compileCustom(bad);
      expect(f).toBeNull();
      expect(error).not.toBe('');
    }
  });
  it('rejects a function that is non-finite across the whole sample range', () => {
    const { f, error } = compileCustom('sqrt(-1-x^2)');   // always NaN for real x
    expect(f).toBeNull();
    expect(error).not.toBe('');
  });
  it('rejects empty / whitespace input', () => {
    expect(compileCustom('   ').f).toBeNull();
  });
});

describe('viewFromDomain', () => {
  it('brackets the sampled range of f over [a,b] and includes y=0', () => {
    const v = viewFromDomain(x => x * x, 0, 2);
    expect(v.xmin).toBeLessThan(0);          // padded past a
    expect(v.xmax).toBeGreaterThan(2);       // padded past b
    expect(v.ymin).toBeLessThanOrEqual(0);   // includes 0
    expect(v.ymax).toBeGreaterThan(4);       // above the max (4) plus pad
  });
  it('falls back to a [-1,1] band when f is non-finite everywhere', () => {
    const v = viewFromDomain(() => NaN, 0, 2);
    expect(v.ymin).toBeLessThan(0);
    expect(v.ymax).toBeGreaterThan(0);
    expect(Number.isFinite(v.xmin) && Number.isFinite(v.xmax)).toBe(true);
  });
});

describe('numericDerivative', () => {
  it('matches known derivatives to a tight tolerance', () => {
    expect(numericDerivative(x => x * x)(3)).toBeCloseTo(6, 6);
    expect(numericDerivative(Math.sin)(0.7)).toBeCloseTo(Math.cos(0.7), 6);
  });
  it('returns NaN where f is undefined on one side', () => {
    expect(Number.isNaN(numericDerivative(Math.log)(0))).toBe(true);   // log(-eps) is NaN
  });
});

describe('wireCustomInput', () => {
  function setup(withDomain) {
    document.body.innerHTML =
      '<input id="e"><input id="a"><input id="b"><div id="m"></div>';
    const onSubmit = vi.fn();
    const api = wireCustomInput({
      exprEl: document.getElementById('e'),
      aEl: withDomain ? document.getElementById('a') : undefined,
      bEl: withDomain ? document.getElementById('b') : undefined,
      msgEl: document.getElementById('m'),
      onSubmit,
    });
    return { onSubmit, api, e: document.getElementById('e'), a: document.getElementById('a'), m: document.getElementById('m') };
  }
  it('submits the trimmed expression on input, with a/b when present', () => {
    const { onSubmit, e, a } = setup(true);
    a.value = '1';
    e.value = ' x^2 ';
    e.dispatchEvent(new Event('input'));
    expect(onSubmit).toHaveBeenCalledWith('x^2', '1', '');
  });
  it('does not submit an empty expression, and clears the message', () => {
    const { onSubmit, e, m } = setup(true);
    m.textContent = 'old';
    e.value = '   ';
    e.dispatchEvent(new Event('input'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(m.textContent).toBe('');
  });
  it('works without domain fields (a/b undefined)', () => {
    const { onSubmit, e } = setup(false);
    e.value = 'sin(x)';
    e.dispatchEvent(new Event('input'));
    expect(onSubmit).toHaveBeenCalledWith('sin(x)', undefined, undefined);
  });
  it('setFields writes .value and setMsg writes textContent', () => {
    const { api, e, m } = setup(true);
    api.setFields('cos(x)', 0, 3);
    expect(e.value).toBe('cos(x)');
    api.setMsg('nope');
    expect(m.textContent).toBe('nope');
  });
});

describe('compileCustom2', () => {
  it('compiles a two-variable expression', () => {
    const { f, error } = compileCustom2('x^2 + y^2');
    expect(error).toBe('');
    expect(f(1, 2)).toBe(5);
  });
  it('rejects hostile / unparseable input', () => {
    for (const bad of ['alert(1)', '__proto__', 'x.constructor']) {
      expect(compileCustom2(bad).f).toBeNull();
      expect(compileCustom2(bad).error).not.toBe('');
    }
  });
  it('rejects a function non-finite across the whole grid', () => {
    const { f, error } = compileCustom2('ln(-1 - x^2 - y^2)');
    expect(f).toBeNull();
    expect(error).not.toBe('');
  });
});

describe('numericPartials', () => {
  it('matches analytic partials for x^2 + y^2', () => {
    const { f } = compileCustom2('x^2 + y^2');
    const { fx, fy } = numericPartials(f);
    expect(fx(1, 2)).toBeCloseTo(2, 5);
    expect(fy(1, 2)).toBeCloseTo(4, 5);
  });
  it('matches analytic partials for sin(x)*cos(y)', () => {
    const { f } = compileCustom2('sin(x)*cos(y)');
    const { fx, fy } = numericPartials(f);
    expect(fx(0.5, 0.7)).toBeCloseTo(Math.cos(0.5) * Math.cos(0.7), 5);
    expect(fy(0.5, 0.7)).toBeCloseTo(-Math.sin(0.5) * Math.sin(0.7), 5);
  });
});

describe('vectorDiffOps', () => {
  it('computes numeric divergence and curl (source field P=x, Q=y)', () => {
    const { f: P } = compileCustom2('x'), { f: Q } = compileCustom2('y');
    const { div, curl } = vectorDiffOps(P, Q);
    expect(div(1, 1)).toBeCloseTo(2, 5);
    expect(curl(1, 1)).toBeCloseTo(0, 5);
  });
  it('a vortex (P=-y, Q=x) has zero divergence and nonzero curl', () => {
    const { f: P } = compileCustom2('-y'), { f: Q } = compileCustom2('x');
    const { div, curl } = vectorDiffOps(P, Q);
    expect(div(1, 1)).toBeCloseTo(0, 5);
    expect(curl(1, 1)).toBeCloseTo(2, 5);
  });
});

describe('wireCustomInput2', () => {
  function setup() {
    document.body.innerHTML = '<input id="p"><input id="q"><div id="m"></div>';
    const onSubmit = vi.fn();
    const api = wireCustomInput2({
      pEl: document.getElementById('p'), qEl: document.getElementById('q'),
      msgEl: document.getElementById('m'), onSubmit,
    });
    return { onSubmit, api, p: document.getElementById('p'), q: document.getElementById('q'), m: document.getElementById('m') };
  }
  it('submits both trimmed values when both are non-empty', () => {
    const { onSubmit, p, q } = setup();
    p.value = ' -y '; q.value = ' x ';
    q.dispatchEvent(new Event('input'));
    expect(onSubmit).toHaveBeenCalledWith('-y', 'x');
  });
  it('does not submit when either field is empty, and clears the message', () => {
    const { onSubmit, p, q, m } = setup();
    m.textContent = 'old';
    p.value = 'x'; q.value = '';
    p.dispatchEvent(new Event('input'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(m.textContent).toBe('');
  });
  it('setFields writes both .value and setMsg writes textContent', () => {
    const { api, p, q, m } = setup();
    api.setFields('sin(y)', 'cos(x)');
    expect(p.value).toBe('sin(y)');
    expect(q.value).toBe('cos(x)');
    api.setMsg('nope');
    expect(m.textContent).toBe('nope');
  });
});
