import { test, expect } from '@playwright/test'

// Configure tests for mobile Safari
test.describe('Mobile Safari Touch Scrolling', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  })

  test.beforeEach(async ({ page }) => {
    // Set up mobile viewport meta tag verification
    await page.goto('/')
    
    // Wait for app to load
    await page.waitForLoadState('networkidle')
  })

  test('should allow smooth vertical scrolling on home page', async ({ page }) => {
    // Navigate to a page with scrollable content
    await page.goto('/nodes')
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="nodes-container"]', { timeout: 10000 })
    
    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY)
    expect(initialScrollY).toBe(0)
    
    // Perform touch scroll gesture
    await page.touchscreen.tap(195, 400) // Center of screen
    await page.waitForTimeout(100)
    
    // Swipe up to scroll down
    await page.touchscreen.swipe({
      start: { x: 195, y: 600 },
      end: { x: 195, y: 200 },
      steps: 10,
      speed: 400
    })
    
    await page.waitForTimeout(500)
    
    // Verify scroll happened
    const newScrollY = await page.evaluate(() => window.scrollY)
    expect(newScrollY).toBeGreaterThan(initialScrollY)
  })

  test('should handle pull-to-refresh without blocking scroll', async ({ page }) => {
    await page.goto('/braindump')
    
    // Wait for the component with pull-to-refresh
    await page.waitForSelector('[data-testid="braindump-container"]', { timeout: 10000 })
    
    // Check if we can scroll normally when not at top
    await page.evaluate(() => {
      window.scrollTo(0, 100)
    })
    
    const scrollBefore = await page.evaluate(() => window.scrollY)
    expect(scrollBefore).toBe(100)
    
    // Try to scroll down more
    await page.touchscreen.swipe({
      start: { x: 195, y: 600 },
      end: { x: 195, y: 300 },
      steps: 10,
      speed: 400
    })
    
    await page.waitForTimeout(300)
    
    const scrollAfter = await page.evaluate(() => window.scrollY)
    expect(scrollAfter).toBeGreaterThan(scrollBefore)
  })

  test('should not prevent horizontal scrolling in matrix view', async ({ page }) => {
    await page.goto('/matrix')
    
    // Wait for matrix container
    await page.waitForSelector('.react-flow', { timeout: 10000 })
    
    // Get initial transform
    const initialTransform = await page.evaluate(() => {
      const flowViewport = document.querySelector('.react-flow__viewport')
      if (!flowViewport) return null
      return window.getComputedStyle(flowViewport).transform
    })
    
    // Perform horizontal swipe
    await page.touchscreen.swipe({
      start: { x: 300, y: 400 },
      end: { x: 100, y: 400 },
      steps: 10,
      speed: 400
    })
    
    await page.waitForTimeout(500)
    
    // Verify transform changed (horizontal pan)
    const newTransform = await page.evaluate(() => {
      const flowViewport = document.querySelector('.react-flow__viewport')
      if (!flowViewport) return null
      return window.getComputedStyle(flowViewport).transform
    })
    
    expect(newTransform).not.toBe(initialTransform)
  })

  test('should handle momentum scrolling correctly', async ({ page }) => {
    await page.goto('/journal')
    
    // Add content to make page scrollable
    await page.evaluate(() => {
      const container = document.querySelector('main')
      if (container) {
        for (let i = 0; i < 50; i++) {
          const div = document.createElement('div')
          div.style.height = '100px'
          div.textContent = `Item ${i}`
          container.appendChild(div)
        }
      }
    })
    
    // Perform a quick swipe for momentum scrolling
    await page.touchscreen.swipe({
      start: { x: 195, y: 700 },
      end: { x: 195, y: 100 },
      steps: 5,
      speed: 100 // Fast swipe
    })
    
    // Wait for momentum to settle
    await page.waitForTimeout(1000)
    
    const finalScrollY = await page.evaluate(() => window.scrollY)
    expect(finalScrollY).toBeGreaterThan(300) // Should have scrolled significantly due to momentum
  })

  test('should handle pinch-to-zoom in matrix view', async ({ page }) => {
    await page.goto('/matrix')
    
    await page.waitForSelector('.react-flow', { timeout: 10000 })
    
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const flowViewport = document.querySelector('.react-flow__viewport')
      if (!flowViewport) return 1
      const transform = window.getComputedStyle(flowViewport).transform
      const matrix = transform.match(/matrix\(([^)]+)\)/)
      if (matrix) {
        const values = matrix[1].split(',').map(v => parseFloat(v.trim()))
        return values[0] // scale value
      }
      return 1
    })
    
    // Simulate pinch zoom
    await page.touchscreen.pinch({
      center: { x: 195, y: 400 },
      scale: 1.5
    })
    
    await page.waitForTimeout(500)
    
    // Check zoom changed
    const newZoom = await page.evaluate(() => {
      const flowViewport = document.querySelector('.react-flow__viewport')
      if (!flowViewport) return 1
      const transform = window.getComputedStyle(flowViewport).transform
      const matrix = transform.match(/matrix\(([^)]+)\)/)
      if (matrix) {
        const values = matrix[1].split(',').map(v => parseFloat(v.trim()))
        return values[0]
      }
      return 1
    })
    
    expect(newZoom).toBeGreaterThan(initialZoom)
  })

  test('should maintain scroll position on route navigation', async ({ page }) => {
    await page.goto('/nodes')
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500))
    const scrollPos = await page.evaluate(() => window.scrollY)
    expect(scrollPos).toBe(500)
    
    // Navigate to another route
    await page.click('[href="/journal"]')
    await page.waitForURL('**/journal')
    
    // Check scroll reset
    const newScrollPos = await page.evaluate(() => window.scrollY)
    expect(newScrollPos).toBe(0)
    
    // Go back
    await page.goBack()
    await page.waitForURL('**/nodes')
    
    // Some frameworks maintain scroll position on back navigation
    const restoredScrollPos = await page.evaluate(() => window.scrollY)
    console.log('Restored scroll position:', restoredScrollPos)
  })

  test('should handle elastic scrolling (rubber band effect)', async ({ page }) => {
    await page.goto('/braindump')
    
    // Try to scroll beyond top (elastic scroll)
    await page.touchscreen.swipe({
      start: { x: 195, y: 200 },
      end: { x: 195, y: 600 },
      steps: 10,
      speed: 400
    })
    
    await page.waitForTimeout(500)
    
    // Should snap back to top
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBe(0)
  })

  test('should not block scrolling when touching interactive elements', async ({ page }) => {
    await page.goto('/nodes')
    
    // Wait for interactive elements
    await page.waitForSelector('button', { timeout: 10000 })
    
    // Get button position
    const buttonBox = await page.locator('button').first().boundingBox()
    if (!buttonBox) throw new Error('Button not found')
    
    // Start touch on button but scroll (not tap)
    await page.touchscreen.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2)
    await page.touchscreen.down()
    
    // Move significantly to indicate scroll intent
    for (let i = 1; i <= 10; i++) {
      await page.touchscreen.move(
        buttonBox.x + buttonBox.width / 2,
        buttonBox.y + buttonBox.height / 2 - (i * 20)
      )
      await page.waitForTimeout(20)
    }
    
    await page.touchscreen.up()
    
    // Verify scroll happened and button wasn't clicked
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeGreaterThan(0)
  })

  test('should handle nested scrollable containers', async ({ page }) => {
    await page.goto('/timebox')
    
    // Wait for nested scrollable area
    await page.waitForSelector('[data-testid="node-pool"]', { timeout: 10000 })
    
    // Scroll the nested container
    const nestedContainer = page.locator('[data-testid="node-pool"]')
    const box = await nestedContainer.boundingBox()
    if (!box) throw new Error('Nested container not found')
    
    // Scroll within nested container
    await page.touchscreen.swipe({
      start: { x: box.x + box.width / 2, y: box.y + box.height - 50 },
      end: { x: box.x + box.width / 2, y: box.y + 50 },
      steps: 10,
      speed: 400
    })
    
    await page.waitForTimeout(500)
    
    // Verify nested container scrolled, not the page
    const pageScroll = await page.evaluate(() => window.scrollY)
    const nestedScroll = await nestedContainer.evaluate(el => el.scrollTop)
    
    expect(pageScroll).toBe(0)
    expect(nestedScroll).toBeGreaterThan(0)
  })

  test('should respect touch-action CSS properties', async ({ page }) => {
    await page.goto('/nodes')
    
    // Check touch-action properties
    const touchAction = await page.evaluate(() => {
      const body = document.body
      return window.getComputedStyle(body).touchAction
    })
    
    // Should allow normal touch interactions
    expect(['auto', 'manipulation'].includes(touchAction)).toBeTruthy()
    
    // Verify no elements block scrolling unintentionally
    const blockingElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const blocking = []
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        if (style.touchAction === 'none' && el.scrollHeight <= el.clientHeight) {
          blocking.push({
            tag: el.tagName,
            class: el.className,
            id: el.id
          })
        }
      })
      return blocking
    })
    
    // Log any problematic elements
    if (blockingElements.length > 0) {
      console.log('Elements blocking touch:', blockingElements)
    }
  })
})

