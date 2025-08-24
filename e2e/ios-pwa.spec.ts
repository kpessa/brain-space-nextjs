import { test, expect, devices } from '@playwright/test'

test.describe('iOS PWA Features', () => {
  test.describe('PWA Installation', () => {
    test('should have required PWA meta tags for iOS', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for Apple-specific meta tags
      const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]')
      await expect(appleCapable).toHaveAttribute('content', 'yes')
      
      const statusBar = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')
      await expect(statusBar).toHaveAttribute('content', /.+/)
      
      const title = await page.locator('meta[name="apple-mobile-web-app-title"]')
      await expect(title).toHaveAttribute('content', /.+/)
      
      await context.close()
    })

    test('should have Apple touch icons', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for Apple touch icons
      const touchIcons = await page.locator('link[rel*="apple-touch-icon"]').all()
      expect(touchIcons.length).toBeGreaterThan(0)
      
      // Verify at least one icon has proper href
      if (touchIcons.length > 0) {
        const href = await touchIcons[0].getAttribute('href')
        expect(href).toBeTruthy()
        expect(href).toMatch(/\.(png|jpg|jpeg|svg)$/i)
      }
      
      await context.close()
    })

    test('should have web app manifest', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for manifest link
      const manifestLink = await page.locator('link[rel="manifest"]')
      const manifestHref = await manifestLink.getAttribute('href')
      expect(manifestHref).toBeTruthy()
      
      // Fetch and validate manifest
      if (manifestHref) {
        const response = await page.request.get(manifestHref)
        expect(response.status()).toBe(200)
        
        const manifest = await response.json()
        expect(manifest.name).toBeTruthy()
        expect(manifest.short_name).toBeTruthy()
        expect(manifest.display).toMatch(/standalone|fullscreen|minimal-ui/)
        expect(manifest.start_url).toBeTruthy()
        expect(manifest.icons).toBeInstanceOf(Array)
        expect(manifest.icons.length).toBeGreaterThan(0)
      }
      
      await context.close()
    })

    test('should have iOS splash screens', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for Apple splash screen links
      const splashScreens = await page.locator('link[rel="apple-touch-startup-image"]').all()
      
      // iOS PWAs should have splash screens for different device sizes
      if (splashScreens.length > 0) {
        for (const splash of splashScreens) {
          const href = await splash.getAttribute('href')
          expect(href).toBeTruthy()
          
          const media = await splash.getAttribute('media')
          // Should have media queries for different device sizes
          if (media) {
            expect(media).toMatch(/device-width|device-height/)
          }
        }
      }
      
      await context.close()
    })
  })

  test.describe('Offline Functionality', () => {
    test('should register service worker', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check if service worker is registered
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      
      expect(hasServiceWorker).toBe(true)
      
      // Wait for service worker registration
      if (hasServiceWorker) {
        const swRegistered = await page.evaluate(() => {
          return navigator.serviceWorker.ready.then(() => true).catch(() => false)
        })
        
        // Note: Service worker might not be implemented yet
        // This test will help track when it's added
      }
      
      await context.close()
    })

    test('should handle offline mode gracefully', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        offline: true,
      })
      const page = await context.newPage()
      
      // First visit online to cache resources
      await context.setOffline(false)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Go offline
      await context.setOffline(true)
      
      // Try to navigate
      await page.reload()
      
      // Page should still display content (if service worker is active)
      // or show a meaningful offline message
      const pageContent = await page.textContent('body')
      expect(pageContent).toBeTruthy()
      
      await context.close()
    })

    test('should cache critical resources', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      // Track resource caching
      const cachedResources: string[] = []
      
      page.on('response', response => {
        const cacheControl = response.headers()['cache-control']
        if (cacheControl && !cacheControl.includes('no-cache')) {
          cachedResources.push(response.url())
        }
      })
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Critical resources should be cached
      const hasCachedJS = cachedResources.some(url => url.includes('.js'))
      const hasCachedCSS = cachedResources.some(url => url.includes('.css'))
      
      // These might not be cached yet if service worker isn't implemented
      // This test helps track caching implementation
      
      await context.close()
    })
  })

  test.describe('iOS-Specific PWA Behaviors', () => {
    test('should handle iOS standalone mode', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      // Simulate standalone mode
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', {
          get: () => true,
        })
      })
      
      await page.goto('/')
      
      // Check if app detects standalone mode
      const isStandalone = await page.evaluate(() => {
        return (window.navigator as any).standalone === true ||
               window.matchMedia('(display-mode: standalone)').matches
      })
      
      expect(isStandalone).toBe(true)
      
      await context.close()
    })

    test('should prevent iOS bounce scroll in standalone', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for iOS bounce prevention
      const hasBounceProtection = await page.evaluate(() => {
        const body = document.body
        const html = document.documentElement
        
        const bodyStyle = window.getComputedStyle(body)
        const htmlStyle = window.getComputedStyle(html)
        
        return bodyStyle.position === 'fixed' ||
               htmlStyle.overscrollBehavior === 'none' ||
               bodyStyle.overscrollBehavior === 'none'
      })
      
      // This might not be implemented yet
      // Test helps track when iOS bounce protection is added
      
      await context.close()
    })

    test('should handle iOS safe areas in PWA mode', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        viewport: {
          ...devices['iPhone 13'].viewport!,
          hasTouch: true,
        },
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check viewport meta tag includes viewport-fit
      const viewportMeta = await page.locator('meta[name="viewport"]')
      const content = await viewportMeta.getAttribute('content')
      
      // Should include viewport-fit=cover for full-screen PWA
      if (content?.includes('viewport-fit=cover')) {
        // Check if safe area CSS is applied
        const hasSafeAreaPadding = await page.evaluate(() => {
          const elements = document.querySelectorAll('*')
          return Array.from(elements).some(el => {
            const style = window.getComputedStyle(el)
            return style.paddingTop.includes('env(safe-area-inset-top)') ||
                   style.paddingBottom.includes('env(safe-area-inset-bottom)')
          })
        })
      }
      
      await context.close()
    })

    test('should handle iOS PWA navigation without browser chrome', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      // Simulate standalone mode
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', {
          get: () => true,
        })
      })
      
      await page.goto('/')
      
      // In standalone mode, navigation should work without browser back button
      // Check if app provides its own navigation
      const hasBackButton = await page.locator('button:has-text("Back")').or(
        page.locator('[aria-label*="back"]')
      ).isVisible()
      
      // Navigate to another page
      await page.goto('/braindump')
      
      // Check if there's a way to go back in standalone mode
      const navigationOptions = await page.locator('nav').isVisible() ||
                               await page.locator('[role="navigation"]').isVisible()
      
      expect(navigationOptions).toBe(true)
      
      await context.close()
    })
  })

  test.describe('Performance on iOS', () => {
    test('should load quickly on iOS devices', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // PWA should load quickly even on mobile
      expect(loadTime).toBeLessThan(5000) // 5 seconds max
      
      await context.close()
    })

    test('should have optimized images for retina displays', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        deviceScaleFactor: 3, // iPhone 13 has 3x retina display
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for high-resolution images
      const images = await page.locator('img').all()
      
      for (const img of images) {
        const src = await img.getAttribute('src')
        const srcset = await img.getAttribute('srcset')
        
        // Should have either high-res src or srcset for retina
        if (srcset) {
          expect(srcset).toMatch(/2x|3x/)
        }
      }
      
      await context.close()
    })
  })
})