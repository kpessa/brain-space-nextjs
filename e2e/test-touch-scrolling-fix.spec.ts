import { test, expect } from '@playwright/test'

test.describe('Touch Scrolling Fix Verification', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  })

  test('pull-to-refresh should not block normal scrolling', async ({ page }) => {
    // Navigate to a page with pull-to-refresh
    await page.goto('/braindump')
    await page.waitForLoadState('networkidle')
    
    // Add content to make page scrollable
    await page.evaluate(() => {
      const container = document.querySelector('main')
      if (container) {
        // Add enough content to make scrolling necessary
        for (let i = 0; i < 20; i++) {
          const div = document.createElement('div')
          div.style.height = '100px'
          div.style.padding = '20px'
          div.textContent = `Test content ${i + 1}`
          container.appendChild(div)
        }
      }
    })
    
    // Verify page is scrollable
    const isScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight
    })
    expect(isScrollable).toBe(true)
    
    // Test scrolling down (should not be blocked)
    const initialScrollY = await page.evaluate(() => window.scrollY)
    expect(initialScrollY).toBe(0)
    
    // Simulate touch scroll down
    await page.mouse.move(195, 400)
    await page.mouse.down()
    
    // Move in small increments to simulate real touch
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(195, 400 - (i * 20))
      await page.waitForTimeout(20)
    }
    
    await page.mouse.up()
    await page.waitForTimeout(500)
    
    // Check if scroll happened
    const scrolledY = await page.evaluate(() => window.scrollY)
    expect(scrolledY).toBeGreaterThan(0)
    console.log(`Scrolled from ${initialScrollY} to ${scrolledY}`)
  })

  test('viewport height should be set correctly', async ({ page }) => {
    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    
    // Check if --vh custom property is set
    const vhValue = await page.evaluate(() => {
      const root = document.documentElement
      const vh = getComputedStyle(root).getPropertyValue('--vh')
      return {
        vhSet: vh !== '',
        vhValue: vh,
        windowHeight: window.innerHeight,
        expectedVh: window.innerHeight * 0.01 + 'px'
      }
    })
    
    expect(vhValue.vhSet).toBe(true)
    expect(vhValue.vhValue).toBe(vhValue.expectedVh)
    console.log('Viewport height properly set:', vhValue)
  })

  test('touch event listeners should be optimized', async ({ page }) => {
    await page.goto('/nodes')
    await page.waitForLoadState('networkidle')
    
    // Check for non-passive touchmove listeners
    const touchListeners = await page.evaluate(() => {
      const results = {
        totalElements: 0,
        elementsWithTouchListeners: 0,
        nonPassiveListeners: []
      }
      
      // Check all elements
      document.querySelectorAll('*').forEach(el => {
        results.totalElements++
        
        // This is a simplified check - in reality we'd need to hook into addEventListener
        const style = window.getComputedStyle(el)
        if (style.touchAction === 'none') {
          results.elementsWithTouchListeners++
        }
      })
      
      return results
    })
    
    console.log('Touch listener audit:', touchListeners)
    
    // There should be minimal elements blocking touch
    expect(touchListeners.elementsWithTouchListeners).toBeLessThan(5)
  })

  test('pull-to-refresh threshold should be reasonable', async ({ page }) => {
    await page.goto('/braindump')
    await page.waitForLoadState('networkidle')
    
    // Check pull-to-refresh behavior at the top
    await page.evaluate(() => window.scrollTo(0, 0))
    
    // Small pull should not trigger refresh or block scroll
    await page.mouse.move(195, 200)
    await page.mouse.down()
    await page.mouse.move(195, 210) // Small 10px pull
    await page.mouse.up()
    
    // Should not show refresh indicator for small pull
    const hasRefreshIndicator = await page.evaluate(() => {
      // Look for pull-to-refresh visual indicators
      const indicators = document.querySelectorAll('[class*="pull"], [class*="refresh"], [class*="loading"]')
      return Array.from(indicators).some(el => {
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.opacity !== '0'
      })
    })
    
    expect(hasRefreshIndicator).toBe(false)
  })

  test('scrolling should work in all major routes', async ({ page }) => {
    const routes = [
      '/todos',
      '/journal', 
      '/nodes',
      '/braindump',
      '/timebox',
      '/routines'
    ]
    
    for (const route of routes) {
      console.log(`Testing scroll in ${route}`)
      
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      
      // Add test content if needed
      await page.evaluate(() => {
        const main = document.querySelector('main')
        if (main && main.scrollHeight <= window.innerHeight) {
          // Add content to make scrollable
          for (let i = 0; i < 10; i++) {
            const div = document.createElement('div')
            div.style.height = '150px'
            div.textContent = `Test ${i}`
            main.appendChild(div)
          }
        }
      })
      
      // Test scroll
      const canScroll = await page.evaluate(() => {
        const before = window.scrollY
        window.scrollBy(0, 100)
        const after = window.scrollY
        window.scrollTo(0, 0) // Reset
        return after > before
      })
      
      expect(canScroll).toBe(true)
      console.log(`✓ ${route} scrolls correctly`)
    }
  })
})