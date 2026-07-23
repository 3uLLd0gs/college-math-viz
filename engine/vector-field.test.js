import { describe, it, expect } from 'vitest';
import { rk4Step, streamline, divergenceAt, curlAt, speedAt, circulation, curlFlux, outwardFlux } from './vector-field.js';

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

describe('circulation (the line-integral side of Green)', () => {
  it('is 2πr² for a rigid rotation, whatever the centre', () => {
    // curl = 2, so circulation = 2 · area = 2πr²
    expect(circulation(rotation, 0, 0, 1)).toBeCloseTo(2 * Math.PI, 6);
    expect(circulation(rotation, 0.7, -1.3, 0.5)).toBeCloseTo(2 * Math.PI * 0.25, 6);
  });

  it('vanishes for a conservative (irrotational) field', () => {
    expect(circulation(source, 0.4, 0.9, 0.8)).toBeCloseTo(0, 9);
  });

  it('is −(area) for a unit clockwise shear', () => {
    // shear F = (y, 0) has curl -1
    expect(circulation(shear, 0, 0, 1)).toBeCloseTo(-Math.PI, 6);
  });

  it('reverses sign when the field reverses', () => {
    const back = { P: (x, y) => y, Q: (x) => -x };
    expect(circulation(back, 0, 0, 1)).toBeCloseTo(-circulation(rotation, 0, 0, 1), 6);
  });

  it('scales with area, not radius, for constant curl', () => {
    const c1 = circulation(rotation, 0, 0, 1);
    const c2 = circulation(rotation, 0, 0, 2);
    expect(c2 / c1).toBeCloseTo(4, 6);
  });
});

describe('curlFlux (the area-integral side of Green)', () => {
  it('is 2πr² for a rigid rotation', () => {
    expect(curlFlux(rotation, 0, 0, 1)).toBeCloseTo(2 * Math.PI, 4);
  });

  it('vanishes for an irrotational field', () => {
    expect(curlFlux(source, -0.3, 0.6, 0.9)).toBeCloseTo(0, 6);
  });
});

describe("Green's theorem holds numerically", () => {
  // ∮ F·dr  ==  ∬ curl F dA, for fields whose curl varies across the disc
  const cases = [
    ['quadratic', { P: () => 0, Q: (x) => x * x }],            // curl = 2x
    ['hyperbolic', { P: (x, y) => y * y, Q: (x) => x * x }],   // curl = 2x - 2y
    ['wave', { P: (x, y) => Math.sin(y), Q: (x) => Math.sin(x) }], // curl = cos x - cos y
    ['mixed', { P: (x, y) => -y, Q: (x, y) => x * y }],        // curl = y + 1
  ];
  const loops = [[0, 0, 1], [0.6, -0.4, 0.8], [-1.1, 0.7, 1.3], [0.3, 1.2, 0.45]];

  cases.forEach(([name, fd]) => {
    loops.forEach(([cx, cy, r]) => {
      it(`${name}: both sides agree on the loop at (${cx}, ${cy}) r=${r}`, () => {
        expect(circulation(fd, cx, cy, r)).toBeCloseTo(curlFlux(fd, cx, cy, r), 4);
      });
    });
  });
});

describe('outwardFlux, and the definitions of div and curl', () => {
  const AREA = r => Math.PI * r * r;

  it('a radial source pushes flux out; a sink pulls it in', () => {
    expect(outwardFlux(source, 0, 0, 1)).toBeGreaterThan(0);
    expect(outwardFlux({ P: x => -x, Q: (x, y) => -y }, 0, 0, 1)).toBeLessThan(0);
  });

  it('a rigid rotation pushes no flux through any circle', () => {
    expect(outwardFlux(rotation, 0.4, -0.9, 1.1)).toBeCloseTo(0, 8);
  });

  it('a uniform flow pushes nothing net through a closed curve', () => {
    expect(outwardFlux(uniform, 0.3, 0.2, 0.8)).toBeCloseTo(0, 8);
  });

  it('flux per unit area IS the divergence, for constant divergence at any radius', () => {
    for (const r of [0.2, 1, 2.5]) {
      expect(outwardFlux(source, 0.5, -0.3, r) / AREA(r)).toBeCloseTo(2, 6);
    }
  });

  it('circulation per unit area IS the curl, for constant curl at any radius', () => {
    for (const r of [0.2, 1, 2.5]) {
      expect(circulation(rotation, -0.6, 0.4, r) / AREA(r)).toBeCloseTo(2, 6);
    }
  });

  it('both ratios converge to the pointwise values when div and curl VARY', () => {
    // F = (x² − y², 2xy): div = 4x, curl = 4y — neither is constant, so the
    // ratios only match at a point in the limit of a shrinking circle
    const fd = { P: (x, y) => x * x - y * y, Q: (x, y) => 2 * x * y };
    const [cx, cy] = [0.7, -0.45];
    const fluxRatio = r => outwardFlux(fd, cx, cy, r) / AREA(r);
    const circRatio = r => circulation(fd, cx, cy, r) / AREA(r);
    expect(fluxRatio(0.01)).toBeCloseTo(divergenceAt(fd, cx, cy), 6);
    expect(circRatio(0.01)).toBeCloseTo(curlAt(fd, cx, cy), 6);
    expect(fluxRatio(0.01)).toBeCloseTo(4 * cx, 6);
    expect(circRatio(0.01)).toBeCloseTo(4 * cy, 6);
  });

  it('a LINEAR divergence gives the exact value at every radius, not just the limit', () => {
    // F = (x², 0) has div = 2x. The mean of a linear function over a disc equals
    // its value at the centre, so flux/area is exact at any r — shrinking the
    // circle changes nothing. Worth pinning: it is easy to assume the ratio is
    // only ever approximate.
    const fd = { P: (x) => x * x, Q: () => 0 };
    const at = r => outwardFlux(fd, 1, 0, r) / AREA(r);
    for (const r of [0.02, 0.5, 1.5]) expect(at(r)).toBeCloseTo(2, 8);
  });

  it('a NONLINEAR divergence only matches in the limit', () => {
    // F = (x³, 0) has div = 3x². Averaged over a disc of radius r about (c, 0)
    // that is 3c² + 3r²/4, so the ratio overshoots by a term in r².
    const fd = { P: (x) => x * x * x, Q: () => 0 };
    const c = 1;
    const at = r => outwardFlux(fd, c, 0, r) / AREA(r);
    const predicted = r => 3 * c * c + 3 * r * r / 4;
    for (const r of [0.01, 0.4, 1.2]) expect(at(r)).toBeCloseTo(predicted(r), 8);
    // and the r² term really is what stops a big circle from reporting the point value
    expect(at(1.2)).not.toBeCloseTo(3 * c * c, 2);
    expect(Math.abs(at(0.01) - 3 * c * c)).toBeLessThan(Math.abs(at(1.2) - 3 * c * c) / 1000);
  });

  it('scales with area, not radius, for constant divergence', () => {
    const f1 = outwardFlux(source, 0, 0, 1);
    const f2 = outwardFlux(source, 0, 0, 2);
    expect(f2 / f1).toBeCloseTo(4, 6);
  });
});
