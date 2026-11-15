import { expect, test } from '@playwright/test';

test('manual study keeps the original film and clearly separates real-device verification', async ({ page }) => {
  await page.goto('/stress.html?case=manual');
  await expect(page.getByRole('heading', { name: 'Beyond the browser' })).toBeVisible();
  await expect(page.locator('#manual-spotlight')).toBeVisible();
  await expect(page.locator('#manual-spotlight')).toContainText('Live, with room to rewind');
  await expect(page.locator('#manual-spotlight')).toContainText('From your phone to the big screen');
  await expect(page.locator('#manual-spotlight')).toContainText('Watch your own way');
  await expect(page.locator('#lab-case-list .lab-case')).toHaveCount(16);
  await expect(page.locator('#lab-player video')).toHaveAttribute('src', './media/studies-in-thread.mp4');
  await expect(page.locator('#case-badge')).toHaveText('DEVICE REVIEW');
  await page.locator('#edge-truth-title').click();
  await expect(page.locator('#edge-truth-metrics')).toContainText('Ready to play');
  await page.getByRole('button', { name: 'Original weave' }).click();
  await expect(page.locator('#manual-spotlight')).toBeHidden();
  await expect(page.locator('#lab-player video')).toHaveAttribute('src', './media/studies-in-thread.mp4');
});

test('all gallery destinations resolve and comparison studio stays public-facing', async ({ request, page }) => {
  await page.goto('/stress.html?case=manual');
  for (const path of ['/index.html', '/journal.html', '/tools.html', '/ribbon.html', '/stress-adapter.example.mjs']) {
    const response=await request.get(path);
    expect(response.status(), path).toBe(200);
    const contentType=response.headers()['content-type']||'';
    expect(contentType, path).not.toContain('application/json');
    expect((await response.body()).length, path).toBeGreaterThan(0);
  }
  const original=await request.get('/media/studies-in-thread.mp4');
  expect(original.status()).toBe(200);
  expect((await original.body()).length).toBe(2563521);
  await page.locator('.portable-external summary').click();
  const comparison=page.locator('.portable-external');
  await expect(comparison).toContainText('Compare another player');
  await expect(comparison).not.toContainText(/JavaScript|adapter|\.mjs|GitHub|repository|source code/i);
});

test('visitor-facing study introduction contains no deployment or developer handoff wording', async ({ page }) => {
  await page.goto('/stress.html?case=manual');
  const publicCopy=await page.locator('.lab-intro,.lab-small-print,.lab-context,.portable-tool').allTextContents();
  expect(publicCopy.join(' ')).not.toMatch(/\b(repository|commit|internal handoff|debug fixture|test harness|deployment checklist|JavaScript integration|adapter|GitHub|source code)\b/i);
  await expect(page.getByRole('link', { name: /Explore the player comparison studio/ })).toBeVisible();
});