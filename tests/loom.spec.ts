import { expect, test, type Locator } from '@playwright/test';

async function readLoom(media: Locator) {
  return media.evaluate((element: HTMLVideoElement) => {
    const shell = element.closest<HTMLElement>('.dhago')!;
    return {
      time: element.currentTime,
      duration: element.duration,
      woven: parseFloat(shell.style.getPropertyValue('--dhago-progress')),
      fill: shell.querySelector('.media-time-slider-fill')?.getBoundingClientRect().width ?? 0,
      paused: element.paused,
      complete: shell.hasAttribute('data-weave-complete'),
    };
  });
}

test('real playback weaves, pauses, unweaves, finishes and restarts', async ({ page }, info) => {
  await page.goto('/?local');
  const media = page.locator('#player-mount video');
  const shell = page.locator('#player-mount .dhago');
  const weave = async () => {
    const { time, duration, woven } = await readLoom(media);
    return Math.abs(woven - 100 * time / duration);
  };
  await expect(shell).toHaveAttribute('data-playback-state', 'ready');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => (await readLoom(media)).time).toBeGreaterThan(.5);
  await expect(shell).toHaveAttribute('data-playback-state', 'playing');
  await expect.poll(weave).toBeLessThan(1);
  expect((await readLoom(media)).fill).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(shell).toHaveAttribute('data-playback-state', 'paused');
  const paused = await readLoom(media);
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 350)));
  expect(await readLoom(media)).toEqual(paused);

  await page.locator('[data-seek="32"]').click();
  await expect.poll(async () => (await readLoom(media)).woven).toBeCloseTo(50, 2);
  await expect(shell.locator('.dhago-chapter-name')).toContainText('Warp meets weft');
  await page.locator('[data-seek="16"]').click();
  await expect.poll(async () => (await readLoom(media)).woven).toBeCloseTo(25, 2);
  await expect(shell.locator('.dhago-chapter-name')).toContainText('Twist into thread');

  await media.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - .35; });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(shell).toHaveAttribute('data-weave-complete', '');
  await expect(shell).toHaveAttribute('data-playback-state', 'ended');
  expect((await readLoom(media)).woven).toBe(100);
  await shell.screenshot({ path: info.outputPath('finished-cloth.png') });
  await page.locator('media-play-button').click();
  await expect(shell).not.toHaveAttribute('data-weave-complete', '');
  await expect.poll(async () => (await readLoom(media)).time).toBeLessThan(5);
  await expect(shell).toHaveAttribute('data-playback-state', 'playing');
});

test('metadata delay leaves the finite weave unset and the seek thumb disabled', async ({ page }) => {
  let releaseMedia!: () => void;
  const held = new Promise<void>(resolve => { releaseMedia = resolve; });
  await page.route('**/media/from-fibre-to-fabric.mp4', async route => {
    await held;
    await route.continue();
  });
  try {
    await page.goto('/?local', { waitUntil: 'domcontentloaded' });
    const shell = page.locator('#player-mount .dhago');
    await expect(shell).toHaveAttribute('data-playback-state', 'loading');
    await expect(shell).not.toHaveAttribute('data-weave-finite', '');
    await expect(page.getByRole('slider', { name: 'Seek' })).toBeDisabled();
    await expect(shell).not.toContainText(/NaN|Infinity/);
  } finally {
    releaseMedia();
  }
  await expect(page.locator('#player-mount .dhago')).toHaveAttribute('data-playback-state', 'ready');
});

test('rapid forward and backward seeks leave the weave aligned to actual media', async ({ page }) => {
  await page.goto('/?local');
  const media = page.locator('#player-mount video');
  const shell = page.locator('#player-mount .dhago');
  await expect(shell).toHaveAttribute('data-playback-state', 'ready');
  await media.evaluate((element: HTMLVideoElement) => {
    for (const time of [48, 2, 58, 16, 33]) element.currentTime = time;
  });
  await expect(shell).not.toHaveAttribute('data-thread-seeking', '');
  await expect.poll(async () => (await readLoom(media)).woven).toBeCloseTo(51.5625, 2);
  await expect(shell.locator('.dhago-chapter-name')).toContainText('Warp meets weft');
});
