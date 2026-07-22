export class ScoreShell {
  constructor(confetti) {
    this.pts = 0;
    this.streak = 0;
    this.badges = new Set();
    this.confetti = confetti;
  }

  add(n) { this.pts += n; this._paint(); }
  hitStreak() { this.streak++; this._paint(); }
  resetStreak() { this.streak = 0; this._paint(); }

  badge(id, title, sub, ico = '🏅') {
    if (this.badges.has(id)) return;
    this.badges.add(id);
    this.add(25);
    this.toast(title, sub, ico);
    this._paint();
  }

  _paint() {
    document.getElementById('s-pts').textContent = this.pts;
    document.getElementById('s-streak').textContent = this.streak;
    document.getElementById('s-badges').textContent = this.badges.size;
  }

  toast(t1, t2, ico) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="ico">${ico}</div><div><div class="t1">${t1}</div><div class="t2">${t2}</div></div>`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3700);
  }

  celebrate() { this.confetti.burst(); }
}
