import { expect, test } from '@playwright/test';

const email = process.env.ADMIN_EMAIL ?? '';
const password = process.env.ADMIN_PASSWORD ?? '';
const sessionCookieName = process.env.SESSION_COOKIE_NAME ?? 'stockflow_session';

async function signIn(page: import('@playwright/test').Page, withPassword: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(withPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('administrator signs in, sees the account, and signs out', async ({ page, context }) => {
  await signIn(page, password);

  // Home lives under the (admin) group; the shell renders a sidebar with the
  // user email in its footer and a "Sign out" button.
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.getByText('StockFlow')).toBeVisible();

  // The session cookie is present after sign-in.
  const beforeCookies = await context.cookies();
  const sessionBefore = beforeCookies.find((cookie) => cookie.name === sessionCookieName);
  expect(sessionBefore).toBeDefined();
  expect(sessionBefore?.value).toBeTruthy();

  // Sign out via the API. The logout response clears the session cookie
  // (Max-Age=0), so the browser context no longer carries a valid session.
  const response = await context.request.post('/api/auth/logout', {
    headers: {
      // The origin check requires an Origin header for state-changing requests.
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
    },
  });
  expect(response.status()).toBe(200);

  // After logout, a fresh request to home (without the session cookie) is
  // redirected to /login by the proxy.
  const homeResponse = await context.request.get('/', { maxRedirects: 0 });
  expect(homeResponse.status()).toBe(307);
  expect(homeResponse.headers()['location']).toContain('/login');

  // The session cookie in the context is now expired/cleared.
  const afterCookies = await context.cookies();
  const sessionAfter = afterCookies.find((cookie) => cookie.name === sessionCookieName);
  if (sessionAfter) {
    // Max-Age=0 means the cookie is immediately expired.
    expect(sessionAfter.expires <= 0 || sessionAfter.expires === -1).toBe(true);
  }
});

test('invalid credentials stay on the login page with a generic error', async ({ page }) => {
  await signIn(page, 'definitely-the-wrong-password');

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to StockFlow' })).toBeVisible();
});
