/* ---- CONTENT: the FIELDS registry — the only part that changes per concept ----
   Divergence and curl are two independent things a flow can do at a point:
   expand/contract, and spin. The page shows each as a physical object — a ring
   of tracer particles whose area changes at rate div, and a paddle wheel that
   turns at rate curl/2 — so the challenge is to find the one spot where BOTH go
   still.

   Every solvable field therefore needs div and curl that both vanish somewhere
   reachable, and at DIFFERENT places for different fields, so the answer is not
   simply "the middle" every time. `still` records where that is. */
export const FIELDS = [
  { id: 'quad', label: '(x²−y², 2xy)', tex: 'shifted (x²−y², 2xy)',
    P: (x, y) => (x - 0.7) ** 2 - (y + 0.5) ** 2,
    Q: (x, y) => 2 * (x - 0.7) * (y + 0.5),
    div: (x) => 4 * (x - 0.7), curl: (x, y) => 4 * (y + 0.5),
    still: [0.7, -0.5],
    note: 'div = 4(x−c₁) and curl = 4(y−c₂): expansion is set by where you stand left-to-right, spin by up-and-down.' },

  { id: 'mixed', label: '(xy, 0)', tex: 'shifted (xy, 0)',
    P: (x, y) => (x + 0.9) * (y - 0.6), Q: () => 0,
    div: (x, y) => y - 0.6, curl: (x) => -(x + 0.9),
    still: [-0.9, 0.6],
    note: 'A one-component flow that still both spreads and spins — div and curl come from different partials.' },

  { id: 'cubic', label: '(−y³, x³)', tex: 'shifted (−y³, x³)',
    P: (x, y) => -((y - 0.4) ** 3), Q: (x) => (x + 0.6) ** 3,
    div: () => 0, curl: (x, y) => 3 * (x + 0.6) ** 2 + 3 * (y - 0.4) ** 2,
    still: [-0.6, 0.4],
    note: 'Divergence is zero everywhere — incompressible. Only the spin has to be hunted down.' },

  { id: 'blob', label: '((x−a)², (y−b)²)', tex: 'shifted ((x−a)², (y−b)²)',
    P: (x) => (x - 1.1) ** 2, Q: (x, y) => (y + 0.3) ** 2,
    div: (x, y) => 2 * (x - 1.1) + 2 * (y + 0.3), curl: () => 0,
    still: null, stillLine: 'the line where 2(x−1.1) + 2(y+0.3) = 0',
    note: 'Curl is zero everywhere — irrotational. The wheel never turns; only the ring breathes.' },

  { id: 'vortex', label: '(−y, x)', tex: '(−y, x)',
    P: (x, y) => -y, Q: (x) => x,
    div: () => 0, curl: () => 2,
    still: null, stillLine: null,
    note: 'Curl is 2 at every single point. There is nowhere the wheel slows down, let alone stops.' },
];

/** Both quantities at a point, and the paddle wheel rate they imply. */
export function readingsAt(field, x, y) {
  const d = field.div(x, y), c = field.curl(x, y);
  return { div: d, curl: c, omega: c / 2 };
}

/** How still the flow is here — the quantity the challenge drives to zero. */
export const stillness = (field, x, y) =>
  Math.max(Math.abs(field.div(x, y)), Math.abs(field.curl(x, y)));

/** Whether this field has any point at all where both vanish. */
export const canGoStill = field => field.still !== null || field.stillLine !== null;
