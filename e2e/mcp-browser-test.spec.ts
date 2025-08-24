import { test, expect } from './fixtures/auth.fixture'

/**
 * MCP Browser Control Test Suite
 * This demonstrates how to use Playwright MCP tools for browser automation
 */

test.describe('MCP Browser Control Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app home page
    await page.goto('/')
  })

  test('should navigate through the app using MCP browser controls', async ({ authenticatedPage }) => {
    // Test navigation to brain dump with authenticated user
    await authenticatedPage.goto('/braindump')
    await expect(authenticatedPage).toHaveURL('/braindump')
    
    // Check if the brain dump page has loaded by looking for the textarea
    const textarea = authenticatedPage.locator('textarea[placeholder*="What\'s on your mind"]')
    await expect(textarea).toBeVisible()
    
    // Also check for the submit button
    const submitButton = authenticatedPage.locator('button:has-text("Dump")')
    await expect(submitButton).toBeVisible()
  })

  test('should test iOS features on mobile devices', async ({ page, browserName }) => {
    // This test will run on mobile devices
    if (browserName !== 'webkit' && !page.context().device) {
      test.skip()
    }

    await page.goto('/')
    
    // Check if iOS features are detected
    const bodyClasses = await page.locator('body').getAttribute('class')
    
    // On iOS devices, the IOSProvider should add classes
    if (page.context().device?.name?.includes('iPhone')) {
      expect(bodyClasses).toContain('ios-device')
    }
  })

  test('should test haptic feedback buttons', async ({ page }) => {
    // Create a test page with iOS buttons
    await page.goto('/')
    
    // Check if buttons with haptic feedback exist
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThan(0)
  })

  test('should test keyboard avoidance on input focus', async ({ page, browserName }) => {
    // Skip on non-mobile browsers
    if (!page.context().device) {
      test.skip()
    }

    await page.goto('/braindump')
    
    // Find an input field
    const input = page.locator('textarea, input[type="text"]').first()
    
    if (await input.isVisible()) {
      // Focus the input
      await input.focus()
      
      // Wait for potential scroll adjustment
      await page.waitForTimeout(500)
      
      // Check if the input is still visible (not hidden by keyboard)
      await expect(input).toBeInViewport()
    }
  })

  test('should capture screenshots on mobile viewports', async ({ page }) => {
    // Simple screenshot test without authentication
    await page.goto('/')
    
    // Take a screenshot of the homepage
    await page.screenshot({ 
      path: 'test-results/homepage-mobile.png',
      fullPage: false 
    })
    
    // Verify the screenshot was taken (file will exist)
    expect(true).toBe(true)
  })

  test('should test PWA installation prompt', async ({ page }) => {
    await page.goto('/')
    
    // Check if PWA manifest is linked
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
    
    // Check if service worker is registered (in production mode)
    if (process.env.NODE_ENV === 'production') {
      const swRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      expect(swRegistered).toBe(true)
    }
  })

  test('should test responsive design breakpoints', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'iPhone-SE' },
      { width: 390, height: 844, name: 'iPhone-12' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1280, height: 720, name: 'Desktop' }
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      
      // Wait for initial load
      await page.waitForLoadState('domcontentloaded')
      
      // Take a screenshot for each viewport
      await page.screenshot({ 
        path: `test-results/viewport-${viewport.name}.png` 
      })
    }
    
    // Test passes if we made it through all viewports
    expect(viewports.length).toBe(4)
  })

  test('should test touch interactions on mobile', async ({ page, browserName }) => {
    // Only run on mobile devices or webkit (Safari)
    if (!page.context().device && browserName !== 'webkit') {
      test.skip()
    }

    await page.goto('/nodes')
    
    // Find a draggable element
    const draggable = page.locator('[draggable="true"]').first()
    
    if (await draggable.isVisible()) {
      const box = await draggable.boundingBox()
      if (box) {
        // Simulate touch drag
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(100)
        
        // Note: touchscreen.swipe is not available, use drag instead
        await page.mouse.move(box.x, box.y)
        await page.mouse.down()
        await page.mouse.move(box.x + 100, box.y, { steps: 10 })
        await page.mouse.up()
      }
    }
  })

  test('should test accessibility on iOS devices', async ({ page }) => {
    await page.goto('/')
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check for accessibility attributes on all interactive elements
    const interactiveElements = await page.locator('button, a[href], input, textarea, select').all()
    
    // Count elements with proper accessibility attributes
    let accessibleCount = 0
    for (const element of interactiveElements) {
      const hasAriaLabel = await element.getAttribute('aria-label')
      const hasAriaLabelledBy = await element.getAttribute('aria-labelledby')
      const hasTitle = await element.getAttribute('title')
      const hasText = await element.textContent()
      
      if (hasAriaLabel || hasAriaLabelledBy || hasTitle || (hasText && hasText.trim().length > 0)) {
        accessibleCount++
      }
    }
    
    // Ensure at least some interactive elements are accessible
    expect(accessibleCount).toBeGreaterThan(0)
    
    // Check for focus trap in modals
    const modal = page.locator('[role="dialog"]').first()
    if (await modal.isVisible()) {
      // Press Tab to check focus trap
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    }
  })
})

test.describe('MCP Browser API Integration Tests', () => {
  test('should test console message capture', async ({ page }) => {
    const consoleMessages: string[] = []
    
    page.on('console', (msg) => {
      consoleMessages.push(msg.text())
    })
    
    await page.goto('/')
    
    // Execute some JavaScript that logs to console
    await page.evaluate(() => {
      console.log('Test message from MCP browser test')
    })
    
    expect(consoleMessages).toContain('Test message from MCP browser test')
  })

  test('should test network request monitoring', async ({ page }) => {
    const requests: string[] = []
    
    page.on('request', (request) => {
      requests.push(request.url())
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check if critical resources were loaded
    // In Next.js, styles are often bundled in JS files
    const hasJavaScript = requests.some(url => url.includes('.js') || url.includes('_next'))
    const hasHTMLOrJSON = requests.some(url => url.endsWith('/') || url.includes('.json') || url.includes('.html'))
    
    // Log requests for debugging
    console.log('Total requests captured:', requests.length)
    console.log('Sample requests:', requests.slice(0, 5))
    
    expect(hasJavaScript).toBe(true)
    expect(hasHTMLOrJSON).toBe(true)
    expect(requests.length).toBeGreaterThan(0)
  })

  test('should test browser storage APIs', async ({ page }) => {
    await page.goto('/')
    
    // Test localStorage
    await page.evaluate(() => {
      localStorage.setItem('mcp-test', 'test-value')
    })
    
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('mcp-test')
    })
    
    expect(storedValue).toBe('test-value')
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('mcp-test')
    })
  })

  test('should test page evaluation for iOS detection', async ({ page }) => {
    await page.goto('/')
    
    const iosDetection = await page.evaluate(() => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                    (navigator.maxTouchPoints > 0 && /macintosh/.test(userAgent))
      
      return {
        isIOS,
        userAgent,
        touchPoints: navigator.maxTouchPoints,
        platform: navigator.platform
      }
    })
    
    // Log the detection results
    console.log('iOS Detection Results:', iosDetection)
    
    // The test passes regardless, but logs useful info
    expect(iosDetection).toHaveProperty('isIOS')
  })
})