import { test, expect } from '@playwright/test';

// Phase 5 two-variable custom-expressions rollout, exercised across two
// playgrounds: partial-derivatives (custom f(x,y) surface; the challenge is
// hidden because a custom surface has no known critical point to converge
// to — see playgrounds/partial-derivatives/playground.js's updatePanel,
// which does `if (sf.custom) { s('challenge').style.display = 'none'; ... }`
// against the id="challenge" element) and gradient (custom f(x,y) field; the
// challenge stays visible because "point uphill" is still a well-posed goal
// for any field, custom or not — gradient's challenge card carries no id,
// only a `.challenge` class, so it's targeted by class here rather than by
// `#challenge`, matching secant-tangent's Phase 4 pattern).

test('partial-derivatives: a URL custom surface renders and hides the challenge', async ({ page }) => {
  await page.goto('/playgrounds/partial-derivatives/?expr=x^2-y^2');
  await expect(page.locator('#customPill')).toBeVisible();
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page.locator('#challenge')).toBeHidden();
  await expect(page.locator('#customExpr')).toHaveValue('x^2-y^2');
});

test('partial-derivatives: hostile input is rejected inline with no entry and no error', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/playgrounds/partial-derivatives/?expr=alert(1)');
  await expect(page.locator('#customMsg')).not.toHaveText('');   // inline error shown
  await expect(page.locator('#customPill')).toBeHidden();        // no custom entry created
  await expect(page.locator('#challenge')).toBeVisible();        // still a built-in view
  expect(errors).toEqual([]);
});

test('gradient: a URL custom field renders and KEEPS the challenge', async ({ page }) => {
  // The literal '+' in the expression must be percent-encoded (%2B) in the
  // navigated URL: engine/deep-link.js reads the query string via
  // URLSearchParams, which — per the URL spec — decodes an unencoded '+' as
  // a space. The app's own round-trip (typing into #customExpr, Copy-link)
  // never hits this because stateToParams()/syncedUrl() always serialize
  // through URLSearchParams, which percent-encodes '+' on the way out; this
  // only bites a hand-built literal query string like this one.
  await page.goto('/playgrounds/gradient/?expr=x^2%2By^2');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // secant-tangent-style: unlike partial-derivatives, the challenge stays —
  // gradient/index.html's challenge card has no id, only a `.challenge`
  // class (see comment above), so target it by class.
  await expect(page.locator('.challenge')).toBeVisible();
  await expect(page.locator('#customExpr')).toHaveValue('x^2+y^2');
});

test('gradient: typing a custom field updates the URL', async ({ page }) => {
  await page.goto('/playgrounds/gradient/');
  await page.fill('#customExpr', 'sin(x)*cos(y)');
  await page.locator('#customExpr').dispatchEvent('input');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page).toHaveURL(/expr=/);
});

test('partial-derivatives Copy-link round-trips a custom surface', async ({ page, context }) => {
  await page.goto('/playgrounds/partial-derivatives/?expr=x*y');
  // pushUrl (engine/deep-link.js makeUrlSync) debounces 180ms; wait for the
  // synced URL to settle before treating it as the "copy link" snapshot.
  await expect(page).toHaveURL(/expr=/);
  const url = page.url();
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#customExpr')).toHaveValue('x*y');
  await expect(p2.locator('#customPill')).toHaveClass(/on/);
});
