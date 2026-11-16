import { expect, test } from '@playwright/test';

test('visitor sees the StockFlow starting page', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'Welcome to StockFlow' })).toBeVisible();
});
