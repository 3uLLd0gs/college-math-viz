import { getCSS, fmtAxis } from './dom.js';

/* Top-down view of a scalar field z = f(x, y): a shaded heat map with iso-lines
   drawn over it, plus arrow/dot overlays. This is the 2-D counterpart to
   Surface3D — the same field, seen from directly above, where a gradient is a
   vector in the plane rather than a slope on a surface. */

/**
 * Marching squares over one grid cell, kept pure so it can be tested without a
 * canvas. `z` is a (n+1)×(n+1) array indexed [i][j]; returns iso-line segments
 * for `level` in grid coordinates (i, j as floats).
 *
 * Where a cell has four crossings the contour is genuinely ambiguous (a saddle
 * passing exactly through the cell). We join the pairs that keep each segment
 * inside its own half of the cell, which is the conventional resolution.
 */
export function cellSegments(z, i, j, level) {
  const v = [z[i][j], z[i + 1][j], z[i + 1][j + 1], z[i][j + 1]];
  const corner = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
  const pts = [];

  for (let e = 0; e < 4; e++) {
    const a = v[e], b = v[(e + 1) % 4];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if ((a > level) === (b > level)) continue;      // no crossing on this edge
    const t = (level - a) / (b - a);
    const [ax, ay] = corner[e], [bx, by] = corner[(e + 1) % 4];
    pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }

  if (pts.length === 2) return [[pts[0], pts[1]]];
  if (pts.length === 4) return [[pts[0], pts[1]], [pts[2], pts[3]]];
  return [];
}

/** All iso-line segments for `level` across the whole grid. */
export function isoSegments(z, level) {
  const n = z.length - 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) out.push(...cellSegments(z, i, j, level));
  }
  return out;
}

/** `count` evenly spaced levels strictly inside [zmin, zmax]. */
export function levelsFor(zmin, zmax, count = 10) {
  const span = zmax - zmin;
  if (!(span > 0)) return [];
  return Array.from({ length: count }, (_, k) => zmin + span * (k + 1) / (count + 1));
}

