/* Points, streak and badges, persisted per playground so progress survives a
   reload. Without this the gamification is theatre: a badge that evaporates on
   refresh is not an achievement.

   Storage is one key per playground under a shared prefix, so the landing page
   can read every playground's progress without instantiating anything. */

const PREFIX = 'cmv:progress:';

/** Read a playground's stored progress. Never throws — storage can be
 *  unavailable (private mode, disabled cookies) or hold junk from an older
 *  build, and neither should take the page down. */
export function loadProgress(slug) {
  const empty = { pts: 0, streak: 0, badges: [], awards: [] };
  if (!slug) return empty;
  const strings = a => (Array.isArray(a) ? a.filter(x => typeof x === 'string') : []);
  try {
    const raw = localStorage.getItem(PREFIX + slug);
    if (!raw) return empty;
    const v = JSON.parse(raw);
    return {
      pts: Number.isFinite(v.pts) ? v.pts : 0,
      streak: Number.isFinite(v.streak) ? v.streak : 0,
      badges: strings(v.badges),
      awards: strings(v.awards),
    };
  } catch {
    return empty;
  }
}

export function saveProgress(slug, { pts, streak, badges, awards = [] }) {
  if (!slug) return false;
  try {
    localStorage.setItem(PREFIX + slug,
      JSON.stringify({ pts, streak, badges: [...badges], awards: [...awards] }));
    return true;
  } catch {
    return false;   // quota or unavailable storage — play on, just unsaved
  }
}

export function clearProgress(slug) {
  try { localStorage.removeItem(PREFIX + slug); return true; } catch { return false; }
}

/** Totals across a list of slugs, for the landing page. */
export function totalProgress(slugs) {
  return slugs.reduce((acc, slug) => {
    const p = loadProgress(slug);
    acc.pts += p.pts;
    acc.badges += p.badges.length;
    if (p.pts > 0 || p.badges.length) acc.started++;
    return acc;
  }, { pts: 0, badges: 0, started: 0 });
}

/** Bundle every stored playground's progress into one copyable, base64-encoded
 *  code — the whole backup/restore story, with no backend and no account. */
export function exportProgress() {
  const all = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) all[k.slice(PREFIX.length)] = loadProgress(k.slice(PREFIX.length));
  }
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(all)))); } catch { return ''; }
}

/** Decode a code produced by exportProgress() and write each playground's
 *  progress back via saveProgress. Never throws — a mistyped or truncated
 *  paste should fail cleanly, not take the page down. */
export function importProgress(code) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code))));
    if (!obj || typeof obj !== 'object') return false;
    for (const [slug, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') saveProgress(slug, {
        pts: Number(v.pts) || 0, streak: Number(v.streak) || 0,
        badges: Array.isArray(v.badges) ? v.badges : [], awards: Array.isArray(v.awards) ? v.awards : [],
      });
    }
    return true;
  } catch { return false; }
}

export class ScoreShell {
  /**
   * @param confetti  something with .burst()
   * @param opts.slug persistence key; omit to keep the shell in-memory only
   */
  constructor(confetti, opts = {}) {
    this.confetti = confetti;
    this.slug = opts.slug ?? null;

    const saved = loadProgress(this.slug);
    this.pts = saved.pts;
    this.streak = saved.streak;
    this.badges = new Set(saved.badges);
    this.awards = new Set(saved.awards);

    this._paint();
  }

  add(n) { this.pts += n; this._save(); this._paint(); }

  /**
   * Award `n` points at most once for `key`, ever — the record is persisted.
   *
   * Plain add() is farmable now that progress survives a reload: solve a
   * challenge, refresh, solve it again, and the points stack. Switching back and
   * forth between two options did the same for exploration points. Anything a
   * student can repeat should go through here.
   *
   * @returns whether the points were actually awarded
   */
  award(key, n) {
    if (this.awards.has(key)) return false;
    this.awards.add(key);
    this.add(n);            // add() persists both
    return true;
  }

  /** Has this key already been paid out, in this session or an earlier one? */
  awarded(key) { return this.awards.has(key); }
  hitStreak() { this.streak++; this._save(); this._paint(); }
  resetStreak() { this.streak = 0; this._save(); this._paint(); }

  badge(id, title, sub, ico = '🏅') {
    if (this.badges.has(id)) return;      // already earned, this run or a past one
    this.badges.add(id);
    this.add(25);                          // add() persists
    this.toast(title, sub, ico);
    this._paint();
  }

  /** Wipe this playground's progress and the on-screen counters with it. */
  reset() {
    this.pts = 0; this.streak = 0; this.badges.clear(); this.awards.clear();
    if (this.slug) clearProgress(this.slug);
    this._paint();
  }

  _save() { if (this.slug) saveProgress(this.slug, this); }

  _paint() {
    // String() rather than relying on implicit coercion: assigning the number 0
    // to textContent is not universally coerced to "0".
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
    set('s-pts', this.pts);
    set('s-streak', this.streak);
    set('s-badges', this.badges.size);
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
