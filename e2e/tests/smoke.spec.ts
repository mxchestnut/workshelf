import { test, expect } from '@playwright/test';

/**
 * Basic smoke tests to ensure critical paths work
 */

test.describe('Home Page', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loaded
    await expect(page).toHaveTitle(/WorkShelf/i);
    
    // Check for key elements
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should have functional navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation links
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Check for login/signup buttons
    const hasAuthButtons = await page.locator('text=/login|sign up/i').count();
    expect(hasAuthButtons).toBeGreaterThan(0);
  });
});

test.describe('Authentication', () => {
  test('should redirect to Keycloak login', async ({ page }) => {
    await page.goto('/');
    
    // Click login button
    await page.click('text=/login/i');
    
    // Should redirect to Keycloak
    await page.waitForURL(/auth\.workshelf\.dev/);
    expect(page.url()).toContain('auth.workshelf.dev');
  });
});

test.describe('API Health', () => {
  test('backend health endpoint should respond', async ({ request }) => {
    const response = await request.get('https://api.workshelf.dev/health');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('backend should have CORS headers', async ({ request }) => {
    const response = await request.get('https://api.workshelf.dev/health', {
      headers: {
        'Origin': 'https://workshelf.dev'
      }
    });
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
  });
});

test.describe('Performance', () => {
  test('home page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });
});
