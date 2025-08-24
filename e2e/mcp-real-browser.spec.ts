/**
 * MCP Browser Test with Real User Authentication
 * This test is designed to work with the Playwright MCP server
 * using your existing browser session
 */

import { test, expect, chromium } from '@playwright/test'

test.describe('MCP Browser Control with Real Auth', () => {
  test('navigate and interact with authenticated session', async () => {
    // For MCP: Try to connect to existing browser first
    let browser, context, page
    
    try {
      // Try connecting to existing browser with debugging port
      browser = await chromium.connectOverCDP('http://localhost:9222')
      console.log('✅ Connected to existing browser via CDP')
      
      const contexts = browser.contexts()
      context = contexts[0] || await browser.newContext()
      const pages = context.pages()
      page = pages[0] || await context.newPage()
    } catch (error) {
      console.log('⚠️  Could not connect to existing browser, using MCP browser')
      // Fallback to regular Playwright browser (for MCP control)
      browser = await chromium.launch({ headless: false })
      context = await browser.newContext()
      page = await context.newPage()
      
      // The MCP server should have authentication set up
      console.log('Using MCP browser - ensure authentication is configured')
    }
    
    // Navigate to the app
    await page.goto('http://localhost:3000/journal')
    await page.waitForLoadState('networkidle')
    
    // Check authentication status
    const isAuthenticated = !page.url().includes('/login')
    console.log('Authentication status:', isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated')
    
    if (isAuthenticated) {
      // We're logged in - interact with the journal
      console.log('📓 Accessing journal with real user data...')
      
      // Wait for journal entries to load
      await page.waitForSelector('[data-testid="journal-entry"], [data-testid="no-entries"]', {
        timeout: 10000
      })
      
      // Check what we have
      const hasEntries = await page.locator('[data-testid="journal-entry"]').count() > 0
      
      if (hasEntries) {
        console.log('✅ Found journal entries')
        
        // Get all entry summaries
        const summaries = await page.locator('[data-testid="journal-summary"]').allTextContents()
        console.log(`📝 ${summaries.length} summaries found`)
        summaries.slice(0, 3).forEach((summary, i) => {
          console.log(`  ${i + 1}. ${summary.substring(0, 50)}...`)
        })
        
        // Test interaction - open first entry
        await page.locator('[data-testid="journal-entry"]').first().click()
        
        // Wait for modal
        const modal = page.locator('[data-testid="journal-modal"]')
        await expect(modal).toBeVisible({ timeout: 5000 })
        console.log('✅ Modal opened successfully')
        
        // Get full content sections
        const sections = ['gratitude', 'daily-quest', 'victories', 'lessons']
        for (const section of sections) {
          const content = await modal.locator(`[data-testid="${section}-content"]`).textContent().catch(() => null)
          if (content) {
            console.log(`📌 ${section}:`, content.substring(0, 100))
          }
        }
        
        // Close modal
        await modal.locator('[aria-label="Close"]').click()
        await expect(modal).not.toBeVisible()
      } else {
        console.log('📭 No journal entries found')
        const noEntriesMessage = await page.locator('[data-testid="no-entries"]').textContent()
        console.log('Message:', noEntriesMessage)
      }
    } else {
      console.log('🔐 Redirected to login - authentication required')
      console.log('To use real authentication:')
      console.log('1. Start Edge with: --remote-debugging-port=9222')
      console.log('2. Log in to Brain Space in that browser')
      console.log('3. Run this test again')
    }
  })
})