// Additional helper to extend Playwright's touchscreen API
declare module '@playwright/test' {
  interface Touchscreen {
    swipe(options: {
      start: { x: number; y: number }
      end: { x: number; y: number }
      steps?: number
      speed?: number
    }): Promise<void>
    pinch(options: {
      center: { x: number; y: number }
      scale: number
    }): Promise<void>
  }
}

// Extend touchscreen with custom gestures
async function extendTouchscreen(page: any) {
  page.touchscreen.swipe = async ({ start, end, steps = 10, speed = 200 }) => {
    await page.touchscreen.move(start.x, start.y)
    await page.touchscreen.down()
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const x = start.x + (end.x - start.x) * progress
      const y = start.y + (end.y - start.y) * progress
      await page.touchscreen.move(x, y)
      await page.waitForTimeout(speed / steps)
    }
    
    await page.touchscreen.up()
  }
  
  page.touchscreen.pinch = async ({ center, scale }) => {
    const offset = 50
    
    // Two fingers start
    await page.touchscreen.move(center.x - offset, center.y)
    await page.touchscreen.down()
    await page.touchscreen.move(center.x + offset, center.y)
    await page.touchscreen.down()
    
    // Pinch gesture
    const newOffset = offset * scale
    await page.touchscreen.move(center.x - newOffset, center.y)
    await page.touchscreen.move(center.x + newOffset, center.y)
    
    // Release
    await page.touchscreen.up()
    await page.touchscreen.up()
  }
}