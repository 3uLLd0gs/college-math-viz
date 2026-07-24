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
   preserving any foreign params (e.g. ?present=1 from presenter mode) so the
   auto-sync and the Copy-link button never strip each other's keys. Returns a
   pathname-relative URL (pathname + '?' + merged query). */
export function syncedUrl(params) {
  const merged = new URLSearchParams(window.location.search);
  for (const [k, v] of params.entries()) merged.set(k, v);
  const qs = merged.toString();
  return `${window.location.pathname}${qs ? '?' + qs : ''}`;
}

export function makeUrlSync(toParams, { delay = 180 } = {}) {
  let timer = null;
  return state => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      window.history.replaceState(null, '', syncedUrl(toParams(state)));
    }, delay);
  };
}
