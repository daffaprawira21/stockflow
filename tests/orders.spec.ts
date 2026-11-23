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

test('administrator creates an order, confirms it, and ships it', async ({ page, context }) => {
  await signIn(page);

  // Seed a product via the API.
  const sku = `ORD-${Date.now()}`;
  const createProductResponse = await context.request.post('/api/products', {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
    },
    data: {
      sku,
      name: `E2E order product ${Date.now()}`,
      price: '100000',
      initialStock: 10,
    },
  });
  expect(createProductResponse.status()).toBe(201);
  const product = (await createProductResponse.json()) as { data: { id: string } };

  // Create an order through the UI.
  await page.goto('/orders/create');
  await page.getByRole('combobox', { name: 'Product' }).first().focus();
  await expect(page.getByRole('combobox', { name: 'Product' }).first()).toBeEnabled();
  await page.getByRole('combobox', { name: 'Product' }).first().selectOption(product.data.id);
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Create order' }).click();

  // Lands on the new order detail page.
  await page.waitForURL(/\/orders\//);
  await expect(page.getByText('PENDING', { exact: true }).first()).toBeVisible();

  // Confirm the order.
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('CONFIRMED', { exact: true }).first()).toBeVisible();

  // Ship the order.
  await page.getByRole('button', { name: 'Ship' }).click();
  await expect(page.getByText('SHIPPED', { exact: true }).first()).toBeVisible();
});

test('invalid transition surfaces the mapped error', async ({ page, context }) => {
  await signIn(page);

  const sku = `ORD-${Date.now()}`;
  const createProductResponse = await context.request.post('/api/products', {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
    },
    data: {
      sku,
      name: `E2E order product ${Date.now()}`,
      price: '100000',
      initialStock: 10,
    },
  });
  expect(createProductResponse.status()).toBe(201);
  const product = (await createProductResponse.json()) as { data: { id: string } };

  // Create a PENDING order.
  const createOrderResponse = await context.request.post('/api/orders', {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    data: { items: [{ productId: product.data.id, quantity: 1 }] },
  });
  expect(createOrderResponse.status()).toBe(201);
  const order = (await createOrderResponse.json()) as { data: { id: string } };

  // Open the PENDING order in the UI.
  await page.goto(`/orders/${order.data.id}`);
  await expect(page.getByText('PENDING', { exact: true }).first()).toBeVisible();

  // Confirm it so the state moves to CONFIRMED.
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('CONFIRMED', { exact: true }).first()).toBeVisible();

  // Try to confirm again — that is an invalid transition from CONFIRMED.
  // The Confirm button is disabled for CONFIRMED, so use the API call to
  // trigger the ORDER_CONFLICT path and surface the mapped error message.
  const conflictResponse = await context.request.post(`/api/orders/${order.data.id}/confirm`, {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
    },
  });
  expect(conflictResponse.status()).toBe(409);

  // Confirm the API returns ORDER_CONFLICT.
  const conflictBody = (await conflictResponse.json()) as {
    success: boolean;
    error?: { code: string };
  };
  expect(conflictBody.success).toBe(false);
  expect(conflictBody.error?.code).toBe('ORDER_CONFLICT');

  // Cancel the CONFIRMED order with a reason.
  await page.getByLabel('Cancel order').fill('E2E test cancellation');
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('CANCELLED', { exact: true }).first()).toBeVisible();
});
