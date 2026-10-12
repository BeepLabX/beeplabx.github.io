import { test, expect, type Page } from '@playwright/test';

const WORKS = [
  { slug: 'totillu', title: 'Totillu', url: 'https://totillu.beeplab.workers.dev/' },
  { slug: 'lamplighter', title: 'Lamplighter', url: 'https://lamp.beeplab.workers.dev/' },
];

function collectErrors(page: Page) {
  const errors: string[] = [];
  // Chrome reports this when a navigation starts before the old page has painted: it only skips the
  // page-to-page animation, the navigation itself goes through.
  const benign = (text: string) => text.startsWith('Transition was aborted');
  page.on('pageerror', e => !benign(e.message) && errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !benign(m.text()) && errors.push(m.text()));
  return errors;
}

// Totillu walks over the page; keep it resting so pointer tests hit what they aim at.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('totillu-walk', 'paused'));
});

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test('home contains the current brand and only selected works', async ({ page }) => {
  const errors = collectErrors(page);
  const failed: string[] = [];
  page.on('requestfailed', request => failed.push(request.url()));
  await page.goto('/');
  await expect(page).toHaveTitle(/BeepLabX/);
  await expect(page.locator('h1')).toHaveText('BeepLabX.');
  await expect(page.locator('#works h2')).toContainText('Selected Works');
  await expect(page.locator('#lab, #notes, #about')).toHaveCount(0);
  await expect(page.locator('[data-work]')).toHaveCount(2);
  for (const work of WORKS) {
    await expect(page.locator(`#works a[href="/works/${work.slug}/"]`)).toHaveCount(1);
    await expect(page.locator(`#works a[href="${work.url}"]`)).toHaveAttribute('target', '_blank');
  }
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(async () => (await document.fonts.load('500 18px "Pretendard Variable"', '웹을 만들고 게임을 만듭니다')).length)).toBeGreaterThan(0);
  await expect(page.locator('.brand img')).toHaveAttribute('src', '/brand.png');
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute('href', '/favicon-32.png');
  for (const path of ['/brand.png', '/favicon-32.png', '/favicon-192.png', '/apple-touch-icon.png', '/og.png']) {
    expect((await page.request.get(path)).status()).toBe(200);
  }
  await expect(page.locator('.work__browser, .work__phone')).toHaveCount(0);
  await expect(page.locator('[data-companion]')).toHaveCount(1);
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('scroll reveals works, updates progress and uses the project accent', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-work="lamplighter"]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--scroll-accent'))).toBe('#ffa94d');
  await expect(page.locator('[data-rail] a[href="#project-lamplighter"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-rail] a[href="#intro"]')).toHaveAttribute('aria-current', 'false');
  expect(await page.locator('[data-progress]').evaluate(el => getComputedStyle(el).transform)).not.toBe('matrix(0, 0, 0, 1, 0, 0)');
  await noHorizontalScroll(page);
});

test('hero title is drawn as particles that react to a press', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const title = page.locator('#hero-title');
  await expect(title).toHaveClass(/is-particle/);
  await expect(title).toHaveText('BeepLabX.');
  const canvas = page.locator('.hero__particles');
  const frame = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  let settled = '';
  await expect.poll(async () => { const prev = settled; settled = await frame(); return prev === settled; }, { intervals: [300] }).toBe(true);
  const box = (await title.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(frame).not.toBe(settled);
  expect(errors).toEqual([]);
});

test('the hero particles fly into the first project title and back', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hero-title')).toHaveClass(/is-particle/);
  const inked = () => page.locator('.hero__particles').evaluate((c: HTMLCanvasElement) =>
    c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0));
  await expect.poll(inked).toBe(true);
  // The drawing must not be stretched: canvas box = current viewport, also after a height-only resize
  // (what a phone's address bar does).
  const fits = () => page.locator('.hero__particles').evaluate((c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    return Math.abs(r.height - innerHeight) < 1 && Math.abs(r.width - innerWidth) < 1;
  });
  expect(await fits()).toBe(true);
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.width, height: vp.height - 60 });
  await expect.poll(fits).toBe(true);
  await page.setViewportSize(vp);
  await page.locator('[data-work="totillu"]').scrollIntoViewIfNeeded();
  await expect.poll(inked, { timeout: 5000 }).toBe(false);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(inked).toBe(true);
});

