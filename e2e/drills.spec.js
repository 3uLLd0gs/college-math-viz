import { test, expect } from '@playwright/test';
import { makeRng } from '../engine/drill/rng.js';
import { nextProblem } from '../engine/drill/differentiation.js';

test('the seeded first problem shows the expected prompt and accepts its reference answer', async ({ page }) => {
  const p = nextProblem(makeRng(42));            // same seed the page will use
  await page.goto('/drills/differentiation-rules/?seed=42');
  await expect(page.locator('#drill-fx')).toContainText(p.promptText);   // seed reproduces the problem
  await page.fill('#drill-input', p.answer);
  await page.click('#drill-check');
  await expect(page.locator('#drill-feedback')).toHaveClass(/right/);
});

test('a wrong answer is rejected', async ({ page }) => {
  await page.goto('/drills/differentiation-rules/?seed=42');
  await page.fill('#drill-input', '0');
  await page.click('#drill-check');
  await expect(page.locator('#drill-feedback')).toHaveClass(/wrong/);
});

test('unreadable input gets an inline warning, not a crash', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/drills/differentiation-rules/?seed=1');
  await page.fill('#drill-input', 'alert(1)');
  await page.click('#drill-check');
  await expect(page.locator('#drill-feedback')).toHaveClass(/warn/);
  expect(errors).toEqual([]);
});

test('hints reveal one at a time', async ({ page }) => {
  await page.goto('/drills/differentiation-rules/?seed=7');
  await expect(page.locator('#drill-hints li')).toHaveCount(0);
  await page.click('#drill-hint');
  await expect(page.locator('#drill-hints li')).toHaveCount(1);
  await page.click('#drill-hint');
  await expect(page.locator('#drill-hints li')).toHaveCount(2);
});

test('the same seed reproduces the same first problem across loads', async ({ page, context }) => {
  await page.goto('/drills/differentiation-rules/?seed=99');
  const a = await page.locator('#drill-fx').textContent();
  const p2 = await context.newPage();
  await p2.goto('/drills/differentiation-rules/?seed=99');
  expect(await p2.locator('#drill-fx').textContent()).toBe(a);
});
