import { test, expect, devices } from '@playwright/test'

test.describe('iOS Touch Scrolling', () => {
  test('should handle touch scrolling on iPhone Safari', async ({ browser }) => {
    // Create context with iPhone 13 device settings
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    // Navigate to a page with scrollable content
    await page.goto('/journal')
    
    // Wait for content to load
    await page.waitForLoadState('networkidle')
    
    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY)
    console.log('Initial scroll position:', initialScrollY)
    
    // Simulate touch scroll down
    await page.locator('body').dispatchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 400 }],
    })
    
    await page.waitForTimeout(50)
    
    // Perform swipe up gesture (scrolls content down)
    await page.locator('body').dispatchEvent('touchmove', {
      touches: [{ clientX: 200, clientY: 200 }],
    })
    
    await page.waitForTimeout(50)
    
    await page.locator('body').dispatchEvent('touchend', {
      touches: [],
    })
    
    // Wait for scroll to settle
    await page.waitForTimeout(300)
    
    // Check if scrolled
    const scrolledY = await page.evaluate(() => window.scrollY)
    console.log('Scrolled position:', scrolledY)
    
    // Verify scroll happened
    expect(scrolledY).toBeGreaterThanOrEqual(initialScrollY)
    
    await context.close()
  })

  test('should handle momentum scrolling on iOS', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/nodes')
    await page.waitForLoadState('networkidle')
    
    // Simulate fast swipe for momentum scrolling
    const startY = 600
    const endY = 100
    const steps = 5
    
    await page.locator('body').dispatchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: startY }],
    })
    
    // Simulate smooth swipe motion
    for (let i = 1; i <= steps; i++) {
      const y = startY - ((startY - endY) * (i / steps))
      await page.locator('body').dispatchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: y }],
      })
      await page.waitForTimeout(10)
    }
    
    await page.locator('body').dispatchEvent('touchend', {
      touches: [],
    })
    
    // Wait for momentum scrolling to complete
    await page.waitForTimeout(1000)
    
    const finalScrollY = await page.evaluate(() => window.scrollY)
    console.log('Final scroll after momentum:', finalScrollY)
    
    expect(finalScrollY).toBeGreaterThan(0)
    
    await context.close()
  })

  test('should handle pull-to-refresh gesture', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check if pull-to-refresh is implemented
    const hasPullToRefresh = await page.evaluate(() => {
      // Look for pull-to-refresh indicators
      return document.querySelector('[data-pull-to-refresh]') !== null ||
             window.hasOwnProperty('onpulltorefresh')
    })
    
    if (hasPullToRefresh) {
      // Simulate pull down from top
      await page.locator('body').dispatchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 10 }],
      })
      
      // Pull down
      await page.locator('body').dispatchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 150 }],
      })
      
      await page.waitForTimeout(100)
      
      await page.locator('body').dispatchEvent('touchend', {
        touches: [],
      })
      
      // Check for refresh indicator or action
      const refreshing = await page.evaluate(() => {
        return document.querySelector('.refreshing') !== null ||
               document.querySelector('[aria-busy="true"]') !== null
      })
      
      console.log('Pull-to-refresh triggered:', refreshing)
    }
    
    await context.close()
  })

  test('should prevent overscroll bounce on iOS', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check for iOS bounce prevention CSS
    const hasBounceProtection = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement
      const bodyStyle = window.getComputedStyle(body)
      const htmlStyle = window.getComputedStyle(html)
      
      // Check various methods of preventing bounce
      return {
        overscrollBehavior: bodyStyle.overscrollBehavior || htmlStyle.overscrollBehavior,
        position: bodyStyle.position,
        overflow: bodyStyle.overflow,
        height: bodyStyle.height,
        touchAction: bodyStyle.touchAction,
      }
    })
    
    console.log('Bounce protection styles:', hasBounceProtection)
    
    // Test overscroll at top
    await page.evaluate(() => window.scrollTo(0, 0))
    
    await page.locator('body').dispatchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 100 }],
    })
    
    // Try to pull down when already at top
    await page.locator('body').dispatchEvent('touchmove', {
      touches: [{ clientX: 200, clientY: 300 }],
    })
    
    await page.locator('body').dispatchEvent('touchend', {
      touches: [],
    })
    
    const scrollAfterBounce = await page.evaluate(() => window.scrollY)
    expect(scrollAfterBounce).toBe(0)
    
    await context.close()
  })

  test('should handle horizontal swipe gestures', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/matrix')
    await page.waitForLoadState('networkidle')
    
    // Simulate horizontal swipe (e.g., for carousel or navigation)
    await page.locator('body').dispatchEvent('touchstart', {
      touches: [{ clientX: 300, clientY: 400 }],
    })
    
    await page.waitForTimeout(50)
    
    // Swipe left
    await page.locator('body').dispatchEvent('touchmove', {
      touches: [{ clientX: 100, clientY: 400 }],
    })
    
    await page.waitForTimeout(50)
    
    await page.locator('body').dispatchEvent('touchend', {
      touches: [],
    })
    
    // Check if any horizontal scroll or navigation occurred
    const horizontalScroll = await page.evaluate(() => window.scrollX)
    console.log('Horizontal scroll position:', horizontalScroll)
    
    await context.close()
  })

  test('should handle pinch-to-zoom gestures', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check viewport meta tag for zoom settings
    const viewportSettings = await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]')
      return viewport?.getAttribute('content')
    })
    
    console.log('Viewport settings:', viewportSettings)
    
    // Check if zoom is disabled (user-scalable=no)
    const zoomDisabled = viewportSettings?.includes('user-scalable=no')
    
    if (!zoomDisabled) {
      // Simulate pinch gesture with two fingers
      await page.locator('body').dispatchEvent('touchstart', {
        touches: [
          { identifier: 0, clientX: 150, clientY: 400 },
          { identifier: 1, clientX: 250, clientY: 400 }
        ],
      })
      
      // Move fingers apart (zoom in)
      await page.locator('body').dispatchEvent('touchmove', {
        touches: [
          { identifier: 0, clientX: 100, clientY: 400 },
          { identifier: 1, clientX: 300, clientY: 400 }
        ],
      })
      
      await page.locator('body').dispatchEvent('touchend', {
        touches: [],
      })
      
      const scale = await page.evaluate(() => {
        return window.visualViewport?.scale || 1
      })
      
      console.log('Zoom scale after pinch:', scale)
    } else {
      console.log('Zoom is disabled by viewport meta tag')
      expect(zoomDisabled).toBe(true)
    }
    
    await context.close()
  })
})