import { getCSS, fmtAxis } from './dom.js';

/* A planar vector field F(x, y) = (P, Q): an arrow grid, streamlines traced by
   RK4, and numeric divergence/curl probes. The integration and the differential
   operators are exported as plain functions so they can be tested against
   analytic values without a canvas. */

/** One classical Runge-Kutta step of dx/dt = P, dy/dt = Q. */
export function rk4Step(field, x, y, h) {
  const { P, Q } = field;
  const k1 = [P(x, y), Q(x, y)];
  const k2 = [P(x + h / 2 * k1[0], y + h / 2 * k1[1]), Q(x + h / 2 * k1[0], y + h / 2 * k1[1])];
  const k3 = [P(x + h / 2 * k2[0], y + h / 2 * k2[1]), Q(x + h / 2 * k2[0], y + h / 2 * k2[1])];
  const k4 = [P(x + h * k3[0], y + h * k3[1]), Q(x + h * k3[0], y + h * k3[1])];
  return [
    x + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  ];
}

/**
 * Trace a flow line from (x0, y0). `dir` = -1 integrates backwards, which is how
 * a streamline gets drawn through a seed point rather than only downstream.
 * Stops early on a stagnation point or once the path leaves the domain, so a
 * field with an equilibrium does not spend the whole budget standing still.
 */
export function streamline(field, x0, y0, { h = 0.02, steps = 400, dir = 1, bound = Infinity } = {}) {
  const pts = [[x0, y0]];
  let x = x0, y = y0;
  for (let i = 0; i < steps; i++) {
    const speed = Math.hypot(field.P(x, y), field.Q(x, y));
    if (!Number.isFinite(speed) || speed < 1e-6) break;
    // Normalising by speed makes the sample spacing uniform in arc length, so
    // fast regions do not get drawn as long straight jumps.
    [x, y] = rk4Step(field, x, y, dir * h / Math.max(speed, 1e-3));
    if (!Number.isFinite(x) || !Number.isFinite(y)) break;
    if (Math.abs(x) > bound || Math.abs(y) > bound) { pts.push([x, y]); break; }
    pts.push([x, y]);
  }
  return pts;
}

/** ∂P/∂x + ∂Q/∂y by central differences. */
export function divergenceAt(field, x, y, h = 1e-5) {
  return (field.P(x + h, y) - field.P(x - h, y)) / (2 * h)
       + (field.Q(x, y + h) - field.Q(x, y - h)) / (2 * h);
}

/** The scalar (z) component of the curl: ∂Q/∂x − ∂P/∂y. */
export function curlAt(field, x, y, h = 1e-5) {
  return (field.Q(x + h, y) - field.Q(x - h, y)) / (2 * h)
       - (field.P(x, y + h) - field.P(x, y - h)) / (2 * h);
}

export const speedAt = (field, x, y) => Math.hypot(field.P(x, y), field.Q(x, y));

/**
 * Circulation ∮ F · dr counter-clockwise around the circle of radius `r`
 * centred at (cx, cy) — the left-hand side of Green's theorem.
 *
 * Parametrise by t: dr = (−r sin t, r cos t) dt. The midpoint rule is used
 * rather than the trapezoid because the integrand is periodic, where midpoint
 * converges spectrally instead of at O(h²).
 */
export function circulation(field, cx, cy, r, n = 720) {
  const dt = Math.PI * 2 / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * dt;
    const ct = Math.cos(t), st = Math.sin(t);
    const x = cx + r * ct, y = cy + r * st;
    sum += (field.P(x, y) * -r * st + field.Q(x, y) * r * ct) * dt;
  }
  return sum;
}

/**
 * Outward flux ∮ F · n ds through the circle of radius `r` centred at (cx, cy).
 *
 * On the circle the outward normal is just (cos t, sin t) and ds = r dt, so the
 * integral is ∫ (P cos t + Q sin t) r dt. Midpoint again, for the same reason as
 * circulation: the integrand is periodic.
 *
 * Divided by the enclosed area this is the DEFINITION of divergence in the limit
 * r → 0, which is what makes it worth computing separately from the partial
 * derivatives rather than deriving one from the other.
 */
export function outwardFlux(field, cx, cy, r, n = 720) {
  const dt = Math.PI * 2 / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * dt;
    const ct = Math.cos(t), st = Math.sin(t);
    sum += (field.P(cx + r * ct, cy + r * st) * ct + field.Q(cx + r * ct, cy + r * st) * st) * r * dt;
  }
  return sum;
}

/**
 * ∬ (∂Q/∂x − ∂P/∂y) dA over the same disc — the right-hand side of Green's
 * theorem. Sampled in polar coordinates, where dA = ρ dρ dθ and the disc is a
 * rectangle, so no cells need masking against the boundary.
 */
