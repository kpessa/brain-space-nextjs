import { test, expect } from './fixtures/auth.fixture'

/**
 * Example tests using real Google account authentication
 * 
 * Prerequisites:
 * 1. Run: pnpm exec ts-node e2e/setup-real-auth.ts
 * 2. Complete Google sign-in with your account
 * 
 * These tests will use your real authenticated session
 */

test.describe('Real User Tests', () => {
  // Skip these tests if not explicitly running real user tests
  test.skip(process.env.PLAYWRIGHT_AUTH_MODE !== 'real', 'Real user tests - set PLAYWRIGHT_AUTH_MODE=real to run')
  
  test('should access journal with real account', async ({ realUserPage }) => {
    // Navigate to journal
    await realUserPage.goto('/journal')
    
    // Should not be redirected to login
    await expect(realUserPage).not.toHaveURL(/.*login.*/)
    
    // Should see journal page elements
    await expect(realUserPage.locator('h1:has-text("Quest Journal")')).toBeVisible()
    
    // Check for user-specific content
    const userEmail = process.env.REAL_USER_EMAIL || 'kpessa@gmail.com'
    console.log(`Testing with real user: ${userEmail}`)
  })
  
  test('should see journal entries with summaries', async ({ realUserPage }) => {
    await realUserPage.goto('/journal')
    
    // Look for journal entries with our new summary features
    const entries = realUserPage.locator('[data-testid="journal-entry"]')
    const entryCount = await entries.count()
    
    if (entryCount > 0) {
      // Check first entry has summary elements
      const firstEntry = entries.first()
      
      // Should have date
      await expect(firstEntry.locator('[data-testid="journal-entry-date"]')).toBeVisible()
      
      // Should have summary
      await expect(firstEntry.locator('[data-testid="journal-entry-summary"]')).toBeVisible()
      
      // Should have tags (if available)
      const tags = firstEntry.locator('[data-testid="journal-entry-tags"]')
      if (await tags.count() > 0) {
        await expect(tags).toBeVisible()
      }
    } else {
      console.log('No journal entries found for real user')
    }
  })
  
  test('should open journal entry modal', async ({ realUserPage }) => {
    await realUserPage.goto('/journal')
    
    const entries = realUserPage.locator('[data-testid="journal-entry"]')
    const entryCount = await entries.count()
    
    if (entryCount > 0) {
      // Click first entry
      await entries.first().click()
      
      // Should open modal
      const modal = realUserPage.locator('[data-testid="journal-entry-modal"]')
      await expect(modal).toBeVisible({ timeout: 5000 })
      
      // Should show full content
      const fullContent = modal.locator('[data-testid="journal-entry-full-content"]')
      await expect(fullContent).toBeVisible()
    }
  })
  
  test('should navigate to other authenticated pages', async ({ realUserPage }) => {
    // Test navigation to different routes
    const routes = [
      { path: '/matrix', title: 'Knowledge Matrix' },
      { path: '/nodes', title: 'Nodes' },
      { path: '/braindump', title: 'Brain Dump' },
    ]
    
    for (const route of routes) {
      await realUserPage.goto(route.path)
      
      // Should not be redirected to login
      await expect(realUserPage).not.toHaveURL(/.*login.*/)
      
      // Should see page content
      await expect(realUserPage.locator('h1, h2').first()).toBeVisible()
      
      console.log(`✅ Successfully accessed ${route.path}`)
    }
  })
})

/**
 * Test specifically for Playwright MCP browser control with real user
 */
test.describe('Real User MCP Tests', () => {
  test.skip(process.env.PLAYWRIGHT_AUTH_MODE !== 'real', 'Real user tests')
  
  test('MCP browser control should work with real authentication', async ({ realUserPage }) => {
    // This test verifies that the MCP browser control
    // can use the real user authentication state
    
    await realUserPage.goto('/journal')
    
    // Take a screenshot for verification
    await realUserPage.screenshot({ 
      path: 'test-results/real-user-journal.png',
      fullPage: true 
    })
    
    console.log('Screenshot saved to test-results/real-user-journal.png')
    
    // Verify we can interact with authenticated content
    const newEntryButton = realUserPage.locator('button:has-text("New Entry")')
    if (await newEntryButton.count() > 0) {
      await expect(newEntryButton).toBeEnabled()
      console.log('✅ New Entry button is accessible')
    }
  })
})