import { expect, test } from '@playwright/test';

const email = process.env.ADMIN_EMAIL ?? '';
const password = process.env.ADMIN_PASSWORD ?? '';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('administrator creates a product, edits it, deactivates it, and sees duplicate-SKU error', async ({
  page,
}) => {
  await signIn(page);

  const sku = `E2E-${Date.now()}`;
  const name = `E2E product ${Date.now()}`;

  // --- Create ---
  await page.goto('/products/create');
  await page.getByLabel('SKU').fill(sku);
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Price (IDR)').fill('150000');
  await page.getByLabel('Initial stock').fill('10');
  await page.getByRole('button', { name: 'Create product' }).click();

  // Lands on the products list and the new row is visible.
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText(sku)).toBeVisible();

  // --- Edit ---
  // Open the product detail by clicking the "View" link in the new row.
  await page.getByRole('link', { name: 'View' }).first().click();
  await page.waitForURL(/\/products\//);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Name').fill(`${name} (edited)`);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText(`${name} (edited)`)).toBeVisible();

  // --- Deactivate ---
  const confirmed = page.waitForEvent('dialog');
  page.getByRole('button', { name: 'Deactivate' }).click();
  const dialog = await confirmed;
  dialog.accept();

  await expect(page.getByText('Inactive', { exact: true })).toBeVisible();

  // --- Duplicate SKU error ---
  await page.goto('/products/create');
  await page.getByLabel('SKU').fill(sku);
  await page.getByLabel('Name').fill('Second product');
  await page.getByLabel('Price (IDR)').fill('1');
  await page.getByLabel('Initial stock').fill('0');
  await page.getByRole('button', { name: 'Create product' }).click();

  await expect(page.getByText('A product with this SKU already exists.')).toBeVisible();
});
