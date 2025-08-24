/**
 * Test using existing browser session with real authentication
 * This connects to your currently running Edge browser
 */

import { test, expect } from '@playwright/test'
import { connectToExistingBrowser } from './connect-existing-browser'

test.describe('Using Existing Browser Session', () => {
  test('access journal with existing authentication', async () => {
    // Connect to your existing Edge browser
    const { browser, context, page } = await connectToExistingBrowser()
    
    try {
      // Navigate to the journal page
      await page.goto('http://localhost:3000/journal')
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle')
      
      // Check if we're authenticated (not redirected to login)
      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        console.log('⚠️  Not authenticated in existing browser')
        console.log('Please log in to Brain Space in your Edge browser first')
        throw new Error('Not authenticated')
      }
      
      console.log('✅ Successfully accessed journal with existing auth')
      
      // Now we can test with real data
      // Check for journal entries
      const entries = page.locator('[data-testid="journal-entry"]')
      const entryCount = await entries.count()
      console.log(`Found ${entryCount} journal entries`)
      
      if (entryCount > 0) {
        // Test the first entry
        const firstEntry = entries.first()
        
        // Check for summary content
        const summary = await firstEntry.locator('[data-testid="journal-summary"]').textContent()
        console.log('First entry summary:', summary)
        expect(summary).toBeTruthy()
        
        // Click to open modal
        await firstEntry.click()
        
        // Wait for modal to appear
        const modal = page.locator('[data-testid="journal-modal"]')
        await expect(modal).toBeVisible({ timeout: 5000 })
        
        // Check modal content
        const modalTitle = await modal.locator('[data-testid="modal-title"]').textContent()
        console.log('Modal title:', modalTitle)
        
        // Close modal
        const closeButton = modal.locator('[aria-label="Close"]')
        await closeButton.click()
        await expect(modal).not.toBeVisible()
      }
      
      // Test creating a new entry
      const newEntryButton = page.locator('button:has-text("New Entry")')
      if (await newEntryButton.isVisible()) {
        console.log('New Entry button found - journal feature working!')
      }
      
    } finally {
      // Don't close the browser - it's the user's actual browser!
      console.log('✅ Test complete - browser remains open')
    }
  })
  
  test('check real user profile data', async () => {
    const { page } = await connectToExistingBrowser()
    
    // Navigate to a page that shows user info
    await page.goto('http://localhost:3000/')
    await page.waitForLoadState('networkidle')
    
    // Check localStorage for user data
    const userData = await page.evaluate(() => {
      const firebaseUser = localStorage.getItem('firebase-user')
      if (firebaseUser) {
        return JSON.parse(firebaseUser)
      }
      return null
    })
    
    if (userData) {
      console.log('📧 User email:', userData.email)
      console.log('✅ Email verified:', userData.emailVerified)
      expect(userData.email).toBe('kpessa@gmail.com')
    } else {
      console.log('No user data in localStorage - checking cookies...')
      
      // Check cookies
      const cookies = await page.context().cookies()
      const authCookie = cookies.find(c => 
        c.name === 'firebase-auth-token' || 
        c.name === '__session'
      )
      
      if (authCookie) {
        console.log('🍪 Found auth cookie:', authCookie.name)
        console.log('   Domain:', authCookie.domain)
        console.log('   Expires:', new Date(authCookie.expires * 1000).toLocaleString())
      }
    }
  })
})