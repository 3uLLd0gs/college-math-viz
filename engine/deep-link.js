/* Turn a playground's plain state object into shareable URL parameters and back.
   The state shape is exactly what each playground's applyState() already accepts,
   so a link IS a lesson jump the professor gets to author. */

const round = n => {
  const r = Math.round(n * 1e4) / 1e4;
  return Object.is(r, -0) ? 0 : r;
};

export function stateToParams(state) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'boolean') p.set(k, v ? '1' : '0');
    else if (typeof v === 'number') p.set(k, String(round(v)));
    else p.set(k, String(v));
  }
  return p;
}

export function paramsToState(params, schema) {
  const st = {};
  for (const [key, type] of Object.entries(schema)) {
    if (!params.has(key)) continue;
    const raw = params.get(key);
    if (type === 'number') { const n = Number(raw); if (Number.isFinite(n)) st[key] = n; }
    else if (type === 'boolean') st[key] = raw === '1' || raw === 'true';
    else st[key] = raw;
  }
  return st;
}

export const readState = schema =>
  paramsToState(new URLSearchParams(window.location.search), schema);

/** Merge freshly-computed schema params into the current URL's search string,
   preserving foreign params (e.g. ?present=1) so the auto-sync and Copy-link
   never strip each other's keys. If `managed` (an array of key names owned by
   this writer) is given, those keys are cleared first, so an optional schema
   key that is currently absent (e.g. ?expr when a built-in is selected) is
   dropped rather than left stale. Returns a pathname-relative URL. */
export function syncedUrl(params, managed) {
  const merged = new URLSearchParams(window.location.search);
  if (managed) for (const k of managed) merged.delete(k);
  for (const [k, v] of params.entries()) merged.set(k, v);
  const qs = merged.toString();
  return `${window.location.pathname}${qs ? '?' + qs : ''}`;
}

export function makeUrlSync(toParams, { delay = 180, managed } = {}) {
  let timer = null;
  return state => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      window.history.replaceState(null, '', syncedUrl(toParams(state), managed));
    }, delay);
  };
}
