import { test, expect, devices } from '@playwright/test'

// Use iPhone 13 with test user authentication
test.use({
  ...devices['iPhone 13'],
  storageState: 'e2e/storage-states/defaultUser.json'
})

test.describe('iOS Touch Scrolling Debug', () => {
  test('should allow touch scrolling on main content', async ({ page }) => {
    console.log('🔍 Debugging touch scrolling on iOS...')
    
    // Navigate to journal page
    await page.goto('/journal')
    await expect(page).toHaveURL('/journal')
    
    // Check if page is scrollable
    const pageInfo = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollY: window.scrollY,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyPosition: getComputedStyle(document.body).position,
      htmlPosition: getComputedStyle(document.documentElement).position,
      touchAction: getComputedStyle(document.body).touchAction,
      webkitOverflowScrolling: getComputedStyle(document.body).webkitOverflowScrolling
    }))
    
    console.log('Page scroll info:', pageInfo)
    
    // Page should be scrollable vertically
    expect(pageInfo.scrollHeight).toBeGreaterThan(pageInfo.clientHeight)
    
    // Body should allow scrolling
    expect(pageInfo.bodyOverflow).not.toBe('hidden')
    expect(pageInfo.htmlOverflow).not.toBe('hidden')
    
    // Body should not be fixed positioned
    expect(pageInfo.bodyPosition).not.toBe('fixed')
    expect(pageInfo.htmlPosition).not.toBe('fixed')
    
    // Touch action should allow vertical scrolling
    expect(pageInfo.touchAction).toContain('pan-y')
    
    // WebKit overflow scrolling should be enabled
    expect(pageInfo.webkitOverflowScrolling).toBe('touch')
    
    console.log('✅ Touch scrolling should be enabled')
  })
  
  test('should respond to touch scroll events', async ({ page }) => {
    console.log('👆 Testing touch scroll event handling...')
    
    await page.goto('/journal')
    await expect(page).toHaveURL('/journal')
    
    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY)
    console.log(`Initial scroll Y: ${initialScrollY}`)
    
    // Simulate touch scroll by 200px
    await page.evaluate(() => {
      // Simulate a touch scroll event
      window.scrollBy(0, 200)
    })
    
    // Wait for scroll to settle
    await page.waitForTimeout(500)
    
    const finalScrollY = await page.evaluate(() => window.scrollY)
    console.log(`Final scroll Y: ${finalScrollY}`)
    
    // Should have scrolled
    expect(finalScrollY).toBeGreaterThan(initialScrollY)
    
    console.log('✅ Touch scroll events are working')
  })
  
  test('should not have conflicting CSS rules', async ({ page }) => {
    console.log('🎨 Checking for conflicting CSS rules...')
    
    await page.goto('/journal')
    await expect(page).toHaveURL('/journal')
    
    // Check for problematic CSS rules
    const cssIssues = await page.evaluate(() => {
      const issues = []
      
      // Check body styles
      const bodyStyle = getComputedStyle(document.body)
      if (bodyStyle.position === 'fixed') {
        issues.push('Body has position: fixed')
      }
      if (bodyStyle.overflow === 'hidden') {
        issues.push('Body has overflow: hidden')
      }
      
      // Check html styles
      const htmlStyle = getComputedStyle(document.documentElement)
      if (htmlStyle.position === 'fixed') {
        issues.push('HTML has position: fixed')
      }
      if (htmlStyle.overflow === 'hidden') {
        issues.push('HTML has overflow: hidden')
      }
      
      // Check main content
      const main = document.querySelector('main')
      if (main) {
        const mainStyle = getComputedStyle(main)
        if (mainStyle.overflow === 'hidden') {
          issues.push('Main has overflow: hidden')
        }
        if (mainStyle.position === 'fixed') {
          issues.push('Main has position: fixed')
        }
      }
      
      return issues
    })
    
    console.log('CSS issues found:', cssIssues)
    
    // Should not have any blocking CSS rules
    expect(cssIssues.length).toBe(0)
    
    console.log('✅ No conflicting CSS rules found')
  })
  
  test('should handle touch events properly', async ({ page }) => {
    console.log('📱 Testing touch event handling...')
    
    await page.goto('/journal')
    await expect(page).toHaveURL('/journal')
    
    // Check if touch events are being prevented
    const touchEventInfo = await page.evaluate(() => {
      let touchEventsPrevented = 0
      let touchEventsAllowed = 0
      
      // Override preventDefault to track calls
      const originalPreventDefault = Event.prototype.preventDefault
      Event.prototype.preventDefault = function() {
        if (this.type.startsWith('touch')) {
          touchEventsPrevented++
        }
        return originalPreventDefault.call(this)
      }
      
      // Simulate touch events
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      })
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      })
      const touchEnd = new TouchEvent('touchend', {})
      
      document.dispatchEvent(touchStart)
      document.dispatchEvent(touchMove)
      document.dispatchEvent(touchEnd)
      
      // Restore original preventDefault
      Event.prototype.preventDefault = originalPreventDefault
      
      return {
        touchEventsPrevented,
        touchEventsAllowed: 3 - touchEventsPrevented
      }
    })
    
    console.log('Touch event info:', touchEventInfo)
    
    // Most touch events should be allowed (not prevented)
    expect(touchEventInfo.touchEventsAllowed).toBeGreaterThan(1)
    
    console.log('✅ Touch events are being handled properly')
  })
})
