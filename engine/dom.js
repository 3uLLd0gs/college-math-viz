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
