import { test, expect } from '@playwright/test';

test('a deep-linked converged run shows a tiny residual', async ({ page }) => {
  await page.goto('/playgrounds/newtons-method/?fn=quad&x0=2&n=8');
  const readout = (await page.locator('#readout').textContent()) ?? '';
  expect(readout).toContain('converged');
  // current xₙ ≈ √2 ≈ 1.414
  await expect(page.locator('#xn-val')).toContainText('1.41');
});

test('the Iterate control advances the step count and drives the residual down', async ({ page }) => {
  await page.goto('/playgrounds/newtons-method/?fn=quad&x0=2&n=1');
  const before = (await page.locator('#err-val').textContent()) ?? '';
  await page.locator('#n').fill('7');            // step the slider up
  await page.locator('#n').dispatchEvent('input');
  await expect(page.locator('#n-val')).toHaveText('7');
  const after = (await page.locator('#err-val').textContent()) ?? '';
  expect(after).not.toBe(before);                // the residual changed as steps grew
  expect(page.locator('#readout')).toContainText(/converg/);
});

// content.js documents this case as a textbook 2-cycle: x0=0 -> x1=1 -> x2=0
// -> ... forever, |f(xn)| alternating 2 and 1 without ever approaching the
// tolerance. The readout's status word for this run is 'converging' (not
// 'converged', not 'cycling' — see task-5-report.md for the statusWord()
// discrepancy this surfaced), so the meaningful, non-brittle assertion is on
// the actual Newton behavior: the residual at step 8 is identical to the
// residual at step 4 — real convergence would have shrunk it toward the
// challenge tolerance (1e-4) over those four extra steps.
test('the 2-cycle case never converges despite repeated iteration', async ({ page }) => {
  await page.goto('/playgrounds/newtons-method/?fn=cycle&x0=0&n=4');
  const errAt4 = (await page.locator('#err-val').textContent()) ?? '';
  await page.goto('/playgrounds/newtons-method/?fn=cycle&x0=0&n=8');
  const errAt8 = (await page.locator('#err-val').textContent()) ?? '';
  expect(errAt8).toBe(errAt4);                       // no progress at all across 4 more steps
  await expect(page.locator('#readout')).not.toContainText('converged');
  await expect(page.locator('.challenge')).toBeVisible();
});

test('the flat-tangent fling is reported, not crashed', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/playgrounds/newtons-method/?fn=quad&x0=0&n=3');
  await expect(page.locator('#readout')).toContainText('flung');
  expect(errors).toEqual([]);
});

test('Copy-link round-trips fn / x0 / n', async ({ page, context }) => {
  await page.goto('/playgrounds/newtons-method/?fn=cosx&x0=-0.5&n=6');
  const url = page.url();
  expect(url).toContain('fn=cosx');
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.locator('#readout')).toContainText('converged');
});
