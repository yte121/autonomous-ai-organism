import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  // Navigate to the home page.
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/AI Organism System/);
});

test('has dashboard heading', async ({ page }) => {
  // Navigate to the home page.
  await page.goto('/');

  // Expect the main heading to be visible.
  await expect(page.getByRole('heading', { name: 'AI Organism Dashboard' })).toBeVisible();
});
