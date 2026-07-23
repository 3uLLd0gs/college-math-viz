import { vsub, vcross, vdot, vnorm } from './math.js';

/* A spherical orbit camera looking at the origin, plus the pointer bindings
   that drive it. Extracted from Surface3D so a second 3-D view does not need a
   second copy of the same trigonometry and the same drag/pinch/wheel handling.

   World convention: Z is up. Azimuth sweeps in the XY plane; elevation lifts
   toward +Z. */

export const FOV_HALF_ANGLE = 0.3927;   // ~22.5°, the framing the studio uses

export class OrbitCamera {
  constructor(opts = {}) {
    this.az = opts.az ?? -0.75;
    this.el = opts.el ?? 0.52;
    this.dist = opts.dist ?? 7;
    this.minEl = opts.minEl ?? 0.08;
    this.maxEl = opts.maxEl ?? 1.45;
    this.minDist = opts.minDist ?? 3.5;
    this.maxDist = opts.maxDist ?? 16;
    this._home = { az: this.az, el: this.el, dist: this.dist };
  }

  /** Camera position in world space. */
  position() {
    return [
      this.dist * Math.cos(this.el) * Math.cos(this.az),
      this.dist * Math.cos(this.el) * Math.sin(this.az),
      this.dist * Math.sin(this.el),
    ];
  }

  /** Orthonormal view basis plus the focal length for a W×H viewport. */
  basis(W, H) {
    const C = this.position();
    const f = vnorm(vsub([0, 0, 0], C));
    const r = vnorm(vcross(f, [0, 0, 1]));
    const u = vcross(r, f);
    return { C, f, r, u, focal: (Math.min(W, H) / 2) / Math.tan(FOV_HALF_ANGLE) };
  }

  /** World point -> screen. `ok` is false behind (or almost at) the camera. */
  projector(W, H) {
    const { C, f, r, u, focal } = this.basis(W, H);
    return P => {
      const d = vsub(P, C);
      const vz = vdot(d, f);
      return {
        x: W / 2 + focal * vdot(d, r) / vz,
        y: H / 2 - focal * vdot(d, u) / vz,
        z: vz,
        ok: vz > 0.05,
      };
    };
  }

  orbit(dx, dy) {
    this.az -= dx * 0.008;
    this.el = Math.max(this.minEl, Math.min(this.maxEl, this.el + dy * 0.006));
  }

  zoom(factor) {
    this.dist = Math.max(this.minDist, Math.min(this.maxDist, this.dist * factor));
  }

  setDistance(d) {
    this.dist = Math.max(this.minDist, Math.min(this.maxDist, d));
  }

  /** Back to the framing the camera was constructed with. */
  home() {
    this.az = this._home.az; this.el = this._home.el; this.dist = this._home.dist;
  }

  /** Drag to orbit, two-finger pinch to zoom, wheel to zoom. */
  bindTo(el, onChange = () => {}) {
    const pts = new Map();
    let mode = null, last = null, pinch0 = 0, dist0 = 0;

    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { mode = 'orbit'; last = [e.clientX, e.clientY]; }
      else if (pts.size === 2) {
        mode = 'pinch';
        const v = [...pts.values()];
        pinch0 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
        dist0 = this.dist;
      }
    });

    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (mode === 'orbit' && pts.size === 1) {
        this.orbit(e.clientX - last[0], e.clientY - last[1]);
        last = [e.clientX, e.clientY];
        onChange();
      } else if (mode === 'pinch' && pts.size === 2) {
        const v = [...pts.values()];
        const d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
        this.setDistance(dist0 * pinch0 / Math.max(d, 1));
        onChange();
      }
    });

    const end = e => {
      pts.delete(e.pointerId);
      if (pts.size === 0) mode = null;
      if (pts.size === 1) { mode = 'orbit'; last = [...pts.values()][0]; }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoom(1 + Math.sign(e.deltaY) * 0.08);
      onChange();
    }, { passive: false });
  }
}
