/**
 * MCP Browser Control Helpers
 * These helpers demonstrate how to use MCP browser tools for testing
 */

import { Page } from '@playwright/test'

export class MCPBrowserHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to a URL using MCP browser control
   */
  async navigate(url: string) {
    await this.page.goto(url)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Take a screenshot with MCP browser control
   */
  async screenshot(filename: string, options?: {
    fullPage?: boolean
    element?: string
  }) {
    const screenshotOptions: any = {
      path: `test-results/${filename}`,
      fullPage: options?.fullPage ?? false
    }

    if (options?.element) {
      const element = this.page.locator(options.element).first()
      if (await element.isVisible()) {
        return await element.screenshot({ path: screenshotOptions.path })
      }
    }

    return await this.page.screenshot(screenshotOptions)
  }

  /**
   * Get accessibility snapshot
   */
  async getAccessibilitySnapshot() {
    return await this.page.accessibility.snapshot()
  }

  /**
   * Click an element with haptic feedback simulation
   */
  async clickWithHaptic(selector: string) {
    const element = this.page.locator(selector).first()
    
    if (await element.isVisible()) {
      // Add visual feedback for haptic simulation
      await this.page.evaluate((sel) => {
        const el = document.querySelector(sel)
        if (el) {
          el.classList.add('haptic-light')
          setTimeout(() => el.classList.remove('haptic-light'), 300)
        }
      }, selector)
      
      await element.click()
    }
  }

  /**
   * Type text with iOS keyboard avoidance check
   */
  async typeWithKeyboardCheck(selector: string, text: string) {
    const input = this.page.locator(selector).first()
    
    if (await input.isVisible()) {
      await input.focus()
      
      // Wait for potential keyboard avoidance scroll
      await this.page.waitForTimeout(300)
      
      // Check if input is still in viewport
      const isInViewport = await input.isIntersectingViewport()
      
      if (!isInViewport) {
        // Scroll to element if needed
        await input.scrollIntoViewIfNeeded()
      }
      
      await input.type(text)
      
      return true
    }
    
    return false
  }

  /**
   * Test responsive behavior at different viewports
   */
  async testResponsiveViewport(viewport: { width: number; height: number; name: string }) {
    await this.page.setViewportSize({ width: viewport.width, height: viewport.height })
    
    const screenshot = await this.page.screenshot({
      path: `test-results/responsive-${viewport.name.replace(/\s+/g, '-').toLowerCase()}.png`,
      fullPage: true
    })
    
    return {
      viewport,
      screenshot,
      bodyClasses: await this.page.locator('body').getAttribute('class'),
      isIOSDevice: await this.page.evaluate(() => document.body.classList.contains('ios-device'))
    }
  }

  /**
   * Monitor console messages
   */
  setupConsoleMonitoring() {
    const messages: Array<{ type: string; text: string }> = []
    
    this.page.on('console', (msg) => {
      messages.push({
        type: msg.type(),
        text: msg.text()
      })
    })
    
    return {
      getMessages: () => messages,
      clearMessages: () => messages.length = 0,
      hasErrors: () => messages.some(m => m.type === 'error'),
      hasWarnings: () => messages.some(m => m.type === 'warning')
    }
  }

  /**
   * Monitor network requests
   */
  setupNetworkMonitoring() {
    const requests: Array<{
      url: string
      method: string
      status?: number
      responseTime?: number
    }> = []
    
    this.page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        responseTime: Date.now()
      })
    })
    
    this.page.on('response', (response) => {
      const request = requests.find(r => r.url === response.url())
      if (request) {
        request.status = response.status()
        if (request.responseTime) {
          request.responseTime = Date.now() - request.responseTime
        }
      }
    })
    
    return {
      getRequests: () => requests,
      clearRequests: () => requests.length = 0,
      getFailedRequests: () => requests.filter(r => r.status && r.status >= 400),
      getSlowRequests: (threshold = 1000) => requests.filter(r => r.responseTime && r.responseTime > threshold)
    }
  }

  /**
   * Test PWA capabilities
   */
  async testPWAFeatures() {
    const features = await this.page.evaluate(() => {
      return {
        hasServiceWorker: 'serviceWorker' in navigator,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        hasAppleTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
        hasThemeColor: !!document.querySelector('meta[name="theme-color"]'),
        hasMobileWebAppCapable: !!document.querySelector('meta[name="mobile-web-app-capable"]'),
        hasAppleMobileWebAppCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]')
      }
    })
    
    return features
  }

  /**
   * Test iOS-specific features
   */
  async testIOSFeatures() {
    const features = await this.page.evaluate(() => {
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
                    (navigator.maxTouchPoints > 0 && /macintosh/.test(navigator.userAgent.toLowerCase()))
      
      return {
        isIOS,
        hasIOSClasses: document.body.classList.contains('ios-device'),
        hasNotchClasses: document.body.classList.contains('ios-notch'),
        hasStandaloneClasses: document.body.classList.contains('ios-standalone'),
        safeAreaInsets: {
          top: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'),
          bottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom'),
          left: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left'),
          right: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right')
        },
        viewportHeight: getComputedStyle(document.documentElement).getPropertyValue('--vh'),
        touchCallout: getComputedStyle(document.body).webkitTouchCallout,
        tapHighlightColor: getComputedStyle(document.body).webkitTapHighlightColor
      }
    })
    
    return features
  }

  /**
   * Test haptic feedback implementation
   */
  async testHapticFeedback() {
    const hapticSupport = await this.page.evaluate(() => {
      return {
        vibrateSupported: 'vibrate' in navigator,
        webkitSupported: !!(window as any).webkit?.messageHandlers?.haptic
      }
    })
    
    // Test different haptic patterns
    const patterns = ['light', 'medium', 'heavy', 'success', 'error']
    
    for (const pattern of patterns) {
      await this.page.evaluate((p) => {
        if ('vibrate' in navigator) {
          // Trigger vibration pattern
          const patterns: Record<string, number | number[]> = {
            light: 10,
            medium: 20,
            heavy: 30,
            success: [10, 20, 30],
            error: [50, 10, 50, 10, 50]
          }
          navigator.vibrate(patterns[p] || 10)
        }
      }, pattern)
      
      // Small delay between patterns
      await this.page.waitForTimeout(100)
    }
    
    return hapticSupport
  }

  /**
   * Test keyboard avoidance
   */
  async testKeyboardAvoidance(inputSelector: string) {
    const input = this.page.locator(inputSelector).first()
    
    if (!await input.isVisible()) {
      return { tested: false, reason: 'Input not visible' }
    }
    
    // Get initial position
    const initialPosition = await input.boundingBox()
    
    // Focus the input
    await input.focus()
    
    // Wait for potential keyboard appearance and scroll adjustment
    await this.page.waitForTimeout(500)
    
    // Get position after focus
    const focusedPosition = await input.boundingBox()
    
    // Check if element is in viewport
    const isInViewport = await input.isIntersectingViewport()
    
    return {
      tested: true,
      initialPosition,
      focusedPosition,
      isInViewport,
      didScroll: initialPosition?.y !== focusedPosition?.y
    }
  }
}

