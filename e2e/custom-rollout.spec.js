import { test, expect } from '@playwright/test';

// Phase 4 custom-expressions rollout, exercised across two playgrounds:
// solids-of-revolution (custom profile revolved into a solid; the challenge
// is hidden because there's no closed-form volume to converge to) and
// secant-tangent (custom curve differentiated numerically via
// engine/custom-fn.js's numericDerivative; the challenge stays visible
// because a numeric f'(x0) still gives a target to converge the secant to).

test('solids: a URL custom profile revolves and hides the challenge', async ({ page }) => {
  await page.goto('/playgrounds/solids-of-revolution/?expr=x&a=0&b=2&axis=x&n=8');
  // the expression is shown (via textContent) in the readout
  await expect(page.locator('#readout .cx')).toHaveText('y = x');
  // custom pill is visible and selected
  await expect(page.locator('#customPill')).toBeVisible();
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // no exact volume for a custom profile, so the challenge is hidden
  await expect(page.locator('#challenge')).toBeHidden();
});

test('solids: hostile input is rejected inline with no entry and no console error', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/playgrounds/solids-of-revolution/?expr=alert(1)');
  await expect(page.locator('#customMsg')).not.toHaveText('');   // inline error shown
  await expect(page.locator('#customPill')).toBeHidden();        // no custom entry created
  await expect(page.locator('#challenge')).toBeVisible();        // still a built-in view
  expect(errors).toEqual([]);
});

test('secant-tangent: a URL custom function keeps the challenge and shows the numeric derivative', async ({ page }) => {
  await page.goto('/playgrounds/secant-tangent/?expr=sin(x)&x0=0.7');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  // f'(0.7) = cos(0.7) ~= 0.7648, computed by engine/custom-fn.js's
  // numericDerivative (central difference) rather than an analytic df, and
  // rendered by engine/dom.js's fmtNum (2 decimals) as "0.76". This also
  // proves the x0-ordering fix: applyState() applies the ?expr= custom
  // function BEFORE ?x0=, so the URL's x0=0.7 wins over the custom entry's
  // default probe (0.8) — if the ordering regressed, x0 would stay at 0.8
  // and this would read cos(0.8) ~= 0.6967 -> "0.70", not "0.76".
  await expect(page.locator('#tan-val')).toHaveText(/0\.76/);
  // a numeric derivative still gives a target to converge to, so the
  // challenge stays visible (unlike solids, which has no exact volume).
  // Unlike solids-of-revolution, secant-tangent's challenge block carries no
  // id — only a `.challenge` class (see playgrounds/secant-tangent/index.html)
  // — so it's targeted by class here rather than by `#challenge`.
  await expect(page.locator('.challenge')).toBeVisible();
});

test('secant-tangent: typing a custom function updates the URL', async ({ page }) => {
  await page.goto('/playgrounds/secant-tangent/');
  await page.fill('#customExpr', 'x^2');
  await page.locator('#customExpr').dispatchEvent('input');
  await expect(page.locator('#customPill')).toHaveClass(/on/);
  await expect(page).toHaveURL(/expr=/);
});

test('Copy-link round-trips a solids custom profile through a fresh page', async ({ page, context }) => {
  await page.goto('/playgrounds/solids-of-revolution/?expr=sqrt(x)&a=0&b=4&axis=x&n=6');
  // pushUrl (engine/deep-link.js makeUrlSync) debounces 180ms; wait for the
  // synced URL to settle before treating it as the "copy link" snapshot.
  await expect(page).toHaveURL(/expr=/);
  const url = page.url();
  expect(url).toContain('expr=');
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#readout .cx')).toHaveText('y = sqrt(x)');
  await expect(p2.locator('#customExpr')).toHaveValue('sqrt(x)');
});
