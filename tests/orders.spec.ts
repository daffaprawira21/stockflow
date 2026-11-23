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

  // Create two PENDING orders: one for the happy-path UI flow, one to cancel
  // from the UI so the confirm action fires (which is the only UI action that
  // can produce a mapped ORDER_CONFLICT / PRODUCT_INACTIVE / INSUFFICIENT_STOCK
  // error in the UI surface).
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

  // Deactivate the product so that confirming the PENDING order produces a
  // PRODUCT_INACTIVE error that the UI maps and displays.
  await context.request.patch(`/api/products/${product.data.id}/deactivate`, {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Referer: 'http://127.0.0.1:3000/',
    },
  });

  // Open the PENDING order in the UI.
  await page.goto(`/orders/${order.data.id}`);
  await expect(page.getByText('PENDING', { exact: true }).first()).toBeVisible();

  // Confirm — the product is inactive so the server rejects with PRODUCT_INACTIVE,
  // and the UI maps it to a user-visible error message.
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(
    page.getByText('One or more products is inactive and cannot be used for this operation.'),
  ).toBeVisible();

  // The order is still PENDING — the confirm failed.
  await expect(page.getByText('PENDING', { exact: true }).first()).toBeVisible();

  // Cancel the PENDING order with a reason to verify the cancel path works.
  await page.getByLabel('Cancel order').fill('E2E test cancellation');
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('CANCELLED', { exact: true }).first()).toBeVisible();
});
