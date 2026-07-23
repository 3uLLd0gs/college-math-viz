import { describe, it, expect, vi } from 'vitest';
import { OrbitCamera, FOV_HALF_ANGLE } from './orbit-camera.js';

describe('position', () => {
  it('sits at the requested distance from the origin', () => {
    const c = new OrbitCamera({ az: 0.3, el: 0.9, dist: 11 });
    expect(Math.hypot(...c.position())).toBeCloseTo(11, 12);
  });

  it('looks down the +X axis at azimuth 0, elevation 0', () => {
    const c = new OrbitCamera({ az: 0, el: 0, dist: 5 });
    const [x, y, z] = c.position();
    expect(x).toBeCloseTo(5, 12);
    expect(y).toBeCloseTo(0, 12);
    expect(z).toBeCloseTo(0, 12);
  });

  it('rises toward +Z as elevation grows', () => {
    const low = new OrbitCamera({ el: 0.2, dist: 5 }).position()[2];
    const high = new OrbitCamera({ el: 1.2, dist: 5 }).position()[2];
    expect(high).toBeGreaterThan(low);
  });
});

describe('basis', () => {
  it('is orthonormal', () => {
    const { f, r, u } = new OrbitCamera({ az: 0.7, el: 0.6, dist: 8 }).basis(800, 600);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    [f, r, u].forEach(v => expect(Math.hypot(...v)).toBeCloseTo(1, 10));
    expect(dot(f, r)).toBeCloseTo(0, 10);
    expect(dot(f, u)).toBeCloseTo(0, 10);
    expect(dot(r, u)).toBeCloseTo(0, 10);
  });

  it('points its forward vector at the origin', () => {
    const c = new OrbitCamera({ az: 1.1, el: 0.4, dist: 9 });
    const { C, f } = c.basis(800, 600);
    const toOrigin = C.map(v => -v);
    const len = Math.hypot(...toOrigin);
    toOrigin.forEach((v, i) => expect(v / len).toBeCloseTo(f[i], 10));
  });

  it('derives focal length from the smaller viewport dimension', () => {
    const c = new OrbitCamera();
    const expected = (600 / 2) / Math.tan(FOV_HALF_ANGLE);
    expect(c.basis(800, 600).focal).toBeCloseTo(expected, 10);
    expect(c.basis(600, 800).focal).toBeCloseTo(expected, 10);
  });
});

describe('projector', () => {
  it('puts the origin at the centre of the viewport', () => {
    const p = new OrbitCamera({ az: 0.9, el: 0.5, dist: 7 }).projector(800, 600);
    const o = p([0, 0, 0]);
    expect(o.x).toBeCloseTo(400, 8);
    expect(o.y).toBeCloseTo(300, 8);
    expect(o.ok).toBe(true);
  });

  it('reports depth increasing away from the camera', () => {
    const c = new OrbitCamera({ az: 0, el: 0, dist: 6 });
    const p = c.projector(800, 600);
    expect(p([2, 0, 0]).z).toBeLessThan(p([-2, 0, 0]).z);
  });

  it('flags points behind the camera as not ok', () => {
    const c = new OrbitCamera({ az: 0, el: 0, dist: 6 });
    const p = c.projector(800, 600);
    expect(p([7, 0, 0]).ok).toBe(false);   // past the camera at x = 6
    expect(p([0, 0, 0]).ok).toBe(true);
  });

  it('maps +Z above the centre on screen', () => {
    const p = new OrbitCamera({ az: 0, el: 0, dist: 6 }).projector(800, 600);
    expect(p([0, 0, 1]).y).toBeLessThan(300);   // screen y grows downward
  });
});

describe('orbit, zoom and home', () => {
  it('clamps elevation to its limits', () => {
    const c = new OrbitCamera({ el: 0.5 });
    c.orbit(0, -10000);
    expect(c.el).toBeCloseTo(c.minEl, 12);
    c.orbit(0, 10000);
    expect(c.el).toBeCloseTo(c.maxEl, 12);
  });

  it('azimuth is free to wrap without clamping', () => {
    const c = new OrbitCamera({ az: 0 });
    c.orbit(100000, 0);
    expect(Number.isFinite(c.az)).toBe(true);
  });

  it('clamps zoom to the distance limits', () => {
    const c = new OrbitCamera({ dist: 7 });
    for (let i = 0; i < 200; i++) c.zoom(0.9);
    expect(c.dist).toBeCloseTo(c.minDist, 12);
    for (let i = 0; i < 200; i++) c.zoom(1.1);
    expect(c.dist).toBeCloseTo(c.maxDist, 12);
  });

  it('home() restores the framing it was built with', () => {
    const c = new OrbitCamera({ az: -0.75, el: 0.52, dist: 7 });
    c.orbit(200, 100); c.zoom(1.5);
    c.home();
    expect(c.az).toBeCloseTo(-0.75, 12);
    expect(c.el).toBeCloseTo(0.52, 12);
    expect(c.dist).toBeCloseTo(7, 12);
  });
});

describe('bindTo', () => {
  const makeEl = () => {
    const el = document.createElement('div');
    el.setPointerCapture = vi.fn();
    document.body.appendChild(el);
    return el;
  };
  const pointer = (type, id, x, y) => new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true });

  it('drags to orbit and reports the change', () => {
    const el = makeEl(), c = new OrbitCamera(), onChange = vi.fn();
    c.bindTo(el, onChange);
    const az0 = c.az;
    el.dispatchEvent(pointer('pointerdown', 1, 100, 100));
    el.dispatchEvent(pointer('pointermove', 1, 160, 100));
    expect(c.az).not.toBeCloseTo(az0, 6);
    expect(onChange).toHaveBeenCalled();
  });

  it('ignores movement with no button down', () => {
    const el = makeEl(), c = new OrbitCamera(), onChange = vi.fn();
    c.bindTo(el, onChange);
    el.dispatchEvent(pointer('pointermove', 1, 300, 300));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops orbiting after pointerup', () => {
    const el = makeEl(), c = new OrbitCamera();
    c.bindTo(el);
    el.dispatchEvent(pointer('pointerdown', 1, 100, 100));
    el.dispatchEvent(pointer('pointerup', 1, 100, 100));
    const az = c.az;
    el.dispatchEvent(pointer('pointermove', 1, 400, 100));
    expect(c.az).toBeCloseTo(az, 12);
  });

  it('two pointers pinch to zoom instead of orbiting', () => {
    const el = makeEl(), c = new OrbitCamera({ dist: 8 });
    c.bindTo(el);
    el.dispatchEvent(pointer('pointerdown', 1, 100, 100));
    el.dispatchEvent(pointer('pointerdown', 2, 200, 100));   // pinch span 100
    el.dispatchEvent(pointer('pointermove', 2, 300, 100));   // span 200 -> closer
    expect(c.dist).toBeCloseTo(8 * 100 / 200, 6);
  });

  it('falls back to orbiting when one of two pointers lifts', () => {
    const el = makeEl(), c = new OrbitCamera();
    c.bindTo(el);
    el.dispatchEvent(pointer('pointerdown', 1, 100, 100));
    el.dispatchEvent(pointer('pointerdown', 2, 200, 100));
    el.dispatchEvent(pointer('pointerup', 2, 200, 100));
    const az = c.az;
    el.dispatchEvent(pointer('pointermove', 1, 180, 100));
    expect(c.az).not.toBeCloseTo(az, 6);
  });
});
