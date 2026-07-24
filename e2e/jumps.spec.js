import { test, expect } from '@playwright/test';

const SLUGS = ['unit-circle', 'secant-tangent', 'related-rates', 'riemann-sums', 'taylor-series',
  'solids-of-revolution', 'partial-derivatives', 'gradient', 'vector-fields', 'curl-divergence', 'greens-theorem'];

// A handful of playgrounds render through a canvas engine (Surface3D,
// ContourMap, VectorFieldView) whose `schedule()` defers the actual draw —
// and the #readout update with it — to a requestAnimationFrame callback
// (see e.g. engine/surface-3d.js `schedule()`). Reading #readout immediately
// after a click can therefore catch the *previous* jump's text. Waiting for
// two rAF turns after each click (one to flush the scheduled render, one for
// margin) settles this without a brittle fixed sleep.
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

// Some lessons deliberately point two different steps at the exact same
// playground state — reusing one worked example across two narrative framings
// (theory vs. application, or two application domains) rather than inventing
// a fresh number for each. Confirmed for each pair below by reading the
// `state:` literals in the playground's content.js. This is content, not a
// bug in applyState/URL sync, so rather than deleting the "every jump moves
// the view" assertion, each known repeat is counted and subtracted from the
// expected distinct-state count.
const KNOWN_REPEATS = {
  // content.js: 'Go to the smallest h here' (level 'advanced') and 'Show me a
  // gradient check' (level 'real') both jump to { fn:'exp', x0:0.6, h:0.001 }
  // — the same "smallest usable h before float rounding hurts" example, once
  // framed as numerical-precision theory and once as ML gradient checking.
  'secant-tangent': 1,
  // content.js: 'Show me a pressure bump' and 'Read one sensitivity' (both
  // level 'real') both jump to { surf:'gauss', axis:'x', slice:1.05,
  // probe:1.8 } — one point used to illustrate two real-world domains
  // (a physical pressure bump and a finance "greeks" sensitivity).
  'partial-derivatives': 1,
  // content.js: 'Point me straight uphill' (level 'intro') and 'Line them up'
  // (level 'use') both jump to { field:'bowl', x:0.9, y:-0.6, snap:true };
  // 'Point me downhill' (level 'advanced') and 'Show me the descent step'
  // (level 'real') both jump to { field:'bowl', x:0.9, y:-0.6,
  // thetaOffsetDeg:180 }. Two pairs, each reusing one alignment demo across a
  // theory step and its follow-up application.
  gradient: 2,
  // content.js: 'Start with a big circle' and 'Shrink it and watch them meet'
  // jump to the same point with different ring radius r (0.7 vs 0.1) — #readout
  // (playground.js) only ever prints the pointwise div/curl/omega, never r, so
  // the text is identical by design even though the drawn ring differs.
  // 'Show me a shrinking ring' (level 'intro') and 'Show me flow being
  // squeezed' (level 'real') jump to the literal same state.
  'curl-divergence': 2,
};

for (const slug of SLUGS) {
  test(`${slug}: every lesson jump yields a distinct state and no console error`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`/playgrounds/${slug}/`);

    // The lesson panel starts collapsed; opening it is what reveals the level
    // toggle and jump buttons at all.
    await page.locator('.lesson-head h2').click();

    const levels = page.locator('.lesson-levels .tbtn');
    const seen = new Set();
    let jumps = 0;
    for (let i = 0; i < await levels.count(); i++) {
      await levels.nth(i).click();
      const btns = page.locator('.lesson-jump');
      for (let k = 0; k < await btns.count(); k++) {
        await page.locator('.lesson-jump').nth(k).click();
        await settle(page);
        const readout = (await page.locator('#readout').textContent())?.replace(/\s+/g, ' ').trim();
        seen.add(readout);
        jumps++;
      }
    }
    expect(jumps).toBeGreaterThan(6);
    expect(seen.size).toBe(jumps - (KNOWN_REPEATS[slug] ?? 0));   // every jump moved the view, modulo documented repeats
    expect(errors).toEqual([]);
  });
}
