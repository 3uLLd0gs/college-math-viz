import { test, expect } from '@playwright/test';

// riemann-sums' URL_SCHEMA (playgrounds/riemann-sums/playground.js) is
// { fn: 'string', rule: 'string', n: 'number' } with fn id 'sin' (INTEGRANDS,
// content.js) and rule id 'mid' (RULES, content.js) — confirmed by reading
// content.js directly. The readout renders `${fn.tex}` ("sin x") and
// `${rule.label}` ("Midpoint"), so 'sin' and the lowercased 'mid' both appear.
test('a parametered URL reproduces the state', async ({ page }) => {
  await page.goto('/playgrounds/riemann-sums/?fn=sin&rule=mid&n=30');
  const readout = (await page.locator('#readout').textContent()) ?? '';
  expect(readout).toContain('sin');
  expect(readout.toLowerCase()).toContain('mid');
});

// unit-circle's URL_SCHEMA is { trace: 'string', deg: 'number' } (confirmed by
// reading playground.js) — the angle param really is `deg`. The #theta slider
// input is in degrees (min=0 max=720), and its `input` handler calls
// setTheta()+render()+pushUrl(); pushUrl is debounced 180ms (makeUrlSync in
// engine/deep-link.js), so the test waits for the URL to actually update
// before reading it.
test('Copy link round-trips through a fresh navigation', async ({ page, context }) => {
  await page.goto('/playgrounds/unit-circle/');
  const t = page.locator('#theta');
  await t.fill('120');
  await t.dispatchEvent('input');
  await expect(async () => {
    expect(page.url()).toContain('deg=');
  }).toPass();
  const url = page.url();
  const p2 = await context.newPage();
  await p2.goto(url);
  const r = (await p2.locator('#readout').textContent()) ?? '';
  expect(r).toContain('120');
});
