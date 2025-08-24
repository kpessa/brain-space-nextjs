import { test, expect, devices } from '@playwright/test'

test.describe('iOS Safari Touch Scrolling - Focused Tests', () => {
  test('should scroll with touch gestures on login page', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    // Go to login page
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Add some scrollable content for testing
    await page.evaluate(() => {
      // Make the page scrollable by adding content
      const div = document.createElement('div')
      div.style.height = '2000px'
      div.innerHTML = '<p>Scrollable content for testing</p>'.repeat(50)
      document.body.appendChild(div)
    })
    
    // Get initial position
    const initialY = await page.evaluate(() => window.pageYOffset)
    console.log('Initial scroll:', initialY)
    
    // Perform touch scroll using mouse events (Playwright simulates touch as mouse on desktop)
    const centerX = 195 // Half of iPhone 13 width
    const startY = 400
    const endY = 100
    
    // Method 1: Using mouse events (works better in Playwright)
    await page.mouse.move(centerX, startY)
    await page.mouse.down()
    await page.mouse.move(centerX, endY, { steps: 10 })
    await page.mouse.up()
    
    // Wait for scroll animation
    await page.waitForTimeout(500)
    
    const scrolledY = await page.evaluate(() => window.pageYOffset)
    console.log('Scrolled to:', scrolledY)
    
    expect(scrolledY).toBeGreaterThan(initialY)
    
    // Test scroll back up
    await page.mouse.move(centerX, endY)
    await page.mouse.down()
    await page.mouse.move(centerX, startY, { steps: 10 })
    await page.mouse.up()
    
    await page.waitForTimeout(500)
    
    const finalY = await page.evaluate(() => window.pageYOffset)
    console.log('Final scroll:', finalY)
    
    expect(finalY).toBeLessThan(scrolledY)
    
    await context.close()
  })

  test('should handle iOS elastic scrolling behavior', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Check CSS for -webkit-overflow-scrolling
    const scrollingStyle = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'))
      return elements.some(el => {
        const style = window.getComputedStyle(el)
        return style.webkitOverflowScrolling === 'touch'
      })
    })
    
    console.log('Has webkit overflow scrolling touch:', scrollingStyle)
    
    // Check for smooth scrolling
    const smoothScrolling = await page.evaluate(() => {
      const html = document.documentElement
      const body = document.body
      const htmlStyle = window.getComputedStyle(html)
      const bodyStyle = window.getComputedStyle(body)
      
      return {
        htmlScrollBehavior: htmlStyle.scrollBehavior,
        bodyScrollBehavior: bodyStyle.scrollBehavior,
        scrollSmooth: htmlStyle.scrollBehavior === 'smooth' || bodyStyle.scrollBehavior === 'smooth'
      }
    })
    
    console.log('Smooth scrolling settings:', smoothScrolling)
    
    await context.close()
  })

  test('should properly handle viewport and safe areas', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check viewport height handling
    const viewportInfo = await page.evaluate(() => {
      const vh = window.innerHeight
      const vw = window.innerWidth
      const hasViewportMeta = !!document.querySelector('meta[name="viewport"]')
      
      // Check for iOS viewport height CSS variables
      const root = document.documentElement
      const computedStyle = window.getComputedStyle(root)
      
      return {
        viewportHeight: vh,
        viewportWidth: vw,
        hasViewportMeta,
        // Check for custom viewport height handling
        hasCustomVH: computedStyle.getPropertyValue('--vh') !== '',
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
        isScrollable: document.documentElement.scrollHeight > window.innerHeight
      }
    })
    
    console.log('Viewport info:', viewportInfo)
    
    expect(viewportInfo.hasViewportMeta).toBe(true)
    expect(viewportInfo.viewportWidth).toBe(390) // iPhone 13 width
    
    await context.close()
  })

  test('should handle iOS keyboard appearance during scrolling', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      hasTouch: true,
    })
    const page = await context.newPage()
    
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Get initial viewport height
    const initialHeight = await page.evaluate(() => window.innerHeight)
    console.log('Initial viewport height:', initialHeight)
    
    // Focus on an input (would trigger keyboard on real device)
    const emailInput = page.locator('input[type="email"]').or(
      page.locator('input').first()
    )
    
    if (await emailInput.isVisible()) {
      await emailInput.tap()
      await page.waitForTimeout(300)
      
      // In real iOS, viewport would shrink when keyboard appears
      // Check if app handles this scenario
      const focusedHeight = await page.evaluate(() => window.innerHeight)
      console.log('Viewport height with keyboard (simulated):', focusedHeight)
      
      // Check if visual viewport API is being used
      const hasVisualViewport = await page.evaluate(() => {
        return 'visualViewport' in window
      })
      
      console.log('Visual Viewport API available:', hasVisualViewport)
      
      if (hasVisualViewport) {
        const visualViewportInfo = await page.evaluate(() => ({
          height: window.visualViewport?.height,
          width: window.visualViewport?.width,
          scale: window.visualViewport?.scale,
        }))
        console.log('Visual viewport info:', visualViewportInfo)
      }
    }
    
    await context.close()
  })
})