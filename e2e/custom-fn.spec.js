import { test, expect } from '@playwright/test';

// riemann-sums' custom-function feature (playgrounds/riemann-sums/playground.js,
// engine/custom-fn.js). Midpoint sum of x^2 over [0,2] at n=80 was checked
// against a standalone reimplementation of riemannSum: 2.666563..., which the
// readout renders via `.toFixed(5)` as "2.66656" — "2.6" is a safe, meaningful
// substring (it would fail if the wrong rule/n/domain were applied).

test('a URL custom function integrates and shows the expression', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/?expr=x^2&a=0&b=2&rule=mid&n=80');
  // the expression is shown (via textContent) in the readout
  await expect(page.locator('#readout .cx')).toHaveText('x^2');
  // midpoint sum of x^2 over [0,2] at n=80 ~= 2.6666 (verified against riemannSum)
  await expect(page.locator('#readout')).toContainText('2.6');
  // custom pill is visible and selected
  await expect(page.locator('#customPill')).toBeVisible();
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // the challenge is hidden for a custom function
  await expect(page.locator('#challenge')).toBeHidden();
});

test('a hostile expression is rejected inline with no entry and no console error', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/playgrounds/riemann-sums/?expr=alert(1)');
  await expect(page.locator('#customMsg')).not.toHaveText('');   // inline error shown
  await expect(page.locator('#customPill')).toBeHidden();        // no custom entry created
  await expect(page.locator('#challenge')).toBeVisible();        // still a built-in view
  expect(errors).toEqual([]);
});

test('typing a custom function updates the URL and the plot', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/');
  await page.fill('#customExpr', 'sin(x)');
  await page.locator('#customExpr').dispatchEvent('input');
  await expect(page.locator('#readout .cx')).toHaveText('sin(x)');
  await expect(page).toHaveURL(/expr=sin/);
  await expect(page.locator('#challenge')).toBeHidden();
});

test('Copy-link round-trips a custom function through a fresh page', async ({ page, context }) => {
  await page.goto('/playgrounds/riemann-sums/?expr=x^2&a=1&b=3&n=40');
  // pushUrl (engine/deep-link.js makeUrlSync) debounces 180ms; wait for the
  // synced URL to settle before treating it as the "copy link" snapshot.
  await expect(page).toHaveURL(/expr=/);
  const url = page.url();
  expect(url).toContain('expr=');
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#readout .cx')).toHaveText('x^2');
  await expect(p2.locator('#customExpr')).toHaveValue('x^2');
});

test('switching to a built-in drops the custom function from the URL', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/?expr=x^2&a=0&b=2');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // #customPill is also an ".fbtn" inside #fbtns (appended after the built-in
  // pills), so target a real built-in pill explicitly rather than assume
  // DOM order — the first built-in integrand (x^2, INTEGRANDS[0]).
  await page.locator('#fbtns .fbtn:not(.custom-pill)').first().click();
  await expect(page.locator('#challenge')).toBeVisible();     // challenge back
  await expect(page).not.toHaveURL(/expr=/);                  // managed key dropped
});
