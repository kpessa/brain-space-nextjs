import { test as base, Page } from '@playwright/test'
import { 
  TEST_USERS, 
  TestUser, 
  setAuthCookie, 
  clearAuth,
  authenticatedGoto,
  mockAuthEndpoints,
  hasRealUserAuth,
  getRealUserStorageStatePath
} from '../helpers/auth'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Custom fixtures for authenticated tests
 */

type AuthFixtures = {
  authenticatedPage: Page
  adminPage: Page
  mockAuth: Page
  realUserPage: Page
}

/**
 * Extend base test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Authenticated page with default user
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Set auth cookie directly (don't rely on storage state yet)
    await setAuthCookie(context, TEST_USERS.default)
    
    await use(page)
    await context.close()
  },
  
  // Authenticated page with admin user
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Set admin auth cookie directly
    await setAuthCookie(context, TEST_USERS.admin)
    
    await use(page)
    await context.close()
  },
  
  // Page with mocked auth endpoints
  mockAuth: async ({ page }, use) => {
    await mockAuthEndpoints(page)
    await use(page)
  },
  
  // Page with real user authentication
  realUserPage: async ({ browser }, use) => {
    const storageStatePath = getRealUserStorageStatePath()
    
    // Check if real user auth state exists
    if (!fs.existsSync(storageStatePath)) {
      throw new Error(
        '❌ Real user authentication not set up.\n' +
        'Run: pnpm exec ts-node e2e/setup-real-auth.ts'
      )
    }
    
    // Create context with saved storage state
    const context = await browser.newContext({
      storageState: storageStatePath
    })
    
    const page = await context.newPage()
    
    // Verify authentication is working
    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    
    // Check if we're still authenticated
    const url = page.url()
    if (url.includes('/login')) {

    }
    
    await use(page)
    await context.close()
  },
})

/**
 * Export expect from base
 */
export { expect } from '@playwright/test'

/**
 * Helper to create authenticated test with specific user
 */
export function authenticatedTest(user: TestUser = TEST_USERS.default) {
  return test.extend({
    page: async ({ browser }, use) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      // Set auth for specific user
      await setAuthCookie(page, user)
      
      await use(page)
      await context.close()
    },
  })
}

/**
 * Test describe block for authenticated tests
 */
export const authenticatedDescribe = test.describe

/**
 * Skip authentication for specific tests
 */
export const unauthenticatedTest = base