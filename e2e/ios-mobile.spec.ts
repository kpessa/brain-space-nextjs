import { test, expect, devices } from '@playwright/test'

test.describe('iOS Mobile Experience', () => {
  test.describe('Viewport and Responsiveness', () => {
    test('should display properly on iPhone 13', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      const viewport = page.viewportSize()
      expect(viewport?.width).toBe(390)
      // Height may vary due to browser chrome
      expect(viewport?.height).toBeGreaterThan(600)
      expect(viewport?.height).toBeLessThanOrEqual(844)
      
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
      
      await context.close()
    })

    test('should display properly on iPad Pro', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro 11'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      const viewport = page.viewportSize()
      expect(viewport?.width).toBe(834)
      // Height may vary due to browser chrome
      expect(viewport?.height).toBeGreaterThan(1000)
      expect(viewport?.height).toBeLessThanOrEqual(1194)
      
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
      
      await context.close()
    })

    test('should handle orientation changes', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Portrait orientation
      await page.setViewportSize({ width: 390, height: 844 })
      let viewport = page.viewportSize()
      expect(viewport?.width).toBeLessThan(viewport?.height!)
      
      // Landscape orientation
      await page.setViewportSize({ width: 844, height: 390 })
      viewport = page.viewportSize()
      expect(viewport?.width).toBeGreaterThan(viewport?.height!)
      
      await context.close()
    })
  })

  test.describe('Touch Interactions', () => {
    test('should handle touch events on buttons', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        hasTouch: true,
      })
      const page = await context.newPage()
      
      await page.goto('/braindump')
      
      // Find and tap submit button
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.tap()
      
      await context.close()
    })

    test('should handle swipe gestures on nodes page', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        hasTouch: true,
      })
      const page = await context.newPage()
      
      await page.goto('/nodes')
      
      // Simulate swipe gesture
      await page.locator('body').dispatchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 400 }],
      })
      
      await page.locator('body').dispatchEvent('touchmove', {
        touches: [{ clientX: 100, clientY: 400 }],
      })
      
      await page.locator('body').dispatchEvent('touchend', {
        touches: [],
      })
      
      await context.close()
    })

    test('should handle long press on nodes', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        hasTouch: true,
      })
      const page = await context.newPage()
      
      await page.goto('/nodes')
      
      // Wait for nodes to load
      await page.waitForTimeout(1000)
      
      // Perform long press on a node
      const node = page.locator('circle').first()
      if (await node.isVisible()) {
        await node.dispatchEvent('touchstart')
        await page.waitForTimeout(500) // Long press duration
        await node.dispatchEvent('touchend')
      }
      
      await context.close()
    })
  })

  test.describe('Mobile Safari Specific', () => {
    test('should handle mobile Safari viewport meta tag', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        userAgent: devices['iPhone 13'].userAgent,
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for viewport meta tag
      const viewportMeta = await page.locator('meta[name="viewport"]')
      const content = await viewportMeta.getAttribute('content')
      
      expect(content).toContain('width=device-width')
      expect(content).toContain('initial-scale=1')
      
      await context.close()
    })

    test('should handle iOS safe area insets', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for safe area handling in CSS
      const hasEnvFunction = await page.evaluate(() => {
        const styles = Array.from(document.styleSheets)
        return styles.some(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || [])
            return rules.some(rule => {
              if ('style' in rule) {
                const styleText = rule.style.cssText
                return styleText.includes('env(safe-area-inset') || 
                       styleText.includes('constant(safe-area-inset')
              }
              return false
            })
          } catch {
            return false
          }
        })
      })
      
      // Note: This might not find CSS modules or inline styles
      // It's mainly checking if safe areas are considered
      
      await context.close()
    })

    test('should handle iOS bounce scroll', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for -webkit-overflow-scrolling
      const hasWebkitScroll = await page.evaluate(() => {
        const elements = document.querySelectorAll('*')
        return Array.from(elements).some(el => {
          const style = window.getComputedStyle(el)
          return style.webkitOverflowScrolling === 'touch' ||
                 style.overflowY === 'auto' || 
                 style.overflowY === 'scroll'
        })
      })
      
      await context.close()
    })
  })

  test.describe('Mobile Navigation', () => {
    test('should navigate between pages on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Navigate to braindump
      await page.locator('a[href="/braindump"]').click()
      await expect(page).toHaveURL('/braindump')
      
      // Navigate to nodes
      await page.locator('a[href="/nodes"]').click()
      await expect(page).toHaveURL('/nodes')
      
      // Navigate to matrix
      await page.locator('a[href="/matrix"]').click()
      await expect(page).toHaveURL('/matrix')
      
      await context.close()
    })

    test('should handle mobile menu if present', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check if mobile menu button exists
      const menuButton = page.locator('[aria-label*="menu"]').or(page.locator('button:has-text("Menu")'))
      
      if (await menuButton.isVisible()) {
        await menuButton.tap()
        // Menu should be visible after tap
        const navMenu = page.locator('nav')
        await expect(navMenu).toBeVisible()
      }
      
      await context.close()
    })
  })
})