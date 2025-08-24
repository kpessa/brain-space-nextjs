import { test, expect, devices, chromium, webkit } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// This test helps you authenticate and save your auth state
test.describe('Real User Authentication Setup', () => {
  test('Setup Google authentication for kpessa@gmail.com', async () => {
    // Use Chrome for better Google auth compatibility
    const browser = await chromium.launch({ 
      headless: false,
      channel: 'chrome'
    })
    
    const context = await browser.newContext()
    const page = await context.newPage()
    
    console.log('🔐 Please authenticate with your Google account')
    console.log('================================================')
    
    await page.goto('http://localhost:3000/login')
    
    // Click Continue with Google
    await page.click('button:has-text("Continue with Google")')
    
    console.log('\n⚠️  Complete Google sign-in in the browser window')
    console.log('   Email: kpessa@gmail.com')
    
    // Wait for redirect after successful auth (with longer timeout)
    try {
      await page.waitForURL((url) => !url.pathname.includes('login'), {
        timeout: 120000 // 2 minutes
      })
      
      console.log('✅ Authentication successful!')
      
      // Save auth state
      const storageDir = path.join(process.cwd(), 'e2e', 'storage-states')
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true })
      }
      
      const authFile = path.join(storageDir, 'realUser.json')
      await context.storageState({ path: authFile })
      
      console.log(`💾 Auth state saved to: ${authFile}`)
      console.log('\n✨ You can now run tests with your real account!')
      
    } catch (error) {
      console.error('❌ Authentication failed or timed out')
      throw error
    } finally {
      await browser.close()
    }
  })
})

// Tests that use the saved authentication
test.describe('Authenticated iOS Tests', () => {
  test.use({
    storageState: 'e2e/storage-states/realUser.json'
  })

  test('Access journal with real account on iPhone', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()
    
    await page.goto('/journal')
    
    // Should not redirect to login
    await expect(page).not.toHaveURL(/.*login.*/)
    
    // Should see journal content
    await expect(page.locator('text=/journal|entries|thoughts/i')).toBeVisible()
    
    // Take screenshot of authenticated mobile view
    await page.screenshot({ 
      path: 'test-results/iphone-journal-authenticated.png',
      fullPage: true 
    })
    
    await context.close()
  })

  test('Access nodes with real account on iPad', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro 11'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()
    
    await page.goto('/nodes')
    
    // Should not redirect to login
    await expect(page).not.toHaveURL(/.*login.*/)
    
    // Should see nodes content
    await expect(page.locator('text=/nodes|brain|thoughts/i')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/ipad-nodes-authenticated.png',
      fullPage: true 
    })
    
    await context.close()
  })

  test('Test scrolling in journal with real data', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()
    
    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    
    // Check if page has scrollable content
    const isScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight
    })
    
    if (isScrollable) {
      // Perform scroll
      await page.mouse.move(195, 400)
      await page.mouse.down()
      await page.mouse.move(195, 100, { steps: 10 })
      await page.mouse.up()
      
      await page.waitForTimeout(500)
      
      const scrollY = await page.evaluate(() => window.pageYOffset)
      console.log('Scrolled to:', scrollY)
      expect(scrollY).toBeGreaterThan(0)
    } else {
      console.log('Page not scrollable - not enough content')
    }
    
    await context.close()
  })
})

// Mobile Safari specific tests with real auth
test.describe('Mobile Safari with Real Auth', () => {
  test.use({
    storageState: 'e2e/storage-states/realUser.json'
  })

  test('Full app navigation on Mobile Safari', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()
    
    // Test navigation through main app sections
    const routes = ['/journal', '/nodes', '/matrix', '/braindump', '/timebox']
    
    for (const route of routes) {
      console.log(`Testing ${route}...`)
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      
      // Should not redirect to login
      await expect(page).not.toHaveURL(/.*login.*/)
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/mobile-safari-${route.slice(1)}.png` 
      })
      
      console.log(`✅ ${route} accessible`)
    }
    
    await context.close()
  })
})