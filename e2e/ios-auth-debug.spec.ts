import { test, expect, devices } from '@playwright/test'

// Use iPhone 13 with real user authentication
test.use({
  ...devices['iPhone 13'],
  storageState: 'e2e/storage-states/realUser.json'
})

test('Debug: Check authentication on iOS', async ({ page, context }) => {

  // Check cookies before navigation
  const cookies = await context.cookies()

  cookies.forEach(cookie => {
    console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}...`)
  })
  
  // Navigate to app
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000) // Give auth time to process
  
  // Check where we ended up
  const currentUrl = page.url()

  // Check localStorage and sessionStorage
  const localStorage = await page.evaluate(() => {
    return Object.keys(window.localStorage || {})
  })

  // Check if Firebase auth is present
  const hasFirebaseAuth = await page.evaluate(() => {
    return typeof window !== 'undefined' && 
           window.localStorage && 
           Object.keys(window.localStorage).some(key => key.includes('firebase'))
  })

  // Try to navigate to journal

  await page.goto('/journal')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2000)
  
  const journalUrl = page.url()

  // Take screenshot
  await page.screenshot({ 
    path: 'test-results/ios-auth-debug.png',
    fullPage: false 
  })
  
  // Check page content
  const pageTitle = await page.title()

  const hasLoginForm = await page.locator('form').count() > 0

  if (journalUrl.includes('/login')) {

    // Check for any error messages
    const errorMessages = await page.locator('.error, .alert, [role="alert"]').allTextContents()
    if (errorMessages.length > 0) {

    }
  } else {

    // Check for user info
    const userInfo = await page.locator('[data-testid="user-info"], .user-name, .user-email').allTextContents()
    if (userInfo.length > 0) {

    }
  }
})