import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/timebox')
    await expect(page).toHaveURL(/.*login/)
  })

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login')
    
    // Check for login button
    const loginButton = page.getByRole('button', { name: /sign in with google/i })
    await expect(loginButton).toBeVisible()
  })

  test('shows error message for failed login', async ({ page }) => {
    await page.goto('/login')
    
    // Mock a failed login attempt
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Authentication failed' }),
      })
    })
    
    // Try to login
    const loginButton = page.getByRole('button', { name: /sign in with google/i })
    await loginButton.click()
    
    // Check for error message
    await expect(page.getByText(/authentication failed/i)).toBeVisible()
  })
})