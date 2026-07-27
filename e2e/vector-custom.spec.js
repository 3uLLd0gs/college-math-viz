import { test, expect } from '@playwright/test';

// Phase 6 vector-valued custom-expressions rollout, exercised across all three
// F=(P,Q) playgrounds (vector-fields, curl-divergence, greens-theorem). Each
// carries #customPill, two fields (#customP/#customQ), #customMsg, and a
// #challenge card (id added this phase) that a custom field hides — see each
// playground.js's render()/updatePanel: `if (fd.custom) { s('challenge')
// .style.display = 'none'; return; }`. Compilation is delegated entirely to
// engine/expr.js's whitelist parser (engine/custom-fn.js's compileCustom2),
// so a hostile expression like `alert(1)` never executes — it just fails to
// parse (`Unknown function: alert`), leaving the built-in field in place.

const PAGES = [
  { slug: 'vector-fields',   p: '-y',      q: 'x' },
  { slug: 'curl-divergence', p: 'x^2-y^2', q: '2*x*y' },
  { slug: 'greens-theorem',  p: '-y',      q: 'x*y' },
];

for (const { slug, p, q } of PAGES) {
  test(`${slug}: a URL custom field renders and hides the challenge`, async ({ page }) => {
    await page.goto(`/playgrounds/${slug}/?exprP=${encodeURIComponent(p)}&exprQ=${encodeURIComponent(q)}`);
    await expect(page.locator('#customPill')).toBeVisible();
    await expect(page.locator('#customPill')).toHaveClass(/on/);
    await expect(page.locator('#challenge')).toBeHidden();
    await expect(page.locator('#customP')).toHaveValue(p);
    await expect(page.locator('#customQ')).toHaveValue(q);
  });

  test(`${slug}: a hostile P is rejected inline with no entry and no error`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`/playgrounds/${slug}/?exprP=${encodeURIComponent('alert(1)')}&exprQ=x`);
    await expect(page.locator('#customMsg')).not.toHaveText('');   // inline error shown
    await expect(page.locator('#customPill')).toBeHidden();        // no custom entry created
    await expect(page.locator('#challenge')).toBeVisible();        // still a built-in view
    expect(errors).toEqual([]);
  });
}

test('vector-fields: typing a custom field updates the URL', async ({ page }) => {
  await page.goto('/playgrounds/vector-fields/');
  await page.fill('#customP', '-y');
  await page.fill('#customQ', 'x');
  await page.locator('#customQ').dispatchEvent('input');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // pushUrl (engine/deep-link.js makeUrlSync) debounces 180ms; wait for the
  // synced URL to settle rather than sleeping a fixed amount.
  await expect(page).toHaveURL(/exprP=/);
});

test('curl-divergence Copy-link round-trips a custom field', async ({ page, context }) => {
  await page.goto('/playgrounds/curl-divergence/?exprP=' + encodeURIComponent('x^2-y^2') + '&exprQ=' + encodeURIComponent('2*x*y'));
  await expect(page).toHaveURL(/exprP=/);
  const url = page.url();
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#customP')).toHaveValue('x^2-y^2');
  await expect(p2.locator('#customQ')).toHaveValue('2*x*y');
  await expect(p2.locator('#customPill')).toHaveClass(/on/);
});
