import { expect, test, type APIResponse } from '@playwright/test';

const sessionCookieName = process.env.SESSION_COOKIE_NAME ?? 'stockflow_session';

async function expectPublicRobots(response: APIResponse) {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');

  const body = await response.text();

  expect(body).not.toMatch(/<!doctype html>/i);
  expect(body.trim().split(/\r?\n/)).toEqual(['User-Agent: *', 'Allow: /']);
}

test('crawler reads robots directives without a session', async ({ request }) => {
  const response = await request.get('/robots.txt', { maxRedirects: 0 });

  await expectPublicRobots(response);
});

test('browser receives a favicon without a session', async ({ request }) => {
  const response = await request.get('/favicon.ico', { maxRedirects: 0 });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);
  expect((await response.body()).length).toBeGreaterThan(0);
});

test('login page advertises the favicon in the document head', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('link[rel~="icon"]')).toHaveAttribute('href', /\/favicon\.ico/);
});

test('robots stays public with an arbitrary session cookie', async ({ request }) => {
  const response = await request.get('/robots.txt', {
    maxRedirects: 0,
    headers: { Cookie: `${sessionCookieName}=not-a-real-session` },
  });

  await expectPublicRobots(response);
});

test('only the exact robots path bypasses page authentication', async ({ request }) => {
  const response = await request.get('/robots.txt-extra', { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(response.headers()['location']).toContain('/login');
});
