import { test, expect, devices } from '@playwright/test'

// Configure to use your saved authentication
test.use({
  storageState: 'e2e/storage-states/realUser.json'
})

test.describe('Real User - Mobile Safari (WebKit)', () => {
  test('Access Journal on iPhone 13', async ({ browser }) => {
    // This will use WebKit (Safari's engine) when run with --project="Mobile Safari"
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()

    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    
    // Should NOT redirect to login
    const url = page.url()
    expect(url).not.toContain('/login')

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/webkit-iphone-journal.png',
      fullPage: true 
    })
    
    await context.close()
  })

  test('Navigate all pages on Mobile Safari', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()
    
    const routes = [
      { path: '/journal', name: 'Journal' },
      { path: '/nodes', name: 'Nodes' },
      { path: '/matrix', name: 'Matrix' },
      { path: '/braindump', name: 'Brain Dump' },
      { path: '/timebox', name: 'Timebox' }
    ]
    
    for (const route of routes) {

      await page.goto(route.path)
      await page.waitForLoadState('networkidle')
      
      // Verify authenticated
      expect(page.url()).not.toContain('/login')
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/webkit-iphone-${route.name.toLowerCase().replace(' ', '-')}.png` 
      })

    }
    
    await context.close()
  })

  test('Test scrolling on real content', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()

    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    
    // Check authentication
    expect(page.url()).not.toContain('/login')
    
    // Check if scrollable
    const isScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight
    })
    
    if (isScrollable) {

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 200))
      await page.waitForTimeout(500)
      
      const scrollY = await page.evaluate(() => window.pageYOffset)

      expect(scrollY).toBeGreaterThan(0)
    } else {
      console.log('ℹ️ Page not scrollable (not enough content)')
    }
    
    await context.close()
  })

  test('Test on iPad Safari', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro 11'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()

    await page.goto('/nodes')
    await page.waitForLoadState('networkidle')
    
    // Verify authenticated
    expect(page.url()).not.toContain('/login')
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/webkit-ipad-nodes.png',
      fullPage: true 
    })

    await context.close()
  })
})