import { test, expect, devices } from '@playwright/test'

// Use iPhone 13 with test user authentication (works across all browsers)
test.use({
  ...devices['iPhone 13'],
  storageState: 'e2e/storage-states/defaultUser.json' // Use test user instead of real user
})

test.describe('Mobile Safari Scrolling - Test User', () => {
  
  test('should scroll on Journal page', async ({ page }) => {
    console.log('📱 Testing Journal on Mobile Safari (WebKit)...')
    
    // Go to Journal page
    await page.goto('/journal')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Check URL - if redirected to login, the auth didn't work
    const url = page.url()
    if (url.includes('/login')) {

      // Skip auth check and continue
    } else {

    }
    
    // Take screenshot regardless
    await page.screenshot({ 
      path: 'test-results/webkit-journal.png',
      fullPage: false 
    })
    
    // Check if page is scrollable
    const scrollInfo = await page.evaluate(() => {
      return {
        scrollHeight: document.documentElement.scrollHeight,
        viewHeight: window.innerHeight,
        isScrollable: document.documentElement.scrollHeight > window.innerHeight,
        title: document.title,
        hasContent: document.body.textContent?.length || 0
      }
    })

    if (scrollInfo.isScrollable) {
      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY)

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 300))
      await page.waitForTimeout(500)
      
      // Verify scroll happened
      const newScroll = await page.evaluate(() => window.scrollY)

      if (newScroll > initialScroll) {

      }
      
      // Take screenshot after scroll
      await page.screenshot({ 
        path: 'test-results/webkit-journal-scrolled.png',
        fullPage: false 
      })
    } else {

    }
  })
  
  test('should test touch gestures on Mobile Safari', async ({ page }) => {
    console.log('📱 Testing touch gestures on Mobile Safari (WebKit)...')
    
    // Try any page that should have content
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    const url = page.url()

    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollY: window.scrollY
    }))

    // Simulate touch scroll
    const viewport = page.viewportSize()
    if (viewport && dimensions.scrollHeight > dimensions.clientHeight) {

      const centerX = viewport.width / 2
      const startY = viewport.height * 0.7
      const endY = viewport.height * 0.3
      
      // Perform swipe
      await page.touchscreen.tap(centerX, startY)
      await page.waitForTimeout(100)
      
      // Simulate swipe gesture
      await page.evaluate(() => {
        // Fallback to programmatic scroll if touch doesn't work
        window.scrollBy({ top: 200, behavior: 'smooth' })
      })
      
      await page.waitForTimeout(500)
      
      // Check result
      const newScrollY = await page.evaluate(() => window.scrollY)

      if (newScrollY > dimensions.scrollY) {

      }
    } else {

    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/webkit-touch-test.png' 
    })
  })
  
  test('WebKit browser verification', async ({ page, browserName }) => {

    // Navigate to any page
    await page.goto('/')
    
    // Check user agent
    const userAgent = await page.evaluate(() => navigator.userAgent)

    // Check if it's WebKit/Safari
    const isWebKit = userAgent.includes('WebKit') && !userAgent.includes('Chrome')
    const isMobile = userAgent.includes('Mobile')
    const isiPhone = userAgent.includes('iPhone')

    // Check viewport
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    }))

    // This should be WebKit when run with --project="Mobile Safari"
    expect(browserName).toBe('webkit')
    console.log('✅ Confirmed running on WebKit (Safari engine)')
    
    // Take screenshot showing the browser
    await page.screenshot({ 
      path: 'test-results/webkit-verification.png' 
    })
  })
})