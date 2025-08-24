import { test, expect } from './fixtures/auth.fixture'
import { TEST_USERS, setAuthCookie, clearAuth } from './helpers/auth'

/**
 * Example tests demonstrating authentication setup
 */

test.describe('Authenticated Tests Example', () => {
  test('should access protected routes with authenticatedPage', async ({ authenticatedPage }) => {
    // This page is already authenticated with default user
    await authenticatedPage.goto('/matrix')
    
    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/.*login/)
    
    // Should be able to access the page
    const url = authenticatedPage.url()
    expect(url).toContain('/matrix')
  })
  
  test('should access admin routes with adminPage', async ({ adminPage }) => {
    // This page is authenticated as admin
    await adminPage.goto('/nodes')
    
    // Should not redirect to login
    await expect(adminPage).not.toHaveURL(/.*login/)
    
    // Should be able to access the page
    const url = adminPage.url()
    expect(url).toContain('/nodes')
  })
  
  test('should work with manual auth setup', async ({ page }) => {
    // Manually set auth cookie
    await setAuthCookie(page, TEST_USERS.default)
    
    // Navigate to protected route
    await page.goto('/braindump')
    
    // Should not redirect
    await expect(page).not.toHaveURL(/.*login/)
  })
  
  test('should handle unauthenticated access', async ({ page }) => {
    // Clear any existing auth
    await clearAuth(page)
    
    // Try to access protected route
    await page.goto('/timebox')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)
  })
})

test.describe('Different User Types', () => {
  test('should test with default user', async ({ page }) => {
    await setAuthCookie(page, TEST_USERS.default)
    await page.goto('/nodes')
    
    // Verify user context
    const cookies = await page.context().cookies()
    const authCookie = cookies.find(c => c.name === 'firebase-auth-token')
    expect(authCookie).toBeTruthy()
  })
  
  test('should test with admin user', async ({ page }) => {
    await setAuthCookie(page, TEST_USERS.admin)
    await page.goto('/nodes')
    
    // Admin should have access to everything
    await expect(page).not.toHaveURL(/.*login/)
  })
  
  test('should test with user without email', async ({ page }) => {
    await setAuthCookie(page, TEST_USERS.noEmail)
    await page.goto('/braindump')
    
    // Should still work even without email
    await expect(page).not.toHaveURL(/.*login/)
  })
})