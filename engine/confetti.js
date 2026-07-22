export function createConfetti(canvasId = 'fx') {
  const cv = document.getElementById(canvasId);
  const ctx = cv.getContext('2d');
  let parts = [];
  let raf = null;
  const dpr = window.devicePixelRatio || 1;

  function size() {
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', size);
  size();

  const cols = ['#3df2c0', '#ffb454', '#7aa2ff', '#ffd76a', '#ff5d73'];

  function burst() {
    const cx = innerWidth * 0.66, cy = innerHeight * 0.32;
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
      parts.push({
        x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4,
        g: 0.16 + Math.random() * 0.12, life: 1, rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4, sz: 4 + Math.random() * 5,
        c: cols[i % cols.length],
      });
    }
    if (!raf) loop();
  }

  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012; });
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    parts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz * 0.6);
      ctx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = null; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  return { burst };
}
