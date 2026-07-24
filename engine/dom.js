export function s(id) {
  return document.getElementById(id);
}

export function getCSS(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Compact formatter for graph axis tick labels — trailing zeros stripped. */
export function fmtAxis(v) {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

/** Fixed 2-decimal formatter for slider/readout values. */
export function fmtNum(v) {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0.00' : r.toFixed(2);
}

/** Presenter mode: driven by the ?present=1 URL flag, with an optional toggle
   button (#present) that edits the flag so the URL stays the single source of
   truth and composes with the deep-link params. */
export function mountPresenter() {
  const on = new URLSearchParams(location.search).get('present') === '1';
  document.body.classList.toggle('present', on);
  const btn = document.getElementById('present');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(on));
  btn.addEventListener('click', () => {
    const p = new URLSearchParams(location.search);
    const now = p.get('present') !== '1';
    if (now) p.set('present', '1'); else p.delete('present');
    history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p : ''}`);
    document.body.classList.toggle('present', now);
    btn.setAttribute('aria-pressed', String(now));
  });
}
