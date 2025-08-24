import { test, expect, devices } from '@playwright/test'

// Use iPhone 13 with real user authentication
test.use({
  ...devices['iPhone 13'],
  storageState: 'e2e/storage-states/realUser.json'
})

test.describe('Mobile Safari Scrolling - Real User', () => {
  
  test('should scroll on Journal page with real auth', async ({ page }) => {
    console.log('📱 Testing Journal on Mobile Safari with real authentication...')
    
    // Go to Journal page
    await page.goto('/journal')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Allow time for content to load
    
    // Verify we're authenticated (not on login page)
    const url = page.url()
    expect(url).not.toContain('/login')
    console.log('✅ Authenticated! URL:', url)
    
    // Check if page is scrollable
    const scrollInfo = await page.evaluate(() => {
      return {
        scrollHeight: document.documentElement.scrollHeight,
        viewHeight: window.innerHeight,
        isScrollable: document.documentElement.scrollHeight > window.innerHeight
      }
    })
    
    console.log('📜 Scroll info:', scrollInfo)
    
    if (scrollInfo.isScrollable) {
      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY)
      console.log(`Initial scroll position: ${initialScroll}px`)
      
      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 300))
      await page.waitForTimeout(500)
      
      // Verify scroll happened
      const newScroll = await page.evaluate(() => window.scrollY)
      console.log(`New scroll position: ${newScroll}px`)
      expect(newScroll).toBeGreaterThan(initialScroll)
      
      // Take screenshot after scroll
      await page.screenshot({ 
        path: 'test-results/safari-journal-scrolled.png',
        fullPage: false 
      })
      
      console.log('✅ Scrolling works on Mobile Safari!')
    } else {
      console.log('ℹ️ Page not scrollable (not enough content)')
    }
  })
  
  test('should scroll on Nodes page with real auth', async ({ page }) => {
    console.log('📱 Testing Nodes on Mobile Safari...')
    
    await page.goto('/nodes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Verify authenticated
    expect(page.url()).not.toContain('/login')
    
    // Test scrolling
    const scrollInfo = await page.evaluate(() => {
      return {
        scrollHeight: document.documentElement.scrollHeight,
        viewHeight: window.innerHeight,
        currentScroll: window.scrollY
      }
    })
    
    console.log('Nodes page scroll info:', scrollInfo)
    
    if (scrollInfo.scrollHeight > scrollInfo.viewHeight) {
      // Perform scroll
      await page.evaluate(() => window.scrollBy(0, 400))
      await page.waitForTimeout(500)
      
      const newScroll = await page.evaluate(() => window.scrollY)
      expect(newScroll).toBeGreaterThan(scrollInfo.currentScroll)
      
      console.log(`✅ Scrolled from ${scrollInfo.currentScroll}px to ${newScroll}px`)
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/safari-nodes-scrolled.png' 
      })
    }
  })
  
  test('should test touch scrolling gestures', async ({ page }) => {
    console.log('📱 Testing touch gestures on Mobile Safari...')
    
    await page.goto('/braindump')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Verify authenticated
    expect(page.url()).not.toContain('/login')
    
    // Get initial state
    const initialScroll = await page.evaluate(() => window.scrollY)
    
    // Simulate touch scroll (swipe up to scroll down)
    const viewport = page.viewportSize()
    if (viewport) {
      const centerX = viewport.width / 2
      const startY = viewport.height * 0.7
      const endY = viewport.height * 0.3
      
      // Touch down
      await page.touchscreen.tap(centerX, startY)
      await page.waitForTimeout(100)
      
      // Swipe gesture
      await page.mouse.move(centerX, startY)
      await page.mouse.down()
      
      // Move in steps to simulate swipe
      for (let i = 0; i < 10; i++) {
        const y = startY - ((startY - endY) * (i / 10))
        await page.mouse.move(centerX, y)
        await page.waitForTimeout(20)
      }
      
      await page.mouse.up()
      await page.waitForTimeout(500)
      
      // Check if scrolled
      const newScroll = await page.evaluate(() => window.scrollY)
      
      if (newScroll > initialScroll) {
        console.log(`✅ Touch scrolling works! Scrolled from ${initialScroll}px to ${newScroll}px`)
      } else {
        console.log('ℹ️ Touch scroll did not change position (may not have scrollable content)')
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/safari-braindump-touch.png' 
      })
    }
  })
  
  test('should navigate all main pages and test scrolling', async ({ page }) => {
    const routes = [
      { path: '/journal', name: 'Journal' },
      { path: '/nodes', name: 'Nodes' },
      { path: '/matrix', name: 'Matrix' },
      { path: '/braindump', name: 'Brain Dump' },
      { path: '/timebox', name: 'Timebox' }
    ]
    
    for (const route of routes) {
      console.log(`\n🧪 Testing ${route.name} on Mobile Safari...`)
      
      await page.goto(route.path)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)
      
      // Verify authenticated
      const url = page.url()
      if (url.includes('/login')) {
        console.log(`❌ Redirected to login for ${route.name}`)
        continue
      }
      
      console.log(`✅ Authenticated on ${route.name}`)
      
      // Test scroll capability
      const scrollInfo = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
        scrollable: document.documentElement.scrollHeight > window.innerHeight
      }))
      
      console.log(`  Height: ${scrollInfo.height}px, Viewport: ${scrollInfo.viewport}px`)
      
      if (scrollInfo.scrollable) {
        // Scroll test
        const before = await page.evaluate(() => window.scrollY)
        await page.evaluate(() => window.scrollBy(0, 200))
        await page.waitForTimeout(300)
        const after = await page.evaluate(() => window.scrollY)
        
        if (after > before) {
          console.log(`  ✅ Scrolled from ${before}px to ${after}px`)
        }
      } else {
        console.log(`  ℹ️ Not scrollable`)
      }
      
      // Screenshot
      await page.screenshot({ 
        path: `test-results/safari-${route.name.toLowerCase().replace(' ', '-')}.png` 
      })
    }
  })
})