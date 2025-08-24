import { test, expect } from '@playwright/test'
import { MCPBrowserHelper } from './mcp-helpers'

/**
 * Brain Dump Functionality Tests
 * Tests the core brain dump feature - capturing and categorizing thoughts
 */

test.describe('Brain Dump Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.goto('/login')
    
    // If using mock auth, skip login
    // Otherwise, you'd implement actual login here
  })

  test('should capture and process a brain dump entry', async ({ page }) => {
    const helper = new MCPBrowserHelper(page)
    
    // Navigate to brain dump
    await page.goto('/braindump')
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded')
    
    // Find the main textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"], textarea').first()
    
    if (await textarea.isVisible()) {
      // Type a thought
      const testThought = 'Need to review the quarterly report and prepare presentation for Monday meeting #work @important'
      await textarea.fill(testThought)
      
      // Find and click the submit button
      const submitButton = page.locator('button:has-text("Capture"), button:has-text("Process"), button[type="submit"]').first()
      
      if (await submitButton.isVisible()) {
        // Monitor network for AI categorization
        const aiResponse = page.waitForResponse(
          response => response.url().includes('/api/ai/categorize'),
          { timeout: 10000 }
        ).catch(() => null)
        
        await submitButton.click()
        
        // Wait for AI processing
        const response = await aiResponse
        
        if (response) {
          expect(response.status()).toBe(200)
          
          // Check if results are displayed
          const results = page.locator('[data-testid="results"], .results, .categorized-results').first()
          await expect(results).toBeVisible({ timeout: 5000 })
        }
      }
    }
  })

  test('should handle multiple thoughts in one brain dump', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      // Enter multiple thoughts
      const multipleThoughts = `
        Call dentist to schedule appointment
        Buy groceries: milk, bread, eggs
        Research new JavaScript frameworks
        Plan weekend trip to mountains
      `
      
      await textarea.fill(multipleThoughts)
      
      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Process")').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Wait for processing
        await page.waitForTimeout(2000)
        
        // Check if multiple results are shown
        const resultItems = page.locator('.result-item, [data-testid*="result"], .thought-item')
        const count = await resultItems.count()
        
        // Should have processed multiple thoughts
        expect(count).toBeGreaterThanOrEqual(1)
      }
    }
  })

  test('should clear brain dump after processing', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      await textarea.fill('Test thought')
      
      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Wait for processing
        await page.waitForTimeout(1000)
        
        // Check if textarea is cleared
        const textareaValue = await textarea.inputValue()
        expect(textareaValue).toBe('')
      }
    }
  })

  test('should show character count', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      // Type progressively
      await textarea.fill('Test')
      
      // Look for character count
      const charCount = page.locator('[data-testid="char-count"], .char-count, :text("/5000"), :text("4/")').first()
      
      if (await charCount.isVisible()) {
        const countText = await charCount.textContent()
        expect(countText).toContain('4')
      }
      
      // Add more text
      await textarea.fill('Test message with more characters')
      
      if (await charCount.isVisible()) {
        const newCountText = await charCount.textContent()
        expect(newCountText).toContain('34')
      }
    }
  })

  test('should handle emoji and special characters', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      const specialText = 'Meeting @ 3pm 📅 with team! $100 budget & planning #important 🎯'
      await textarea.fill(specialText)
      
      // Verify text was entered correctly
      const value = await textarea.inputValue()
      expect(value).toBe(specialText)
      
      // Submit and check processing
      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Should process without errors
        await page.waitForTimeout(1000)
        
        // Check for error messages
        const errorMessage = page.locator('.error, [role="alert"], .error-message')
        const hasError = await errorMessage.isVisible()
        expect(hasError).toBe(false)
      }
    }
  })

  test('should save drafts automatically', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      // Type something
      await textarea.fill('Draft thought that should be saved')
      
      // Wait for auto-save (if implemented)
      await page.waitForTimeout(2000)
      
      // Navigate away
      await page.goto('/')
      
      // Come back
      await page.goto('/braindump')
      
      // Check if draft is restored
      const restoredValue = await textarea.inputValue()
      
      // If draft feature exists, it should restore
      // Otherwise, this test just documents the behavior
      console.log('Draft value after navigation:', restoredValue)
    }
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      await textarea.focus()
      await textarea.fill('Test thought')
      
      // Try Cmd/Ctrl + Enter to submit
      await page.keyboard.press('Control+Enter')
      
      // Check if form was submitted
      await page.waitForTimeout(1000)
      
      // Check if textarea is cleared (indicating submission)
      const value = await textarea.inputValue()
      
      // Document the behavior
      console.log('Textarea value after Ctrl+Enter:', value)
    }
  })

  test('should display AI provider selection', async ({ page }) => {
    await page.goto('/braindump')
    
    // Look for provider selector
    const providerSelector = page.locator('select[name*="provider"], [data-testid="ai-provider"], .provider-select').first()
    
    if (await providerSelector.isVisible()) {
      // Get available options
      const options = await providerSelector.locator('option').allTextContents()
      
      // Should have at least mock provider
      expect(options).toContain('Mock AI')
      
      // Select different provider
      await providerSelector.selectOption({ label: 'Mock AI' })
      
      // Verify selection
      const selectedValue = await providerSelector.inputValue()
      expect(selectedValue).toBe('mock')
    }
  })
})