test('Totillu walks around, can be dragged, squishes and pauses', async ({ page, browserName }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const pet = page.locator('[data-companion]');
  const toggle = page.locator('[data-companion-toggle]');
  await expect(pet).toHaveAttribute('data-state', 'paused');
  await toggle.click();
  await expect(pet).toHaveAttribute('data-state', 'walking');
  const start = await pet.getAttribute('style');
  await expect.poll(() => pet.getAttribute('style'), { timeout: 5000 }).not.toBe(start);

  await toggle.click();
  await expect(pet).toHaveAttribute('data-state', 'paused');
  expect(await page.evaluate(() => localStorage.getItem('totillu-walk'))).toBe('paused');
  const friend = pet.locator('button');
  const box = (await friend.boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  if (info.project.name === 'mobile' && browserName === 'chromium') {
    // A real finger drag: Playwright's touchscreen only taps, so send the touch points directly.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', from.x, from.y);
    await expect(friend).toHaveClass(/is-pressed/);
    for (let i = 1; i <= 6; i++) await touch('touchMove', from.x - 20 * i, from.y - 24 * i);
    await touch('touchEnd', 0, 0);
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await expect(friend).toHaveClass(/is-pressed/);
    await page.mouse.move(from.x - 120, from.y - 144, { steps: 6 });
    await page.mouse.up();
  }
  const moved = (await friend.boundingBox())!;
  expect(moved.x).toBeLessThan(box.x - 100);
  expect(moved.y).toBeLessThan(box.y - 100);

  const footer = (await page.locator('.footer').boundingBox())!;
  expect(moved.y + moved.height).toBeLessThanOrEqual(footer.y);
  expect(errors).toEqual([]);
});

test('Lamplighter arrives in the dark once, and its card lamps stay lit', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const pet = page.locator('[data-companion]');
  const lamps = page.locator('[data-work="lamplighter"] .art__lamps i');
  await expect(lamps).toHaveCount(4);
  await expect(page.locator('[data-work="lamplighter"] .art__lamps i.is-lit')).toHaveCount(0);
  await page.locator('[data-work="lamplighter"]').scrollIntoViewIfNeeded();
  const veil = page.locator('.veil');
  await expect(veil).toHaveCount(1);
  await expect(pet).toHaveAttribute('data-mood', 'lamp');
  await lamps.first().dispatchEvent('pointerdown');
  await expect(lamps.first()).toHaveClass(/is-lit/);
  // Totillu rests in tests, so the rest catch one after another on their own, quickly.
  await expect(page.locator('[data-work="lamplighter"] .art__lamps i:not(.is-lit)')).toHaveCount(0, { timeout: 3000 });
  await expect(veil).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('[data-work="lamplighter"] .work__open')).toBeInViewport();
  await page.locator('[data-work="totillu"]').scrollIntoViewIfNeeded();
  await expect(pet).toHaveAttribute('data-mood', '');
  await page.locator('[data-work="lamplighter"]').scrollIntoViewIfNeeded();
  await expect(pet).toHaveAttribute('data-mood', 'lamp');
  await expect(veil).toHaveCount(0);
  await expect(page.locator('[data-work="lamplighter"] .art__lamps i.is-lit')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('a walking Totillu runs around lighting the lamps', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-companion-toggle]').click();
  await page.locator('[data-work="lamplighter"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-companion-say]')).toHaveText('점등!', { timeout: 4000 });
  await expect(page.locator('.veil')).toHaveCount(0, { timeout: 8000 });
});

test('the walking Totillu squishes along with the big one', async ({ page }) => {
  await page.goto('/#project-totillu');
  await page.locator('.art__touch').click();
  await expect(page.locator('[data-companion-say]')).toHaveText('나도!');
  await expect(page.locator('[data-companion] button')).toHaveClass(/is-startled/);
});

test('project artwork and title are paired across pages for the view transition', async ({ page }) => {
  await page.goto('/');
  const name = (sel: string) => page.locator(sel).evaluate(el => getComputedStyle(el).viewTransitionName);
  expect(await name('[data-work="totillu"] .project-art')).toBe('art-totillu');
  expect(await name('#work-totillu')).toBe('title-totillu');
  await page.locator('#works a[href="/works/totillu/"]').click();
  await expect(page).toHaveURL(/\/works\/totillu\/$/);
  expect(await name('.detail__media .project-art')).toBe('art-totillu');
  expect(await name('h1')).toBe('title-totillu');
});

test('Totillu artwork reacts to keyboard and pointer presses', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const friend = page.locator('.art__touch');
  await page.locator('.hero__cta').click();
  await friend.focus();
  await page.keyboard.down('Space');
  await expect(friend).toHaveClass(/is-pressed/);
  await page.keyboard.up('Space');
  await expect(friend).not.toHaveClass(/is-pressed/);
  await friend.hover();
  await page.mouse.down();
  await expect(friend).toHaveClass(/is-pressed/);
  await page.mouse.up();
  await expect(friend).not.toHaveClass(/is-pressed/);
  expect(errors).toEqual([]);
});