export function curlFlux(field, cx, cy, r, nr = 90, nt = 240) {
  const dr = r / nr, dt = Math.PI * 2 / nt;
  let sum = 0;
  for (let i = 0; i < nr; i++) {
    const rho = (i + 0.5) * dr;
    for (let j = 0; j < nt; j++) {
      const th = (j + 0.5) * dt;
      const x = cx + rho * Math.cos(th), y = cy + rho * Math.sin(th);
      sum += curlAt(field, x, y) * rho * dr * dt;
    }
  }
  return sum;
}

export class VectorFieldView {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
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

  setField(field) {
    this.field = field;
    // Peak speed over a sample grid, used to normalise arrow length and colour.
    const a = field.a; let max = 0;
    for (let i = 0; i <= 24; i++) {
      for (let j = 0; j <= 24; j++) {
        const s = speedAt(field, -a + 2 * a * i / 24, -a + 2 * a * j / 24);
        if (Number.isFinite(s) && s > max) max = s;
      }
    }
    this.maxSpeed = max || 1;
  }

  _box() {
    const side = Math.min(this.W, this.H) - this.pad * 2;
    return { side, ox: (this.W - side) / 2, oy: (this.H - side) / 2 };
  }

  sx(x) { const { side, ox } = this._box(), a = this.field.a; return ox + (x + a) / (2 * a) * side; }
  sy(y) { const { side, oy } = this._box(), a = this.field.a; return oy + (a - y) / (2 * a) * side; }
  ux(px) { const { side, ox } = this._box(), a = this.field.a; return -a + (px - ox) / side * 2 * a; }
  uy(py) { const { side, oy } = this._box(), a = this.field.a; return a - (py - oy) / side * 2 * a; }

  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  _speedColor(t) {
    t = Math.max(0, Math.min(1, Math.sqrt(t)));   // sqrt keeps slow regions visible
    const low = [70, 92, 150], mid = [61, 242, 192], high = [255, 180, 84];
    const mix = (c1, c2, k) => c1.map((c, i) => c + (c2[i] - c) * k);
    const c = t < 0.5 ? mix(low, mid, t * 2) : mix(mid, high, (t - 0.5) * 2);
    return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  }

  /** Grid of arrows. Length is capped at the cell size so dense fast regions
   *  stay legible instead of turning into a scribble; colour carries speed. */
  arrows(n = 17) {
    const c = this.ctx, a = this.field.a, { side } = this._box();
    const cell = side / n;
    const maxLen = cell * 0.86;
    c.save(); c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = -a + 2 * a * (i + 0.5) / n;
        const y = -a + 2 * a * (j + 0.5) / n;
        const px = this.field.P(x, y), py = this.field.Q(x, y);
        const sp = Math.hypot(px, py);
        if (!Number.isFinite(sp) || sp < 1e-9) continue;
        const t = sp / this.maxSpeed;
        const len = maxLen * (0.25 + 0.75 * Math.min(1, Math.sqrt(t)));
        const ux = px / sp, uy = py / sp;
        const x0 = this.sx(x) - ux * len / 2, y0 = this.sy(y) + uy * len / 2;
        const x1 = this.sx(x) + ux * len / 2, y1 = this.sy(y) - uy * len / 2;
        c.strokeStyle = c.fillStyle = this._speedColor(t);
        c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        const ang = Math.atan2(y1 - y0, x1 - x0), head = Math.min(6, len * 0.45);
        c.beginPath(); c.moveTo(x1, y1);
        c.lineTo(x1 - head * Math.cos(ang - 0.5), y1 - head * Math.sin(ang - 0.5));
        c.lineTo(x1 - head * Math.cos(ang + 0.5), y1 - head * Math.sin(ang + 0.5));
        c.closePath(); c.fill();
      }
    }
    c.restore();
  }

  /** Draw a traced path in world coordinates. */
  path(pts, { color, width = 2.5, alpha = 1, glow = 0 } = {}) {
    if (pts.length < 2) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width;
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (glow) { c.shadowColor = color; c.shadowBlur = glow; }
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(this.sx(x), this.sy(y)) : c.moveTo(this.sx(x), this.sy(y))));
    c.stroke(); c.restore();
  }

  axes() {
    const c = this.ctx, a = this.field.a;
    c.save();
    c.strokeStyle = getCSS('--grid'); c.lineWidth = 1;
    c.beginPath(); c.moveTo(this.sx(-a), this.sy(0)); c.lineTo(this.sx(a), this.sy(0));
    c.moveTo(this.sx(0), this.sy(-a)); c.lineTo(this.sx(0), this.sy(a)); c.stroke();
    c.fillStyle = getCSS('--muted'); c.font = '10px "JetBrains Mono"';
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (let x = -a; x <= a + 1e-9; x += a / 2) {
      if (Math.abs(x) > 1e-9) c.fillText(fmtAxis(x), this.sx(x), this.sy(0) + 4);
    }
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