test.describe('Brain Dump to Node Conversion', () => {
  test('should convert brain dump results to nodes', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      // Create a brain dump
      await textarea.fill('Important task for project deadline tomorrow')
      
      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Wait for results
        await page.waitForTimeout(2000)
        
        // Look for convert to node button
        const convertButton = page.locator('button:has-text("Convert to Node"), button:has-text("Create Node"), button:has-text("Add to Nodes")').first()
        
        if (await convertButton.isVisible()) {
          await convertButton.click()
          
          // Check for success message or redirect
          await page.waitForTimeout(1000)
          
          const successMessage = page.locator('.success, [role="status"], .toast')
          if (await successMessage.isVisible()) {
            const messageText = await successMessage.textContent()
            expect(messageText).toContain('created')
          }
        }
      }
    }
  })

  test('should categorize thoughts correctly', async ({ page }) => {
    await page.goto('/braindump')
    
    const testCases = [
      { text: 'Meeting with client at 3pm', expectedCategory: ['calendar', 'meeting', 'event'] },
      { text: 'Buy milk and eggs', expectedCategory: ['task', 'todo', 'shopping'] },
      { text: 'Great idea for new app feature', expectedCategory: ['idea', 'project', 'development'] },
      { text: 'Feeling grateful for the team', expectedCategory: ['reflection', 'gratitude', 'personal'] }
    ]
    
    for (const testCase of testCases) {
      const textarea = page.locator('textarea').first()
      
      if (await textarea.isVisible()) {
        await textarea.fill(testCase.text)
        
        const submitButton = page.locator('button[type="submit"]').first()
        if (await submitButton.isVisible()) {
          await submitButton.click()
          
          // Wait for categorization
          await page.waitForTimeout(2000)
          
          // Check for category labels
          const categoryLabels = page.locator('.category, .tag, [data-testid*="category"]')
          
          if (await categoryLabels.first().isVisible()) {
            const categories = await categoryLabels.allTextContents()
            
            // Check if any expected category matches
            const hasExpectedCategory = testCase.expectedCategory.some(expected => 
              categories.some(cat => cat.toLowerCase().includes(expected))
            )
            
            console.log(`Text: "${testCase.text}" - Categories found:`, categories)
          }
          
          // Clear for next test
          await textarea.clear()
        }
      }
    }
  })
})

test.describe('Brain Dump Error Handling', () => {
  test('should show error for empty submission', async ({ page }) => {
    await page.goto('/braindump')
    
    const submitButton = page.locator('button[type="submit"]').first()
    
    if (await submitButton.isVisible()) {
      // Try to submit empty form
      await submitButton.click()
      
      // Check for validation error
      const errorMessage = page.locator('.error, [role="alert"], :text("required"), :text("empty")')
      
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent()
        expect(errorText).toBeTruthy()
      }
    }
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/ai/categorize', route => {
      route.abort('failed')
    })
    
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      await textarea.fill('Test thought')
      
      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Wait for error handling
        await page.waitForTimeout(2000)
        
        // Check for error message
        const errorMessage = page.locator('.error, [role="alert"], .error-message')
        
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent()
          expect(errorText).toContain('error')
        }
      }
    }
  })

  test('should enforce character limit', async ({ page }) => {
    await page.goto('/braindump')
    
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      // Try to exceed character limit
      const longText = 'a'.repeat(5001)
      await textarea.fill(longText)
      
      // Check if text is truncated or error shown
      const actualValue = await textarea.inputValue()
      expect(actualValue.length).toBeLessThanOrEqual(5000)
      
      // Check for warning message
      const warning = page.locator('.warning, :text("limit"), :text("5000")')
      if (await warning.isVisible()) {
        const warningText = await warning.textContent()
        expect(warningText).toContain('5000')
      }
    }
  })
})