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

test('administrator adjusts stock with a reason and sees the movement in history', async ({
  page,
  context,
}) => {
  await signIn(page);

  // Create a product via the API to get a known SKU and product ID.
  const sku = `INV-${Date.now()}`;
  const createResponse = await context.request.post('/api/products', {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
    },
    data: {
      sku,
      name: `E2E inventory ${Date.now()}`,
      price: '100000',
      initialStock: 5,
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as { data: { id: string; sku: string } };
  const productId = created.data.id;

  // Adjust stock in through the UI.
  await page.goto('/inventory/adjust?product=' + productId);
  // The product select is lazy-loaded on focus; trigger the load.
  await page.getByRole('combobox', { name: 'Product' }).focus();
  await expect(page.getByRole('combobox', { name: 'Product' })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Product' }).selectOption(productId);
  await page.getByLabel('Adjustment type').selectOption('ADJUSTMENT_IN');
  await page.getByLabel('Quantity').fill('3');
  await page.getByLabel('Reason').fill('E2E test adjustment');
  await page.getByRole('button', { name: 'Adjust stock' }).click();

  await expect(page).toHaveURL(/\/inventory$/);

  // The movement appears in the product's movement history.
  await page.goto(`/inventory/${productId}/movements`);
  // Use .last() to skip the filter combobox option and match the table cell.
  await expect(page.getByText('ADJUSTMENT_IN').last()).toBeVisible();
  await expect(page.getByText('+3', { exact: true })).toBeVisible();
  await expect(page.getByText('E2E test adjustment')).toBeVisible();
});

test('adjustment without a reason is rejected client-side', async ({ page, context }) => {
  await signIn(page);

  const sku = `INV-${Date.now()}`;
  const createResponse = await context.request.post('/api/products', {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
    },
    data: { sku, name: `E2E inventory ${Date.now()}`, price: '100000', initialStock: 5 },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as { data: { id: string } };

  await page.goto('/inventory/adjust?product=' + created.data.id);
  await page.getByRole('combobox', { name: 'Product' }).focus();
  await expect(page.getByRole('combobox', { name: 'Product' })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Product' }).selectOption(created.data.id);
  await page.getByLabel('Adjustment type').selectOption('ADJUSTMENT_IN');
  await page.getByLabel('Quantity').fill('1');
  // Leave reason empty.
  await page.getByRole('button', { name: 'Adjust stock' }).click();

  // The browser native validation blocks submission because of the `required`
  // attribute on the reason textarea; the custom `noValidate` attribute on
  // the form means the browser validation does not fire, so the submit
  // handler runs and shows the client-side validation error.
  await expect(page.getByText('Reason is required for manual adjustments.')).toBeVisible();
});
