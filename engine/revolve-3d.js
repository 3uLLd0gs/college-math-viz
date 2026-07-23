import { getCSS } from './dom.js';
import { vsub, vcross, vdot, vnorm } from './math.js';
import { OrbitCamera } from './orbit-camera.js';

/* Spin a plane region about an axis and render the solid it sweeps out, plus
   the stack of disks / washers / shells that approximate its volume.

   World convention matches OrbitCamera: Z is up.
     axis 'x' — revolve about the horizontal axis; a profile point (x, r)
                becomes (x, r cos θ, r sin θ) and the solid lies along X.
     axis 'y' — revolve about the vertical axis; a profile point (x, y) becomes
                (x cos θ, x sin θ, y), so the plot's x is a radius and its y is
                height. This is the case shells are for.

   The volume sums are exported as plain functions: they are the mathematics the
   playground is teaching, and they must be testable without a canvas. */

/** Midpoint sample points of [a,b] split into n strips. */
export function midpoints(a, b, n) {
  const dx = (b - a) / n;
  return Array.from({ length: n }, (_, i) => a + (i + 0.5) * dx);
}

/**
 * Disk / washer sum — revolving about the x-axis.
 * Each strip contributes π(R² − r²)Δx, with r = 0 for a solid disk.
 */
export function diskSum(region, n) {
  const { f, g, a, b } = region;
  const dx = (b - a) / n;
  return midpoints(a, b, n).reduce((s, x) => {
    const R = f(x), r = g ? g(x) : 0;
    return s + Math.PI * (R * R - r * r) * dx;
  }, 0);
}

/**
 * Shell sum — revolving about the y-axis.
 * Each strip is a cylindrical shell of radius x and height f(x) − g(x),
 * contributing 2πx·h·Δx.
 */
export function shellSum(region, n) {
  const { f, g, a, b } = region;
  const dx = (b - a) / n;
  return midpoints(a, b, n).reduce((s, x) => {
    const h = f(x) - (g ? g(x) : 0);
    return s + 2 * Math.PI * x * h * dx;
  }, 0);
}

/** The sum appropriate to the axis: disks/washers about x, shells about y. */
export const volumeSum = (region, axis, n) =>
  (axis === 'y' ? shellSum(region, n) : diskSum(region, n));

/** Which method the geometry forces — the choice students most often get wrong. */
export function methodFor(region, axis) {
  if (axis === 'y') return 'shell';
  return region.g ? 'washer' : 'disk';
}

