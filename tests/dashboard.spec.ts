import { expect, test } from '@playwright/test';

const email = process.env.ADMIN_EMAIL ?? '';
const password = process.env.ADMIN_PASSWORD ?? '';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('login lands on the dashboard with summary cards', async ({ page }) => {
  await signIn(page);

  // Authenticated admin lands on the dashboard.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Summary card labels are visible (use .first() to avoid matching the
  // sidebar "Products" / "Orders" nav links alongside the card labels).
  await expect(page.getByText('Products', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Active products', { exact: true })).toBeVisible();
  await expect(page.getByText('Inventory units', { exact: true })).toBeVisible();
  await expect(page.getByText('Orders', { exact: true }).first()).toBeVisible();
});

test('unauthenticated admin page visit redirects to login', async ({ page }) => {
  await page.goto('/products');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to StockFlow' })).toBeVisible();
});

test('unauthenticated inventory and orders pages redirect to login', async ({ page }) => {
  await page.goto('/inventory');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login$/);
});
