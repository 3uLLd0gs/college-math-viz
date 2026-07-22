import { getCSS } from './dom.js';
import { vsub, vcross, vdot, vnorm } from './math.js';

export class Surface3D {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.az = -0.75; this.el = 0.52; this.dist = 7; this.N = 38;
    this._resize();
    new ResizeObserver(() => { this._resize(); this.schedule(); }).observe(canvas.parentElement);
    this._bindCamera();
  }

  _resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = devicePixelRatio || 1;
    this.W = r.width; this.H = r.height;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  camPos() {
    return [
      this.dist * Math.cos(this.el) * Math.cos(this.az),
      this.dist * Math.cos(this.el) * Math.sin(this.az),
      this.dist * Math.sin(this.el),
    ];
  }

  setSurface(surf) {
    this.s = surf; const a = surf.a, N = this.N; this.a = a;
    let zmin = Infinity, zmax = -Infinity; const Z = [];
    for (let i = 0; i <= N; i++) {
      Z[i] = []; const x = -a + 2 * a * i / N;
      for (let j = 0; j <= N; j++) {
        const y = -a + 2 * a * j / N; const z = surf.f(x, y); Z[i][j] = z;
        if (isFinite(z)) { if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
      }
    }
    this.zmin = zmin; this.zmax = zmax; this.zMid = (zmin + zmax) / 2;
    const span = Math.max(zmax - zmin, 1e-6);
    this.hScale = 2.6 / a; this.vScale = 1.7 / (span / 2); this.Z = Z;
    this.P = [];
    for (let i = 0; i <= N; i++) {
      this.P[i] = []; const x = -a + 2 * a * i / N;
      for (let j = 0; j <= N; j++) {
        const y = -a + 2 * a * j / N; this.P[i][j] = this.wz(x, y, Z[i][j]);
      }
    }
  }

  wz(x, y, z) { return [x * this.hScale, y * this.hScale, (z - this.zMid) * this.vScale]; }
  w(x, y) { return this.wz(x, y, this.s.f(x, y)); }

  _basis() {
    const C = this.camPos(), f = vnorm(vsub([0, 0, 0], C));
    const r = vnorm(vcross(f, [0, 0, 1])), u = vcross(r, f);
    const focal = (Math.min(this.W, this.H) / 2) / Math.tan(0.3927);
    return { C, f, r, u, focal };
  }

  projector() {
    const { C, f, r, u, focal } = this._basis(); const W = this.W, H = this.H;
    return P => {
      const d = vsub(P, C); const vz = vdot(d, f);
      return { x: W / 2 + focal * vdot(d, r) / vz, y: H / 2 - focal * vdot(d, u) / vz, z: vz, ok: vz > 0.05 };
    };
  }

  _color(t) {
    t = Math.max(0, Math.min(1, t));
    const low = [58, 74, 140], mid = [61, 242, 192], high = [255, 180, 84];
    const mix = (c1, c2, k) => [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
    return t < 0.5 ? mix(low, mid, t * 2) : mix(mid, high, (t - 0.5) * 2);
  }

  renderBase(proj, overlay) {
    const c = this.ctx; c.clearRect(0, 0, this.W, this.H);
    const N = this.N, a = this.a; const L = vnorm([-0.3, -0.5, 0.9]);
    c.save(); c.strokeStyle = getCSS('--grid'); c.lineWidth = 1; const gl = 8;
    for (let k = 0; k <= gl; k++) {
      const t = -a + 2 * a * k / gl;
      let p1 = proj(this.wz(t, -a, this.zmin)), p2 = proj(this.wz(t, a, this.zmin));
      if (p1.ok && p2.ok) { c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke(); }
      let q1 = proj(this.wz(-a, t, this.zmin)), q2 = proj(this.wz(a, t, this.zmin));
      if (q1.ok && q2.ok) { c.beginPath(); c.moveTo(q1.x, q1.y); c.lineTo(q2.x, q2.y); c.stroke(); }
    }
    c.restore();
    this._slicePlane(proj, overlay);
    const quads = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const W0 = this.P[i][j], W1 = this.P[i + 1][j], W2 = this.P[i + 1][j + 1], W3 = this.P[i][j + 1];
      const a0 = proj(W0), a1 = proj(W1), a2 = proj(W2), a3 = proj(W3);
      if (!(a0.ok && a1.ok && a2.ok && a3.ok)) continue;
      const depth = (a0.z + a1.z + a2.z + a3.z) / 4;
      const zc = (this.Z[i][j] + this.Z[i + 1][j] + this.Z[i + 1][j + 1] + this.Z[i][j + 1]) / 4;
      const t = (zc - this.zmin) / Math.max(this.zmax - this.zmin, 1e-6);
      let n = vnorm(vcross(vsub(W1, W0), vsub(W3, W0))); if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
      const lit = 0.5 + 0.5 * Math.max(0, vdot(n, L)); const base = this._color(t);
      quads.push({ p: [a0, a1, a2, a3], depth, col: 'rgb(' + (base[0] * lit | 0) + ',' + (base[1] * lit | 0) + ',' + (base[2] * lit | 0) + ')' });
    }
    quads.sort((A, B) => B.depth - A.depth);
    c.lineJoin = 'round';
    for (const q of quads) {
      c.beginPath(); c.moveTo(q.p[0].x, q.p[0].y);
      for (let k = 1; k < 4; k++) c.lineTo(q.p[k].x, q.p[k].y); c.closePath();
      c.fillStyle = q.col; c.fill(); c.strokeStyle = 'rgba(0,0,0,.20)'; c.lineWidth = 0.5; c.stroke();
    }
  }

  _slicePlane(proj, ov) {
    const c = this.ctx, a = this.a; let corners;
    if (ov.axis === 'x') {
      const y = ov.slice;
      corners = [this.wz(-a, y, this.zmin), this.wz(a, y, this.zmin), this.wz(a, y, this.zmax), this.wz(-a, y, this.zmax)];
    } else {
      const x = ov.slice;
      corners = [this.wz(x, -a, this.zmin), this.wz(x, a, this.zmin), this.wz(x, a, this.zmax), this.wz(x, -a, this.zmax)];
    }
    const pp = corners.map(proj); if (pp.some(p => !p.ok)) return;
    c.save(); c.beginPath(); c.moveTo(pp[0].x, pp[0].y);
    for (let k = 1; k < 4; k++) c.lineTo(pp[k].x, pp[k].y); c.closePath();
    c.fillStyle = 'rgba(122,162,255,.10)'; c.fill();
    c.strokeStyle = 'rgba(122,162,255,.5)'; c.lineWidth = 1; c.stroke(); c.restore();
  }

  schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this.onrender && this.onrender(); });
  }

  _bindCamera() {
    const el = this.cv; const pts = new Map(); let mode = null, last = null, pinch0 = 0, dist0 = 0;
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { mode = 'orbit'; last = [e.clientX, e.clientY]; }
      else if (pts.size === 2) { mode = 'pinch'; const v = [...pts.values()]; pinch0 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); dist0 = this.dist; }
    });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (mode === 'orbit' && pts.size === 1) {
        const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY];
        this.az -= dx * 0.008; this.el = Math.max(0.08, Math.min(1.45, this.el + dy * 0.006)); this.schedule();
      } else if (mode === 'pinch' && pts.size === 2) {
        const v = [...pts.values()]; const d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
        this.dist = Math.max(3.5, Math.min(16, dist0 * pinch0 / Math.max(d, 1))); this.schedule();
      }
    });
    const end = e => {
      pts.delete(e.pointerId); if (pts.size === 0) mode = null;
      if (pts.size === 1) { mode = 'orbit'; last = [...pts.values()][0]; }
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => {
      e.preventDefault(); this.dist = Math.max(3.5, Math.min(16, this.dist * (1 + Math.sign(e.deltaY) * 0.08))); this.schedule();
    }, { passive: false });
  }
}