export class ContourMap {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.N = 96;          // sampling grid for the heat map + contours
    this.pad = 8;
    this._resize();
    new ResizeObserver(() => { this._resize(); this.onresize && this.onresize(); }).observe(canvas.parentElement);
  }

  _resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.W = r.width; this.H = r.height;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** field: { f, a } — sampled over the square [-a, a] × [-a, a]. */
  setField(field) {
    this.field = field;
    const { f, a } = field, N = this.N;
    const Z = [];
    let zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i <= N; i++) {
      Z[i] = [];
      const x = -a + 2 * a * i / N;
      for (let j = 0; j <= N; j++) {
        const y = -a + 2 * a * j / N;
        const z = f(x, y);
        Z[i][j] = z;
        if (Number.isFinite(z)) { if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
      }
    }
    this.Z = Z; this.zmin = zmin; this.zmax = zmax;
  }

  /* The plot area is the largest centred square, so the x and y scales match and
     a gradient arrow points in the direction it actually points. */
  _box() {
    const side = Math.min(this.W, this.H) - this.pad * 2;
    return { side, ox: (this.W - side) / 2, oy: (this.H - side) / 2 };
  }

  sx(x) { const { side, ox } = this._box(), a = this.field.a; return ox + (x + a) / (2 * a) * side; }
  sy(y) { const { side, oy } = this._box(), a = this.field.a; return oy + (a - y) / (2 * a) * side; }
  ux(px) { const { side, ox } = this._box(), a = this.field.a; return -a + (px - ox) / side * 2 * a; }
  uy(py) { const { side, oy } = this._box(), a = this.field.a; return a - (py - oy) / side * 2 * a; }

  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  _color(t) {
    t = Math.max(0, Math.min(1, t));
    const low = [30, 40, 78], mid = [45, 130, 130], high = [255, 180, 84];
    const mix = (c1, c2, k) => c1.map((c, i) => c + (c2[i] - c) * k);
    const c = t < 0.5 ? mix(low, mid, t * 2) : mix(mid, high, (t - 0.5) * 2);
    return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  }

  /** Shaded height map. Drawn as N×N cells rather than per-pixel: fast, and the
   *  banding it produces reads as extra elevation information. */
  heat() {
    const c = this.ctx, N = this.N, { side, ox, oy } = this._box();
    const cell = side / N, span = Math.max(this.zmax - this.zmin, 1e-9);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const z = (this.Z[i][j] + this.Z[i + 1][j] + this.Z[i + 1][j + 1] + this.Z[i][j + 1]) / 4;
        if (!Number.isFinite(z)) continue;
        c.fillStyle = this._color((z - this.zmin) / span);
        // +1px overdraw closes hairline seams between neighbouring cells
        c.fillRect(ox + i * cell, oy + side - (j + 1) * cell, cell + 1, cell + 1);
      }
    }
  }

  /** Iso-lines at `count` evenly spaced levels. */
  contours(count = 10, { color = 'rgba(255,255,255,.30)', width = 1 } = {}) {
    const c = this.ctx, N = this.N, { side, ox, oy } = this._box();
    const gx = gi => ox + gi / N * side;
    const gy = gj => oy + side - gj / N * side;
    c.save(); c.strokeStyle = color; c.lineWidth = width;
    c.beginPath();
    for (const level of levelsFor(this.zmin, this.zmax, count)) {
      for (const [p, q] of isoSegments(this.Z, level)) {
        c.moveTo(gx(p[0]), gy(p[1])); c.lineTo(gx(q[0]), gy(q[1]));
      }
    }
    c.stroke(); c.restore();
  }

  /** Axes through the origin with tick labels along the border. */
  axes() {
    const c = this.ctx, a = this.field.a;
    c.save();
    c.strokeStyle = getCSS('--line'); c.lineWidth = 1;
    c.beginPath(); c.moveTo(this.sx(-a), this.sy(0)); c.lineTo(this.sx(a), this.sy(0));
    c.moveTo(this.sx(0), this.sy(-a)); c.lineTo(this.sx(0), this.sy(a)); c.stroke();
    c.fillStyle = getCSS('--muted'); c.font = '10px "JetBrains Mono"';
    c.textAlign = 'center'; c.textBaseline = 'top';
    const step = a / 2;
    for (let x = -a; x <= a + 1e-9; x += step) {
      if (Math.abs(x) < 1e-9) continue;
      c.fillText(fmtAxis(x), this.sx(x), this.sy(0) + 4);
    }
    c.textAlign = 'left'; c.textBaseline = 'middle';
    for (let y = -a; y <= a + 1e-9; y += step) {
      if (Math.abs(y) < 1e-9) continue;
      c.fillText(fmtAxis(y), this.sx(0) + 5, this.sy(y));
    }
    c.restore();
  }

  /** Arrow from (x0,y0) to (x1,y1) in world coordinates. */
  arrow(x0, y0, x1, y1, { color, width = 3, head = 10, alpha = 1, dash = null } = {}) {
    const c = this.ctx;
    const px0 = this.sx(x0), py0 = this.sy(y0), px1 = this.sx(x1), py1 = this.sy(y1);
    const ang = Math.atan2(py1 - py0, px1 - px0);
    if (!Number.isFinite(ang)) return;
    c.save();
    c.globalAlpha = alpha; c.strokeStyle = color; c.fillStyle = color;
    c.lineWidth = width; c.lineCap = 'round';
    if (dash) c.setLineDash(dash);
    c.shadowColor = color; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(px0, py0); c.lineTo(px1, py1); c.stroke();
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(px1, py1);
    c.lineTo(px1 - head * Math.cos(ang - 0.4), py1 - head * Math.sin(ang - 0.4));
    c.lineTo(px1 - head * Math.cos(ang + 0.4), py1 - head * Math.sin(ang + 0.4));
    c.closePath(); c.fill();
    c.restore();
  }

  dot(x, y, color, r = 5) {
    const c = this.ctx;
    c.save();
    c.fillStyle = '#fff'; c.shadowColor = color; c.shadowBlur = 12;
    c.beginPath(); c.arc(this.sx(x), this.sy(y), r, 0, 7); c.fill();
    c.fillStyle = color;
    c.beginPath(); c.arc(this.sx(x), this.sy(y), r * 0.48, 0, 7); c.fill();
    c.restore();
  }
}
