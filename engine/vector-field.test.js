import { describe, it, expect } from 'vitest';
import { rk4Step, streamline, divergenceAt, curlAt, speedAt } from './vector-field.js';

const uniform = { P: () => 1, Q: () => 0, a: 2 };
const source = { P: (x) => x, Q: (x, y) => y, a: 2 };
const rotation = { P: (x, y) => -y, Q: (x) => x, a: 2 };
const shear = { P: (x, y) => y, Q: () => 0, a: 2 };
const saddle = { P: (x) => x, Q: (x, y) => -y, a: 2 };

describe('rk4Step', () => {
  it('translates at constant velocity in a uniform field', () => {
    const [x, y] = rk4Step(uniform, 0, 0, 0.5);
    expect(x).toBeCloseTo(0.5, 12);
    expect(y).toBeCloseTo(0, 12);
  });

  it('stays put at a stagnation point', () => {
    const [x, y] = rk4Step(source, 0, 0, 0.3);
    expect(x).toBeCloseTo(0, 12);
    expect(y).toBeCloseTo(0, 12);
  });

  it('matches the exact solution of dx/dt = x to 4th order', () => {
    // one step of h from x=1 should land on e^h, to within RK4 truncation
    const h = 0.1;
    const [x] = rk4Step({ P: (x) => x, Q: () => 0 }, 1, 0, h);
    expect(x).toBeCloseTo(Math.exp(h), 6);
  });

  it('a negative step integrates backwards', () => {
    const [x] = rk4Step(uniform, 0, 0, -0.5);
    expect(x).toBeCloseTo(-0.5, 12);
  });
});

describe('streamline', () => {
  it('follows a straight line in a uniform field', () => {
    const pts = streamline(uniform, -1, 0.4, { h: 0.05, steps: 20 });
    expect(pts.length).toBe(21);
    for (const [, y] of pts) expect(y).toBeCloseTo(0.4, 9);
    expect(pts[pts.length - 1][0]).toBeGreaterThan(pts[0][0]);
  });

  it('stops immediately at a stagnation point', () => {
    const pts = streamline(source, 0, 0, { steps: 500 });
    expect(pts).toEqual([[0, 0]]);
  });

  it('traces a closed circle in a pure rotation', () => {
    // |F| = r, and arc-length normalisation makes the step uniform, so the path
    // stays on the circle of the seed radius
    const r0 = 1.2;
    const pts = streamline(rotation, r0, 0, { h: 0.02, steps: 300 });
    for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeCloseTo(r0, 4);
  });

  it('circulates counter-clockwise for F = (-y, x)', () => {
    const pts = streamline(rotation, 1, 0, { h: 0.05, steps: 5 });
    expect(pts[pts.length - 1][1]).toBeGreaterThan(0);
  });

  it('dir = -1 traces the opposite way from the same seed', () => {
    const fwd = streamline(uniform, 0, 0, { h: 0.1, steps: 5 });
    const back = streamline(uniform, 0, 0, { h: 0.1, steps: 5, dir: -1 });
    expect(fwd[5][0]).toBeGreaterThan(0);
    expect(back[5][0]).toBeLessThan(0);
  });

  it('halts once the path leaves the bound instead of running the full budget', () => {
    const pts = streamline(uniform, 0, 0, { h: 0.1, steps: 10000, bound: 1 });
    expect(pts.length).toBeLessThan(200);
    expect(Math.abs(pts[pts.length - 1][0])).toBeGreaterThan(1);
  });

  it('survives a field that returns NaN without looping forever', () => {
    const bad = { P: () => NaN, Q: () => NaN };
    expect(streamline(bad, 0.5, 0.5, { steps: 1000 })).toEqual([[0.5, 0.5]]);
  });
});

describe('divergence and curl against analytic values', () => {
  it('a radial source has divergence 2 and no curl', () => {
    expect(divergenceAt(source, 0.7, -0.3)).toBeCloseTo(2, 6);
    expect(curlAt(source, 0.7, -0.3)).toBeCloseTo(0, 6);
  });

  it('a rigid rotation has curl 2 and no divergence', () => {
    expect(curlAt(rotation, -0.4, 1.1)).toBeCloseTo(2, 6);
    expect(divergenceAt(rotation, -0.4, 1.1)).toBeCloseTo(0, 6);
  });

  it('a shear flow has curl -1 and no divergence', () => {
    expect(curlAt(shear, 0.2, 0.9)).toBeCloseTo(-1, 6);
    expect(divergenceAt(shear, 0.2, 0.9)).toBeCloseTo(0, 6);
  });

  it('a saddle is both divergence-free and irrotational', () => {
    expect(divergenceAt(saddle, 1.3, -0.6)).toBeCloseTo(0, 6);
    expect(curlAt(saddle, 1.3, -0.6)).toBeCloseTo(0, 6);
  });

  it('a sink has negative divergence', () => {
    const sink = { P: (x) => -x, Q: (x, y) => -y };
    expect(divergenceAt(sink, 0.5, 0.5)).toBeCloseTo(-2, 6);
  });

  it('divergence and curl are independent quantities', () => {
    // spiral: outward AND rotating
    const spiral = { P: (x, y) => x - y, Q: (x, y) => x + y };
    expect(divergenceAt(spiral, 0.3, 0.8)).toBeCloseTo(2, 6);
    expect(curlAt(spiral, 0.3, 0.8)).toBeCloseTo(2, 6);
  });
});

describe('speedAt', () => {
  it('is the magnitude of the field vector', () => {
    expect(speedAt({ P: () => 3, Q: () => 4 }, 0, 0)).toBeCloseTo(5, 12);
  });

  it('is zero exactly at a stagnation point', () => {
    expect(speedAt(source, 0, 0)).toBe(0);
  });
});
