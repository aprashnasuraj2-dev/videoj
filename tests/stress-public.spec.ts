import { expect, test } from '@playwright/test';

test('manual study keeps the original film and clearly separates real-device verification', async ({ page }) => {
  await page.goto('/stress.html?case=manual');
  await expect(page.getByRole('heading', { name: 'Beyond the browser' })).toBeVisible();
  await expect(page.locator('#manual-spotlight')).toBeVisible();
  await expect(page.locator('#manual-spotlight')).toContainText('Live and time-shifted video');
  await expect(page.locator('#manual-spotlight')).toContainText('iPhone, AirPlay and fullscreen');
  await expect(page.locator('#manual-spotlight')).toContainText('Zoom, touch and accessibility');
  await expect(page.locator('#lab-case-list .lab-case')).toHaveCount(16);
  await expect(page.locator('#lab-player video')).toHaveAttribute('src', './media/studies-in-thread.mp4');
  await expect(page.locator('#case-badge')).toHaveText('DEVICE REVIEW');
  await page.locator('#edge-truth-title').click();
  await expect(page.locator('#edge-truth-metrics')).toContainText('Ready to play');
  await page.getByRole('button', { name: 'Original weave' }).click();
  await expect(page.locator('#manual-spotlight')).toBeHidden();
  await expect(page.locator('#lab-player video')).toHaveAttribute('src', './media/studies-in-thread.mp4');
});

test('all gallery destinations and example connector resolve as actual static files', async ({ request, page }) => {
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
  const link=page.locator('a[download][href="./stress-adapter.example.mjs"]');
  await expect(link).toBeVisible();
});

test('visitor-facing study introduction contains no deployment or developer handoff wording', async ({ page }) => {
  await page.goto('/stress.html?case=manual');
  const intro=await page.locator('.lab-intro,.lab-small-print,.lab-context').allTextContents();
  expect(intro.join(' ')).not.toMatch(/\\b(repository|commit|internal handoff|debug fixture|test harness|deployment checklist)\\b/i);
  await expect(page.getByRole('link', { name: /Explore the player comparison studio/ })).toBeVisible();
});
