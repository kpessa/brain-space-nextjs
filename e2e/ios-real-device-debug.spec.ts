import { test, expect, devices } from '@playwright/test'

// Use iPhone 13 with test user authentication
test.use({
  ...devices['iPhone 13'],
  storageState: 'e2e/storage-states/defaultUser.json'
})

test.describe('iOS Real Device Debug', () => {
  test('should work on real iOS device', async ({ page }) => {

    // Navigate to journal page
    await page.goto('/journal')
    await expect(page).toHaveURL('/journal')
    
    // Get comprehensive device and CSS info
    const deviceInfo = await page.evaluate(() => {
      const userAgent = navigator.userAgent
      const isIOS = /iPad|iPhone|iPod/.test(userAgent)
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
      const isStandalone = window.navigator.standalone === true
      
      // Get CSS computed styles
      const bodyStyle = getComputedStyle(document.body)
      const htmlStyle = getComputedStyle(document.documentElement)
      
      // Check for PWA mode
      const isPWA = window.matchMedia('(display-mode: standalone)').matches
      
      return {
        userAgent,
        isIOS,
        isSafari,
        isStandalone,
        isPWA,
        bodyOverflow: bodyStyle.overflow,
        bodyPosition: bodyStyle.position,
        bodyTouchAction: bodyStyle.touchAction,
        bodyWebkitOverflowScrolling: bodyStyle.webkitOverflowScrolling,
        htmlOverflow: htmlStyle.overflow,
        htmlPosition: htmlStyle.position,
        htmlTouchAction: htmlStyle.touchAction,
        htmlWebkitOverflowScrolling: htmlStyle.webkitOverflowScrolling,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        scrollY: window.scrollY
      }
    })

    // Verify iOS detection
    expect(deviceInfo.isIOS).toBe(true)
    
    // Check if scrolling should work
    const shouldBeScrollable = deviceInfo.scrollHeight > deviceInfo.clientHeight
    console.log(`Should be scrollable: ${shouldBeScrollable} (${deviceInfo.scrollHeight} > ${deviceInfo.clientHeight})`)
    
    if (shouldBeScrollable) {
      // Test scrolling
      const initialScrollY = deviceInfo.scrollY
      await page.evaluate(() => window.scrollBy(0, 200))
      await page.waitForTimeout(500)
      
      const finalScrollY = await page.evaluate(() => window.scrollY)

      expect(finalScrollY).toBeGreaterThan(initialScrollY)
    }

  })
  
  test('should check for PWA-specific issues', async ({ page }) => {

    await page.goto('/journal')
    await expect(page).toHaveURL('/journal')
    
    const pwaInfo = await page.evaluate(() => {
      // Check PWA status
      const isStandalone = window.navigator.standalone === true
      const isPWA = window.matchMedia('(display-mode: standalone)').matches
      
      // Check for any PWA-specific CSS issues
      const bodyClasses = document.body.className
      const hasIOSClasses = bodyClasses.includes('ios-device') || 
                           bodyClasses.includes('ios-standalone') ||
                           bodyClasses.includes('ios-notch')
      
      // Check for any fixed positioning
      const bodyStyle = getComputedStyle(document.body)
      const htmlStyle = getComputedStyle(document.documentElement)
      
      return {
        isStandalone,
        isPWA,
        hasIOSClasses,
        bodyClasses,
        bodyPosition: bodyStyle.position,
        htmlPosition: htmlStyle.position,
        bodyOverflow: bodyStyle.overflow,
        htmlOverflow: htmlStyle.overflow
      }
    })

    // Log any potential issues
    if (pwaInfo.bodyPosition === 'fixed' || pwaInfo.htmlPosition === 'fixed') {

    }
    
    if (pwaInfo.bodyOverflow === 'hidden' || pwaInfo.htmlOverflow === 'hidden') {

    }

  })
})