/**
 * iOS Device configurations for testing
 */
export const iOSDevices = [
  { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2 },
  { name: 'iPhone 12', width: 390, height: 844, deviceScaleFactor: 3 },
  { name: 'iPhone 12 Pro Max', width: 428, height: 926, deviceScaleFactor: 3 },
  { name: 'iPhone 14', width: 390, height: 844, deviceScaleFactor: 3 },
  { name: 'iPhone 15 Pro', width: 393, height: 852, deviceScaleFactor: 3 },
  { name: 'iPad', width: 768, height: 1024, deviceScaleFactor: 2 },
  { name: 'iPad Pro', width: 1024, height: 1366, deviceScaleFactor: 2 }
]

/**
 * Common test scenarios for iOS features
 */
export const iOSTestScenarios = {
  inputFocus: async (page: Page) => {
    const helper = new MCPBrowserHelper(page)
    const results = []
    
    // Test different input types
    const inputTypes = ['input[type="text"]', 'input[type="email"]', 'textarea', '[contenteditable="true"]']
    
    for (const selector of inputTypes) {
      const result = await helper.testKeyboardAvoidance(selector)
      results.push({ selector, ...result })
    }
    
    return results
  },
  
  hapticInteractions: async (page: Page) => {
    const helper = new MCPBrowserHelper(page)
    
    // Click all buttons with haptic feedback
    const buttons = await page.locator('button').all()
    
    for (const button of buttons) {
      const selector = await button.evaluate((el) => {
        // Generate a unique selector for the button
        if (el.id) return `#${el.id}`
        if (el.className) return `.${el.className.split(' ')[0]}`
        return 'button'
      })
      
      await helper.clickWithHaptic(selector)
      await page.waitForTimeout(100) // Small delay between clicks
    }
    
    return { buttonsClicked: buttons.length }
  },
  
  responsiveCheck: async (page: Page) => {
    const helper = new MCPBrowserHelper(page)
    const results = []
    
    for (const device of iOSDevices) {
      const result = await helper.testResponsiveViewport(device)
      results.push(result)
    }
    
    return results
  }
}