import { expect, test } from '@playwright/test';

const email = process.env.ADMIN_EMAIL ?? '';
const password = process.env.ADMIN_PASSWORD ?? '';

async function signIn(page: import('@playwright/test').Page, withPassword: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(withPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('administrator signs in, sees the account, and signs out', async ({ page }) => {
  await signIn(page, password);

  await expect(page.getByRole('heading', { name: 'Welcome to StockFlow' })).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
});

test('invalid credentials stay on the login page with a generic error', async ({ page }) => {
  await signIn(page, 'definitely-the-wrong-password');

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to StockFlow' })).toBeVisible();
});
