import { describe, it, expect } from 'vitest';
import { FIELDS, grad, gradMag, steepestAngle, directional, angleGap } from './content.js';

const field = id => FIELDS.find(f => f.id === id);
const numFx = (f, x, y, h = 1e-5) => (f(x + h, y) - f(x - h, y)) / (2 * h);
const numFy = (f, x, y, h = 1e-5) => (f(x, y + h) - f(x, y - h)) / (2 * h);

describe('analytic partials match central differences', () => {
  const pts = [[0.7, -0.4], [1.3, 1.1], [-0.9, 0.6]];
  FIELDS.forEach(fd => {
    pts.forEach(([x, y]) => {
      it(`${fd.id}: ∂f/∂x at (${x}, ${y})`, () => {
        expect(fd.fx(x, y)).toBeCloseTo(numFx(fd.f, x, y), 4);
      });
      it(`${fd.id}: ∂f/∂y at (${x}, ${y})`, () => {
        expect(fd.fy(x, y)).toBeCloseTo(numFy(fd.f, x, y), 4);
      });
    });
  });
});

describe('directional derivative', () => {
  it('equals ∂f/∂x pointing along +x and ∂f/∂y along +y', () => {
    const fd = field('saddle'), x = 0.8, y = -0.3;
    expect(directional(fd, x, y, 0)).toBeCloseTo(fd.fx(x, y), 12);
    expect(directional(fd, x, y, Math.PI / 2)).toBeCloseTo(fd.fy(x, y), 12);
  });

  it('is maximised in the gradient direction, at exactly |∇f|', () => {
    for (const fd of FIELDS) {
      const x = 0.9, y = 0.6;
      const best = steepestAngle(fd, x, y);
      const peak = directional(fd, x, y, best);
      expect(peak).toBeCloseTo(gradMag(fd, x, y), 10);
      // no other direction beats it
      for (let t = 0; t < Math.PI * 2; t += Math.PI / 60) {
        expect(directional(fd, x, y, t)).toBeLessThanOrEqual(peak + 1e-10);
      }
    }
  });

  it('is −|∇f| pointing directly downhill', () => {
    const fd = field('hill'), x = 1.1, y = -0.7;
    const down = steepestAngle(fd, x, y) + Math.PI;
    expect(directional(fd, x, y, down)).toBeCloseTo(-gradMag(fd, x, y), 10);
  });

  it('vanishes along the contour, perpendicular to the gradient', () => {
    for (const fd of FIELDS) {
      const x = -0.8, y = 1.2;
      const along = steepestAngle(fd, x, y) + Math.PI / 2;
      expect(directional(fd, x, y, along)).toBeCloseTo(0, 10);
    }
  });

  it('traces a cosine in θ with amplitude |∇f|', () => {
    const fd = field('ripple'), x = 1.0, y = 0.5;
    const mag = gradMag(fd, x, y), best = steepestAngle(fd, x, y);
    for (let t = 0; t < Math.PI * 2; t += 0.3) {
      expect(directional(fd, x, y, t)).toBeCloseTo(mag * Math.cos(t - best), 10);
    }
  });
});

describe('gradient of the plane is constant', () => {
  it('does not depend on position', () => {
    const fd = field('plane');
    expect(grad(fd, 0, 0)).toEqual([2, 1]);
    expect(grad(fd, -1.7, 1.3)).toEqual([2, 1]);
    expect(gradMag(fd, 0.4, -0.9)).toBeCloseTo(Math.sqrt(5), 12);
  });
});

describe('steepestAngle', () => {
  it('points along +x for a field increasing in x', () => {
    expect(steepestAngle({ fx: () => 1, fy: () => 0 }, 0, 0)).toBeCloseTo(0, 12);
  });

  it('points at 45° when both partials are equal and positive', () => {
    expect(steepestAngle({ fx: () => 3, fy: () => 3 }, 0, 0)).toBeCloseTo(Math.PI / 4, 12);
  });

  it('returns null at a critical point, where no direction is steepest', () => {
    expect(steepestAngle(field('bowl'), 0, 0)).toBeNull();
    expect(steepestAngle(field('saddle'), 0, 0)).toBeNull();
    expect(steepestAngle(field('hill'), 0, 0)).toBeNull();
  });
});

describe('angleGap', () => {
  it('is zero for identical directions', () => {
    expect(angleGap(1.2, 1.2)).toBeCloseTo(0, 12);
  });

  it('wraps across the ±π seam instead of reporting a huge gap', () => {
    expect(angleGap(0.05, Math.PI * 2 - 0.05)).toBeCloseTo(0.1, 12);
    expect(angleGap(-Math.PI + 0.05, Math.PI - 0.05)).toBeCloseTo(0.1, 12);
  });

  it('never exceeds π', () => {
    for (let a = -7; a < 7; a += 0.37) {
      for (let b = -7; b < 7; b += 0.53) {
        const g = angleGap(a, b);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(Math.PI + 1e-12);
      }
    }
  });

  it('reports π for exactly opposite directions', () => {
    expect(angleGap(0.7, 0.7 + Math.PI)).toBeCloseTo(Math.PI, 12);
  });
});

describe('every field is usable by the playground', () => {
  // Mirrors playground.js: the probe starts here and the challenge is suppressed
  // below this gradient magnitude.
  const START = { xf: 0.45, yf: -0.3 };
  const FLAT_EPS = 0.05;

  FIELDS.forEach(fd => {
    it(`${fd.id}: the starting probe sits on a clearly non-flat spot`, () => {
      const mag = gradMag(fd, fd.a * START.xf, fd.a * START.yf);
      expect(mag).toBeGreaterThan(FLAT_EPS * 4);
    });
    it(`${fd.id}: the starting probe has a well-defined steepest direction`, () => {
      expect(steepestAngle(fd, fd.a * START.xf, fd.a * START.yf)).not.toBeNull();
    });
    it(`${fd.id}: has a non-zero gradient somewhere well inside the domain`, () => {
      expect(gradMag(fd, fd.a * 0.4, fd.a * 0.3)).toBeGreaterThan(1e-3);
    });
    it(`${fd.id}: declares a domain and a hint`, () => {
      expect(fd.a).toBeGreaterThan(0);
      expect(fd.hint.length).toBeGreaterThan(10);
    });
  });
});
