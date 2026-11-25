import { expect, test } from '@playwright/test';

const TOGGLE = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /[Ss]witch to (light|dark) mode/ }).first();

// The theme toggle is a user preference. It must:
// 1. Switch the active theme and update <html data-theme>.
// 2. Persist the choice in localStorage so a fresh page load keeps it.
// 3. Be reachable from the admin shell and the login page.
//
// The toggle is a client component that lives on both the login page and the
// admin shell, so the switch/persist behavior is exercised on /login — no
// session required, immune to the full-suite DB/session state.

// Two toggles exist in the admin shell (mobile bar + sidebar footer); only
// the visible one is interactive. Drive the visible control's DOM click
// handler directly — the exact path a user's click takes (applyTheme +
// persist to localStorage) — so the test is not blocked by the dev overlay's
// pointer interception.
async function clickToggle(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.offsetParent !== null && /switch to/i.test(b.getAttribute('aria-label') ?? ''),
    );
    target?.click();
  });
}

test('theme toggle switches and persists the theme', async ({ page }) => {
  await page.goto('/login');

  // Clear any stored choice so the no-flash script falls back to the system,
  // then force a known dark starting point.
  await page.evaluate(() => {
    localStorage.removeItem('sf_theme');
    document.documentElement.dataset.theme = 'dark';
  });

  await expect(TOGGLE(page)).toBeVisible();

  // Dark -> light: the attribute flips and the choice is persisted.
  await clickToggle(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  // The persistence write is async inside the React handler; poll for it.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sf_theme')), {
      timeout: 5000,
    })
    .toEqual('light');

  // Light -> dark: the attribute and the persisted value both follow.
  await clickToggle(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sf_theme')), {
      timeout: 5000,
    })
    .toEqual('dark');
});

test('a stored light choice survives a fresh page load', async ({ page }) => {
  // Pre-seed the operator's choice in a fresh context, then load the login
  // page. The no-flash script in the root layout applies it before paint.
  await page.addInitScript(() => {
    window.localStorage.setItem('sf_theme', 'light');
  });
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('login page exposes a theme toggle', async ({ page }) => {
  await page.goto('/login');
  await expect(TOGGLE(page)).toBeVisible();
});
