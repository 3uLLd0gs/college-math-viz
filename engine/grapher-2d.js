import { getCSS, fmtAxis } from './dom.js';

export class Grapher2D {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { xmin: -8, xmax: 8, ymin: -2.6, ymax: 2.6 };
    this.pad = { l: 34, r: 16, t: 16, b: 26 };
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

  setView(v) { this.view = { ...v }; }
  sx(x) { const { xmin, xmax } = this.view, { l, r } = this.pad; return l + (x - xmin) / (xmax - xmin) * (this.W - l - r); }
  sy(y) { const { ymin, ymax } = this.view, { t, b } = this.pad; return t + (ymax - y) / (ymax - ymin) * (this.H - t - b); }
  ux(px) { const { xmin, xmax } = this.view, { l, r } = this.pad; return xmin + (px - l) / (this.W - l - r) * (xmax - xmin); }
  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  grid() {
    const c = this.ctx, { xmin, xmax, ymin, ymax } = this.view;
    c.lineWidth = 1;
    const stepX = this._nice((xmax - xmin) / 9), stepY = this._nice((ymax - ymin) / 6);
    c.strokeStyle = getCSS('--grid'); c.fillStyle = getCSS('--muted');
    c.font = '10px "JetBrains Mono"'; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let x = Math.ceil(xmin / stepX) * stepX; x <= xmax; x += stepX) {
      c.beginPath(); c.moveTo(this.sx(x), this.pad.t); c.lineTo(this.sx(x), this.H - this.pad.b); c.stroke();
      if (Math.abs(x) > 1e-9) c.fillText(fmtAxis(x), this.sx(x), this.sy(0) + 4);
    }
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let y = Math.ceil(ymin / stepY) * stepY; y <= ymax; y += stepY) {
      c.beginPath(); c.moveTo(this.pad.l, this.sy(y)); c.lineTo(this.W - this.pad.r, this.sy(y)); c.stroke();
      if (Math.abs(y) > 1e-9) c.fillText(fmtAxis(y), this.pad.l - 6, this.sy(y));
    }
    c.strokeStyle = getCSS('--line'); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(this.pad.l, this.sy(0)); c.lineTo(this.W - this.pad.r, this.sy(0)); c.stroke();
    c.beginPath(); c.moveTo(this.sx(0), this.pad.t); c.lineTo(this.sx(0), this.H - this.pad.b); c.stroke();
  }

  _nice(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  plot(fn, { color, width = 2.5, glow = 0, dash = null } = {}) {
    const c = this.ctx, { ymin, ymax } = this.view;
    const margin = (ymax - ymin) * 1.2;
    c.save(); c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round';
    if (dash) c.setLineDash(dash);
    if (glow) { c.shadowColor = color; c.shadowBlur = glow; }
    c.beginPath(); let pen = false;
    for (let px = this.pad.l; px <= this.W - this.pad.r; px += 1.5) {
      const x = this.ux(px), y = fn(x);
      const ok = Number.isFinite(y) && y > ymin - margin && y < ymax + margin;
      if (!ok) { pen = false; continue; }
      const sxp = px, syp = this.sy(y);
      if (!pen) { c.moveTo(sxp, syp); pen = true; } else c.lineTo(sxp, syp);
    }
    c.stroke(); c.restore();
  }

  dot(x, y, color, rInner = 4) {
    const c = this.ctx;
    if (!Number.isFinite(y)) return;
    c.save(); c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 10;
    c.beginPath(); c.arc(this.sx(x), this.sy(y), rInner, 0, 7); c.fill(); c.restore();
  }

  /** Filled bar from the x-axis up to y, spanning [xa, xb]. Handles y < 0 by
   *  drawing downward from the axis, so signed-area sums render correctly. */
  bar(xa, xb, y, { fill, stroke, alpha = 1 } = {}) {
    const c = this.ctx;
    if (!Number.isFinite(y)) return;
    const x0 = this.sx(xa);
    const yTop = this.sy(Math.max(y, 0));
    const w = this.sx(xb) - x0, h = this.sy(Math.min(y, 0)) - yTop;
    c.save(); c.globalAlpha = alpha;
    if (fill) { c.fillStyle = fill; c.fillRect(x0, yTop, w, h); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.strokeRect(x0, yTop, w, h); }
    c.restore();
  }

  vline(x, color) {
    const c = this.ctx;
    c.save(); c.strokeStyle = color; c.globalAlpha = 0.5;
    c.setLineDash([4, 4]); c.beginPath(); c.moveTo(this.sx(x), this.pad.t); c.lineTo(this.sx(x), this.H - this.pad.b); c.stroke(); c.restore();
  }

  gap(x, y1, y2, color) {
    const c = this.ctx;
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) return;
    c.save(); c.strokeStyle = color; c.lineWidth = 2.5; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(this.sx(x), this.sy(y1)); c.lineTo(this.sx(x), this.sy(y2)); c.stroke(); c.restore();
  }
}
