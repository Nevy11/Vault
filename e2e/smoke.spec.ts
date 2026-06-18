import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Vault/);
});

test('login link exists', async ({ page }) => {
  await page.goto('/');
  const loginLink = page.getByRole('link', { name: /login/i });
  await expect(loginLink).toBeVisible();
});
