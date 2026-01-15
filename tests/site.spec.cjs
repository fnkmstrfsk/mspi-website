// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * MSPI Website Playwright Tests
 *
 * Tests all pages for:
 * - Page loads successfully (200)
 * - Critical elements are visible
 * - Navigation works
 * - Forms function correctly
 * - Mobile responsiveness
 */

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/MSPI/);
  });

  test('should display hero section', async ({ page }) => {
    const hero = page.locator('.hero, section').first();
    await expect(hero).toBeVisible();

    // Check for main heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    const nav = page.locator('nav, .nav').first();
    await expect(nav).toBeVisible();

    // Check nav links exist (use .first() since links appear in nav and footer)
    await expect(page.locator('nav a:has-text("Platform"), .nav a:has-text("Platform")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("Slivers"), .nav a:has-text("Slivers")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("Manifesto"), .nav a:has-text("Manifesto")').first()).toBeVisible();
  });

  test('should have working CTA buttons', async ({ page }) => {
    const ctaButton = page.locator('a:has-text("Request Demo")').first();
    await expect(ctaButton).toBeVisible();

    // Check it links to contact page
    const href = await ctaButton.getAttribute('href');
    expect(href).toContain('contact');
  });

  test('should display footer', async ({ page }) => {
    const footer = page.locator('footer, .footer');
    await expect(footer).toBeVisible();
  });

  test('should not show raw i18n keys', async ({ page }) => {
    // Wait for i18n to load
    await page.waitForTimeout(1000);

    // Check that no raw i18n keys are visible
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('nav.platform');
    expect(bodyText).not.toContain('hero.title');
    expect(bodyText).not.toContain('footer.company');
    expect(bodyText).not.toContain('[object Object]');
  });
});

test.describe('Platform Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/platform');
  });

  test('should load successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Platform|MSPI/);
  });

  test('should display main content', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    const nav = page.locator('nav, .nav');
    await expect(nav).toBeVisible();
  });

  test('should not show raw i18n keys', async ({ page }) => {
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('platform.title');
    expect(bodyText).not.toContain('[object Object]');
  });
});

test.describe('Slivers Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/slivers');
  });

  test('should load successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Slivers|MSPI/);
  });

  test('should display main content', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should not show raw i18n keys', async ({ page }) => {
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('slivers.title');
    expect(bodyText).not.toContain('[object Object]');
  });
});

test.describe('Contact Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('should load successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Contact|Demo|MSPI/);
  });

  test('should display contact form', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('should have required form fields', async ({ page }) => {
    // Check for common form fields
    const nameField = page.locator('input[name*="name"], input[id*="name"], input[placeholder*="name" i]');
    const emailField = page.locator('input[type="email"], input[name*="email"], input[id*="email"]');

    await expect(nameField.first()).toBeVisible();
    await expect(emailField.first()).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], .btn:has-text("Submit"), .btn:has-text("Request")');
    await expect(submitBtn.first()).toBeVisible();
  });
});

test.describe('Manifesto Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manifesto');
  });

  test('should load successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Manifesto|MSPI/);
  });

  test('should display main content', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });
});

test.describe('Legal Pages', () => {
  test('privacy page should load', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveTitle(/Privacy|MSPI/);

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/Privacy/i);
  });

  test('terms page should load', async ({ page }) => {
    await page.goto('/terms');
    await expect(page).toHaveTitle(/Terms|MSPI/);

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/Terms/i);
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Navigate to Platform
    await page.locator('nav a:has-text("Platform"), .nav a:has-text("Platform")').first().click();
    await expect(page).toHaveURL(/platform/);

    // Navigate to Slivers
    await page.locator('nav a:has-text("Slivers"), .nav a:has-text("Slivers")').first().click();
    await expect(page).toHaveURL(/slivers/);

    // Navigate to Manifesto
    await page.locator('nav a:has-text("Manifesto"), .nav a:has-text("Manifesto")').first().click();
    await expect(page).toHaveURL(/manifesto/);
  });

  test('logo should link to home', async ({ page }) => {
    await page.goto('/platform');

    // Click logo/brand
    await page.locator('a:has-text("MSPI")').first().click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('homepage should display on mobile', async ({ page }) => {
    await page.goto('/');

    // Main elements should be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav, .nav')).toBeVisible();
  });

  test('navigation should work on mobile', async ({ page }) => {
    await page.goto('/');

    // Check if there's a mobile menu toggle
    const menuToggle = page.locator('.nav-toggle, .menu-toggle, button[aria-label*="menu" i], button[aria-label*="navigation" i]');

    if (await menuToggle.count() > 0) {
      // Force click in case other elements overlap
      await menuToggle.first().click({ force: true });
      // Give menu time to animate open
      await page.waitForTimeout(500);
    }

    // Nav should be visible (either always visible or after menu open)
    await expect(page.locator('nav, .nav').first()).toBeVisible();
  });

  test('contact form should work on mobile', async ({ page }) => {
    await page.goto('/contact');

    const form = page.locator('form');
    await expect(form).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('homepage should load within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('pages should not have console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out expected errors (like third-party script errors)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('third-party')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Links', () => {
  test('should not have broken internal links on homepage', async ({ page }) => {
    await page.goto('/');

    // Get all internal links
    const links = await page.locator('a[href^="/"]').all();

    for (const link of links.slice(0, 10)) { // Test first 10 links
      const href = await link.getAttribute('href');
      if (href && href !== '#') {
        const response = await page.request.get(href);
        expect(response.status(), `Link ${href} should not be broken`).toBe(200);
      }
    }
  });
});

test.describe('Visual Regression', () => {
  test('homepage should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for animations

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1
    });
  });

  test('platform page should match snapshot', async ({ page }) => {
    await page.goto('/platform');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('platform.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1
    });
  });
});