test('wheel scrolling lands on each project and links reach the footer and top', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'y mandatory');
  const headerHeight = await page.locator('.header').evaluate(el => el.getBoundingClientRect().height);
  for (const work of WORKS) {
    await page.mouse.wheel(0, page.viewportSize()!.height * .85);
    const card = page.locator(`[data-work="${work.slug}"]`);
    await expect.poll(() => card.evaluate(el => Math.abs(el.getBoundingClientRect().top - 72))).toBeLessThan(.5);
    const bounds = (await card.boundingBox())!;
    expect(bounds.y).toBeCloseTo(headerHeight, 0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height + 2);
    await expect(card.locator('.work__open')).toBeInViewport();
  }
  await page.mouse.wheel(0, 600);
  await expect(page.locator('.footer__copyright')).toBeInViewport();
  await page.locator('.footer a[href="#main"]').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test('short mobile screens keep project links and artwork reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/#project-lamplighter');
  const card = page.locator('[data-work="lamplighter"]');
  await card.locator('.work__more').scrollIntoViewIfNeeded();
  await expect(card.locator('.work__more')).toBeInViewport();
  await card.locator('.project-art').scrollIntoViewIfNeeded();
  await expect(card.locator('.project-art')).toBeInViewport();
  await noHorizontalScroll(page);
});

test('quick navigation supports filtering and direct navigation', async ({ page }, info) => {
  await page.goto('/');
  if (info.project.name === 'desktop') await page.keyboard.press('/');
  else await page.getByRole('button', { name: '메뉴', exact: true }).click();
  const dialog = page.locator('[data-quicknav]');
  await expect(dialog).toBeVisible();
  await page.locator('#qn-filter').fill('lamplighter');
  await expect(dialog.locator('li:not([hidden]) a')).toHaveCount(2);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/works\/lamplighter\/$/);
});

test('quick navigation restores focus on Escape', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: '메뉴', exact: true });
  await menu.click();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-qn-item]').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-quicknav]')).toBeHidden();
  await expect(menu).toBeFocused();
});

for (const work of WORKS) {
  test(`work detail loads directly and links to the service: ${work.slug}`, async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto(`/works/${work.slug}/`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText(work.title);
    await expect(page.locator(`a[href="${work.url}"]`).first()).toBeVisible();
    await expect(page.locator('.detail__media .project-art')).toBeVisible();
    await expect(page.locator('.detail__caption')).toContainText('프로젝트 아트워크');
    await expect(page.locator('.detail__media img[src*=".jpg"]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none');
    await page.reload();
    await page.locator('.detail__back').click();
    await expect(page).toHaveURL(/\/#works$/);
    await noHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}

test('detail page chapters drive the pinned artwork', async ({ page }) => {
  await page.goto('/works/lamplighter/');
  const story = page.locator('[data-story]');
  await expect(story).toHaveAttribute('data-step', '0');
  const headings = page.locator('.prose h2');
  for (const step of [1, 2]) {
    await headings.nth(step).evaluate(h => scrollTo({ top: h.getBoundingClientRect().top + scrollY - innerHeight * .4, behavior: 'instant' }));
    await expect(story).toHaveAttribute('data-step', String(step));
    await expect(page.locator(`[data-story-step="${step}"]`)).toHaveClass(/is-current/);
    await expect(headings.nth(step)).toHaveClass(/is-current/);
  }
  await expect(page.locator('.detail__media .project-art')).toBeInViewport();
  await expect(page.locator('.story__cta a')).toHaveAttribute('href', 'https://lamp.beeplab.workers.dev/');
  await noHorizontalScroll(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('scroll snapping is disabled and all works remain readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none');
    await expect(page.locator('.hero__particles')).toHaveCount(0);
    await expect(page.locator('#hero-title')).toHaveCSS('opacity', '1');
    await page.locator('[data-work="lamplighter"]').scrollIntoViewIfNeeded();
    await expect(page.locator('.veil')).toHaveCount(0);
    await expect(page.locator('#work-lamplighter')).toBeVisible();
    await noHorizontalScroll(page);
  });
  test('Totillu rests by default', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', baseURL });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('[data-companion]')).toHaveAttribute('data-state', 'paused');
    await context.close();
  });
});

test('the site works without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('.hero__cta').click();
  await expect(page).toHaveURL(/\/#works$/);
  await expect(page.locator('[data-work="totillu"]')).toHaveCSS('opacity', '1');
  await expect(page.locator('#hero-title')).toHaveCSS('opacity', '1');
  await page.locator('#works a[href="/works/totillu/"]').click();
  await expect(page.locator('h1')).toHaveText('Totillu');
  await context.close();
});

test('removed notes and unknown routes show the 404 page', async ({ page }) => {
  for (const route of ['/no-such-page/', '/notes/2026-10-12-one-light/']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('페이지를 찾을 수');
  }
});
