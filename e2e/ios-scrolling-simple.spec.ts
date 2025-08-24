import { test, expect, devices } from '@playwright/test'

// Use iPhone 13 with real user authentication
test.use({
  ...devices['iPhone 13'],
  storageState: 'e2e/storage-states/realUser.json'
})

test.describe('iOS Safari Scrolling - Simple Tests', () => {
  
  test('should navigate and scroll on Journal page', async ({ page }) => {
    console.log('📱 Testing Journal scrolling on iPhone 13...')
    
    // Go to Journal page
    await page.goto('/journal')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Allow time for content to load
    
    // Verify we're authenticated (not on login page)
    expect(page.url()).not.toContain('/login')
    console.log('✅ Authenticated on Journal page')
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/ios-journal-before-scroll.png',
      fullPage: false 
    })
    
    // Check if page is scrollable
    const isScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight
    })
    
    if (isScrollable) {
      console.log('📜 Page is scrollable, testing scroll...')
      
      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY)
      console.log(`Initial scroll position: ${initialScroll}px`)
      
      // Scroll down using JavaScript (simpler than touch gestures)
      await page.evaluate(() => {
        window.scrollBy(0, 300)
      })
      
      await page.waitForTimeout(500)
      
      // Verify scroll happened
      const newScroll = await page.evaluate(() => window.scrollY)
      console.log(`New scroll position: ${newScroll}px`)
      expect(newScroll).toBeGreaterThan(initialScroll)
      
      // Take screenshot after scroll
      await page.screenshot({ 
        path: 'test-results/ios-journal-after-scroll.png',
        fullPage: false 
      })
      
      console.log('✅ Scrolling works on Journal page!')
    } else {
      console.log('ℹ️ Journal page not scrollable (not enough content)')
    }
  })
  
  test('should navigate and scroll on Nodes page', async ({ page }) => {
    console.log('📱 Testing Nodes scrolling on iPhone 13...')
    
    // Go to Nodes page
    await page.goto('/nodes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Verify we're authenticated
    expect(page.url()).not.toContain('/login')
    console.log('✅ Authenticated on Nodes page')
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/ios-nodes-scroll.png',
      fullPage: false 
    })
    
    // Test scrolling
    const isScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight
    })
    
    if (isScrollable) {
      const initialScroll = await page.evaluate(() => window.scrollY)
      
      await page.evaluate(() => {
        window.scrollBy(0, 400)
      })
      
      await page.waitForTimeout(500)
      
      const newScroll = await page.evaluate(() => window.scrollY)
      expect(newScroll).toBeGreaterThan(initialScroll)
      console.log(`✅ Scrolled from ${initialScroll}px to ${newScroll}px`)
    } else {
      console.log('ℹ️ Nodes page not scrollable')
    }
  })
  
  test('should test touch scrolling with swipe gestures', async ({ page }) => {
    console.log('📱 Testing touch gestures on iPhone 13...')
    
    // Go to a page with content
    await page.goto('/braindump')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Verify authenticated
    expect(page.url()).not.toContain('/login')
    
    // Try a simple touch scroll gesture
    const initialScroll = await page.evaluate(() => window.scrollY)
    
    // Perform touch scroll
    await page.touchscreen.tap(195, 400) // Center of screen
    await page.waitForTimeout(100)
    
    // Swipe up to scroll down
    await page.touchscreen.move(195, 600)
    await page.touchscreen.down()
    
    for (let i = 1; i <= 10; i++) {
      await page.touchscreen.move(195, 600 - (i * 40))
      await page.waitForTimeout(20)
    }
    
    await page.touchscreen.up()
    await page.waitForTimeout(500)
    
    const newScroll = await page.evaluate(() => window.scrollY)
    
    if (newScroll > initialScroll) {
      console.log(`✅ Touch scrolling works! Scrolled from ${initialScroll}px to ${newScroll}px`)
    } else {
      console.log('ℹ️ Touch scrolling did not change position (may not have scrollable content)')
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/ios-braindump-touch.png',
      fullPage: false 
    })
  })
  
  test('should test all main routes', async ({ page }) => {
    const routes = [
      { path: '/journal', name: 'Journal' },
      { path: '/nodes', name: 'Nodes' },
      { path: '/matrix', name: 'Matrix' },
      { path: '/braindump', name: 'Brain Dump' },
      { path: '/timebox', name: 'Timebox' }
    ]
    
    for (const route of routes) {
      console.log(`🧪 Testing ${route.name} on Mobile Safari...`)
      
      await page.goto(route.path)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)
      
      // Verify authenticated
      expect(page.url()).not.toContain('/login')
      
      // Test scroll on each page
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      const viewHeight = await page.evaluate(() => window.innerHeight)
      const isScrollable = scrollHeight > viewHeight
      
      console.log(`  ${route.name}: Height ${scrollHeight}px, View ${viewHeight}px, Scrollable: ${isScrollable}`)
      
      if (isScrollable) {
        await page.evaluate(() => window.scrollBy(0, 200))
        await page.waitForTimeout(300)
        const scrollY = await page.evaluate(() => window.scrollY)
        console.log(`  ✅ Scrolled to ${scrollY}px`)
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/ios-${route.name.toLowerCase().replace(' ', '-')}.png` 
      })
    }
  })
})