export class Revolve3D {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = new OrbitCamera({ az: -0.9, el: 0.42, dist: 7.4, minDist: 3.6, maxDist: 15 });
    this.seg = 28;             // θ segments around the revolution
    this._resize();
    new ResizeObserver(() => { this._resize(); this.onresize && this.onresize(); }).observe(canvas.parentElement);
    this.cam.bindTo(canvas, () => this.onresize && this.onresize());
  }

  _resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.W = r.width; this.H = r.height;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Fit the solid into a consistent viewing box whatever the region's extent. */
  setRegion(region, axis) {
    this.region = region;
    this.axis = axis;
    const { f, g, a, b } = region;
    let maxR = 0;
    for (let i = 0; i <= 60; i++) {
      const x = a + (b - a) * i / 60;
      maxR = Math.max(maxR, Math.abs(f(x)), g ? Math.abs(g(x)) : 0);
    }
    // Fit by HALF-extents from the centre, not full spans: revolving reaches
    // ±maxR either side of the axis, so a full-span fit overflows the frame.
    this.maxR = maxR;
    this.mid = axis === 'y' ? 0 : (a + b) / 2;   // centre the solid on screen
    const half = axis === 'y'
      ? [b, b, maxR / 2]              // radius out to b, height centred on maxR/2
      : [(b - a) / 2, maxR, maxR];    // half the length, full radius each way
    this.scale = 1.9 / Math.max(...half, 1e-6);
  }

  /** Profile point (x, r) -> world, for the current axis. */
  world(x, r, theta) {
    const s = this.scale;
    if (this.axis === 'y') {
      return [x * s * Math.cos(theta), x * s * Math.sin(theta), (r - this.maxR / 2) * s];
    }
    return [(x - this.mid) * s, r * s * Math.cos(theta), r * s * Math.sin(theta)];
  }

  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  _shade(base, normal) {
    const L = vnorm([-0.35, -0.5, 0.85]);
    const lit = 0.45 + 0.55 * Math.max(0, Math.abs(vdot(normal, L)));
    return `rgb(${(base[0] * lit) | 0},${(base[1] * lit) | 0},${(base[2] * lit) | 0})`;
  }

  /** Collect the quads of one approximating piece. */
  _pieceQuads(x0, x1, rOut, rIn, base) {
    const S = this.seg, quads = [];
    const push = (p0, p1, p2, p3) => {
      const n = vnorm(vcross(vsub(p1, p0), vsub(p3, p0)));
      quads.push({ p: [p0, p1, p2, p3], col: this._shade(base, n) });
    };
    for (let k = 0; k < S; k++) {
      const t0 = Math.PI * 2 * k / S, t1 = Math.PI * 2 * (k + 1) / S;
      // outer wall
      push(this.world(x0, rOut, t0), this.world(x1, rOut, t0),
           this.world(x1, rOut, t1), this.world(x0, rOut, t1));
      // inner wall, if this is a washer or a shell
      if (rIn > 1e-9) {
        push(this.world(x0, rIn, t1), this.world(x1, rIn, t1),
             this.world(x1, rIn, t0), this.world(x0, rIn, t0));
      }
      // the two annular faces
      for (const xf of [x0, x1]) {
        push(this.world(xf, rIn, t0), this.world(xf, rOut, t0),
             this.world(xf, rOut, t1), this.world(xf, rIn, t1));
      }
    }
    return quads;
  }

  /**
   * Draw the approximating solid: n disks/washers along x, or n shells in x
   * about the y-axis. Depth-sorted painter's algorithm, as in Surface3D.
   */
  renderPieces(n, { fill = [64, 132, 168], edge = 'rgba(0,0,0,.30)' } = {}) {
    const { f, g, a, b } = this.region;
    const proj = this.cam.projector(this.W, this.H);
    const dx = (b - a) / n;
    let quads = [];

    for (let i = 0; i < n; i++) {
      const x0 = a + i * dx, x1 = x0 + dx, xm = (x0 + x1) / 2;
      if (this.axis === 'y') {
        // a shell: a thin tube at radius xm, running the height of the region
        const inner = xm - dx * 0.42, outer = xm + dx * 0.42;
        const top = f(xm), bot = g ? g(xm) : 0;
        quads = quads.concat(this._shellQuads(inner, outer, bot, top, fill));
      } else {
        const rOut = Math.abs(f(xm)), rIn = g ? Math.abs(g(xm)) : 0;
        quads = quads.concat(this._pieceQuads(x0, x1, rOut, rIn, fill));
      }
    }

    const c = this.ctx;
    const drawn = quads
      .map(q => ({ ...q, s: q.p.map(proj) }))
      .filter(q => q.s.every(p => p.ok))
      .map(q => ({ ...q, depth: q.s.reduce((t, p) => t + p.z, 0) / 4 }))
      .sort((A, B) => B.depth - A.depth);

    c.save(); c.lineJoin = 'round';
    for (const q of drawn) {
      c.beginPath(); c.moveTo(q.s[0].x, q.s[0].y);
      for (let k = 1; k < 4; k++) c.lineTo(q.s[k].x, q.s[k].y);
      c.closePath();
      c.fillStyle = q.col; c.fill();
      c.strokeStyle = edge; c.lineWidth = 0.6; c.stroke();
    }
    c.restore();
  }

  /** One cylindrical shell: outer wall, inner wall and the ring on top. */
  _shellQuads(rIn, rOut, zBot, zTop, base) {
    const S = this.seg, quads = [];
    const push = (p0, p1, p2, p3) => {
      const n = vnorm(vcross(vsub(p1, p0), vsub(p3, p0)));
      quads.push({ p: [p0, p1, p2, p3], col: this._shade(base, n) });
    };
    for (let k = 0; k < S; k++) {
      const t0 = Math.PI * 2 * k / S, t1 = Math.PI * 2 * (k + 1) / S;
      push(this.world(rOut, zBot, t0), this.world(rOut, zTop, t0),
           this.world(rOut, zTop, t1), this.world(rOut, zBot, t1));
      push(this.world(rIn, zBot, t1), this.world(rIn, zTop, t1),
           this.world(rIn, zTop, t0), this.world(rIn, zBot, t0));
      push(this.world(rIn, zTop, t0), this.world(rOut, zTop, t0),
           this.world(rOut, zTop, t1), this.world(rIn, zTop, t1));
    }
    return quads;
  }

  /** The true solid's silhouette — the profile curve revolved, as wireframe. */
  renderOutline(rings = 26, { color = 'rgba(255,180,84,.55)' } = {}) {
    const { f, g, a, b } = this.region;
    const proj = this.cam.projector(this.W, this.H);
    const c = this.ctx;
    c.save(); c.strokeStyle = color; c.lineWidth = 1.2;

    // rings around the revolution
    for (let i = 0; i <= rings; i++) {
      const x = a + (b - a) * i / rings;
      for (const r of [Math.abs(f(x)), g ? Math.abs(g(x)) : null]) {
        if (r === null || r < 1e-9) continue;
        c.beginPath();
        let pen = false;
        for (let k = 0; k <= this.seg; k++) {
          const p = proj(this.world(x, r, Math.PI * 2 * k / this.seg));
          if (!p.ok) { pen = false; continue; }
          pen ? c.lineTo(p.x, p.y) : (c.moveTo(p.x, p.y), pen = true);
        }
        c.stroke();
      }
    }
    c.restore();
  }

  /** The axis of revolution, drawn through the solid. */
  renderAxis() {
    const { a, b } = this.region;
    const proj = this.cam.projector(this.W, this.H);
    const c = this.ctx;
    const ends = this.axis === 'y'
      ? [this.world(0, -this.maxR * 0.35, 0), this.world(0, this.maxR * 1.35, 0)]
      : [this.world(a - (b - a) * 0.18, 0, 0), this.world(b + (b - a) * 0.18, 0, 0)];
    const p0 = proj(ends[0]), p1 = proj(ends[1]);
    if (!p0.ok || !p1.ok) return;
    c.save();
    c.strokeStyle = getCSS('--muted'); c.lineWidth = 1.5; c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
    c.restore();
  }

  schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this.onrender && this.onrender(); });
  }
}
