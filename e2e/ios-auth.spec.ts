import { test, expect, devices } from '@playwright/test'

test.describe('iOS Authentication Flow', () => {
  test.describe('Mobile Safari Authentication', () => {
    test('should display auth UI properly on iPhone', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check if auth buttons are visible and properly sized for touch
      const signInButton = page.locator('button:has-text("Sign in")').or(
        page.locator('button:has-text("Login")')
      ).or(
        page.locator('[aria-label*="sign in"]')
      )
      
      if (await signInButton.isVisible()) {
        const box = await signInButton.boundingBox()
        
        // Buttons should be at least 44x44 pixels for iOS touch targets
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
      }
      
      await context.close()
    })

    test('should handle Google Sign-In on iOS', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Look for Google Sign-In button
      const googleButton = page.locator('button:has-text("Google")').or(
        page.locator('button:has-text("Continue with Google")')
      ).or(
        page.locator('[aria-label*="Google"]')
      )
      
      if (await googleButton.isVisible()) {
        // Check button is properly sized for mobile
        const box = await googleButton.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
        
        // Test clicking the button
        await googleButton.tap()
        
        // Should either redirect or open popup
        // Note: Actual OAuth flow would require test credentials
      }
      
      await context.close()
    })

    test('should handle email/password form on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        hasTouch: true,
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Look for email input
      const emailInput = page.locator('input[type="email"]').or(
        page.locator('input[name*="email"]')
      ).or(
        page.locator('input[placeholder*="email" i]')
      )
      
      if (await emailInput.isVisible()) {
        // Test touch input
        await emailInput.tap()
        await emailInput.fill('test@example.com')
        
        // Check for autocomplete attributes (important for iOS)
        const autocomplete = await emailInput.getAttribute('autocomplete')
        expect(['email', 'username']).toContain(autocomplete)
        
        // Check input is properly sized for touch
        const box = await emailInput.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
      
      // Look for password input
      const passwordInput = page.locator('input[type="password"]').or(
        page.locator('input[name*="password"]')
      )
      
      if (await passwordInput.isVisible()) {
        await passwordInput.tap()
        await passwordInput.fill('testpassword123')
        
        // Check for autocomplete attribute
        const autocomplete = await passwordInput.getAttribute('autocomplete')
        expect(['current-password', 'new-password']).toContain(autocomplete)
        
        // Check input is properly sized for touch
        const box = await passwordInput.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
      
      await context.close()
    })

    test('should handle iOS autofill and password managers', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check for proper form structure for iOS autofill
      const form = page.locator('form').first()
      
      if (await form.isVisible()) {
        // Check for autocomplete on form
        const formAutocomplete = await form.getAttribute('autocomplete')
        
        // Check inputs have proper types and autocomplete
        const inputs = await form.locator('input').all()
        
        for (const input of inputs) {
          const type = await input.getAttribute('type')
          const autocomplete = await input.getAttribute('autocomplete')
          const name = await input.getAttribute('name')
          
          // Inputs should have proper attributes for iOS autofill
          expect(type).toBeTruthy()
          if (type === 'email' || type === 'password' || type === 'tel') {
            expect(autocomplete).toBeTruthy()
          }
          expect(name).toBeTruthy()
        }
      }
      
      await context.close()
    })

    test('should handle iOS keyboard and input focus', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        hasTouch: true,
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      const input = page.locator('input').first()
      
      if (await input.isVisible()) {
        // Tap to focus
        await input.tap()
        
        // Check if input is focused
        const isFocused = await input.evaluate(el => el === document.activeElement)
        expect(isFocused).toBe(true)
        
        // Check for iOS-specific input attributes
        const inputMode = await input.getAttribute('inputmode')
        const pattern = await input.getAttribute('pattern')
        
        // For email inputs, should have email inputmode
        const type = await input.getAttribute('type')
        if (type === 'email') {
          expect(inputMode).toBe('email')
        }
        
        // Type some text
        await input.fill('test input')
        
        // Blur by tapping outside
        await page.locator('body').tap({ position: { x: 10, y: 10 } })
        
        const isBlurred = await input.evaluate(el => el !== document.activeElement)
        expect(isBlurred).toBe(true)
      }
      
      await context.close()
    })

    test('should handle authentication redirects on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      // Try to access protected route
      await page.goto('/nodes')
      
      // Should redirect to auth or show auth prompt
      // Check URL or auth UI visibility
      const url = page.url()
      const hasAuthUI = await page.locator('button:has-text("Sign in")').or(
        page.locator('button:has-text("Login")')
      ).isVisible()
      
      // Either redirected to auth page or showing auth UI
      expect(url.includes('/auth') || url === 'http://localhost:3000/' || hasAuthUI).toBeTruthy()
      
      await context.close()
    })

    test('should persist auth state on iOS', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        storageState: undefined, // Start with clean state
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check if auth tokens would be stored properly
      await page.evaluate(() => {
        // Test localStorage
        localStorage.setItem('test-auth-token', 'test-token-123')
        
        // Test sessionStorage
        sessionStorage.setItem('test-session', 'test-session-123')
        
        // Test cookies (if used)
        document.cookie = 'test-cookie=test-value; path=/'
      })
      
      // Reload page
      await page.reload()
      
      // Check if storage persists
      const localToken = await page.evaluate(() => localStorage.getItem('test-auth-token'))
      expect(localToken).toBe('test-token-123')
      
      const sessionToken = await page.evaluate(() => sessionStorage.getItem('test-session'))
      expect(sessionToken).toBe('test-session-123')
      
      // Clean up
      await page.evaluate(() => {
        localStorage.removeItem('test-auth-token')
        sessionStorage.removeItem('test-session')
      })
      
      await context.close()
    })

    test('should handle Face ID / Touch ID prompts gracefully', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check if biometric auth is offered
      const biometricButton = page.locator('button:has-text("Face ID")').or(
        page.locator('button:has-text("Touch ID")')
      ).or(
        page.locator('[aria-label*="biometric"]')
      )
      
      // Note: Can't actually test Face ID/Touch ID in browser
      // but can verify UI handles it properly
      if (await biometricButton.isVisible()) {
        const box = await biometricButton.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
      
      await context.close()
    })

    test('should handle auth errors on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Try invalid credentials if form exists
      const emailInput = page.locator('input[type="email"]').or(
        page.locator('input[name*="email"]')
      )
      const passwordInput = page.locator('input[type="password"]')
      const submitButton = page.locator('button[type="submit"]')
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        await emailInput.fill('invalid@example.com')
        await passwordInput.fill('wrongpassword')
        
        if (await submitButton.isVisible()) {
          await submitButton.tap()
          
          // Wait for potential error message
          await page.waitForTimeout(1000)
          
          // Check for error message
          const errorMessage = page.locator('text=/error|invalid|incorrect|failed/i')
          
          // Error messages should be visible and accessible
          if (await errorMessage.isVisible()) {
            const role = await errorMessage.getAttribute('role')
            if (role) {
              expect(['alert', 'status']).toContain(role)
            }
          }
        }
      }
      
      await context.close()
    })

    test('should handle network issues during auth on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        offline: true,
      })
      const page = await context.newPage()
      
      // Load page while offline
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 })
      } catch {
        // Expected to fail or show offline message
      }
      
      // Go back online
      await context.setOffline(false)
      
      await page.goto('/')
      
      // Auth should work when back online
      const authUI = page.locator('button:has-text("Sign in")').or(
        page.locator('form')
      )
      
      await expect(authUI).toBeVisible()
      
      await context.close()
    })
  })

  test.describe('iPad Authentication', () => {
    test('should display auth UI properly on iPad', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro 11'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Check layout is optimized for tablet
      const authContainer = page.locator('form').or(
        page.locator('[role="form"]')
      ).or(
        page.locator('div:has(button:has-text("Sign in"))')
      )
      
      if (await authContainer.isVisible()) {
        const box = await authContainer.boundingBox()
        
        // On iPad, auth forms should not be full width
        // Should be centered with reasonable max width
        if (box) {
          const viewportSize = page.viewportSize()
          const formWidthRatio = box.width / viewportSize!.width
          
          // Form should not take full width on tablet
          expect(formWidthRatio).toBeLessThan(0.8)
        }
      }
      
      await context.close()
    })

    test('should handle split view and multitasking on iPad', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro 11'],
      })
      const page = await context.newPage()
      
      // Simulate split view by changing viewport
      await page.setViewportSize({ width: 400, height: 1194 })
      
      await page.goto('/')
      
      // Auth UI should still be usable in split view
      const authButton = page.locator('button:has-text("Sign in")').or(
        page.locator('button:has-text("Login")')
      )
      
      if (await authButton.isVisible()) {
        const box = await authButton.boundingBox()
        
        // Should maintain minimum touch target size
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
      }
      
      // Restore full size
      await page.setViewportSize({ width: 834, height: 1194 })
      
      await context.close()
    })
  })
})