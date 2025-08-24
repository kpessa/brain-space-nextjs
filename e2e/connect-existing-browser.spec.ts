import { test, expect, devices, chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * This test connects to your existing Chrome browser session
 * 
 * SETUP INSTRUCTIONS:
 * 1. Close all Chrome windows
 * 2. Start Chrome with remote debugging:
 *    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 * 3. Sign in to http://localhost:3000 with your Google account
 * 4. Run this test to save your authentication
 */

test.describe('Connect to Existing Browser', () => {
  test('Save auth from existing Chrome session', async () => {
    try {
      // Connect to existing Chrome instance
      const browser = await chromium.connectOverCDP('http://localhost:9222')
      console.log('✅ Connected to existing Chrome browser')
      
      // Get the existing context
      const contexts = browser.contexts()
      if (contexts.length === 0) {
        throw new Error('No browser contexts found. Make sure Chrome is running with --remote-debugging-port=9222')
      }
      
      const context = contexts[0]
      const pages = context.pages()
      
      if (pages.length === 0) {
        throw new Error('No pages found. Please open http://localhost:3000 in Chrome')
      }
      
      // Find the Brain Space page or use the first page
      let page = pages.find(p => p.url().includes('localhost:3000')) || pages[0]
      
      // Navigate to the app if not already there
      if (!page.url().includes('localhost:3000')) {
        await page.goto('http://localhost:3000')
        console.log('📍 Navigated to Brain Space')
      }
      
      // Check if authenticated
      const isAuthenticated = !page.url().includes('/login')
      
      if (!isAuthenticated) {
        console.log('⚠️  Please sign in with Google in the browser window')
        console.log('   Waiting for authentication...')
        
        // Wait for redirect away from login
        await page.waitForURL((url) => !url.pathname.includes('login'), {
          timeout: 120000
        })
      }
      
      console.log('✅ User is authenticated!')
      
      // Save the storage state
      const storageDir = path.join(process.cwd(), 'e2e', 'storage-states')
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true })
      }
      
      const authFile = path.join(storageDir, 'realUser.json')
      await context.storageState({ path: authFile })
      
      console.log(`💾 Authentication saved to: ${authFile}`)
      console.log('\n✨ You can now run tests with your real account:')
      console.log('   pnpm exec playwright test --project="Mobile Safari" e2e/authenticated-tests.spec.ts')
      
      // Don't close the browser since it's the user's session
      browser.close = () => Promise.resolve()
      
    } catch (error) {
      console.error('❌ Error:', error.message)
      console.log('\n📝 Instructions:')
      console.log('1. Close all Chrome windows')
      console.log('2. Run: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222')
      console.log('3. Sign in to http://localhost:3000')
      console.log('4. Run this test again')
      throw error
    }
  })
})

// Tests that use the saved authentication
test.describe('Authenticated Mobile Safari Tests', () => {
  test.skip(() => !fs.existsSync('e2e/storage-states/realUser.json'), 
    'Run "Save auth from existing Chrome session" test first')
  
  test.use({
    storageState: 'e2e/storage-states/realUser.json'
  })

  test('Browse all app pages on iPhone 13', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()
    
    const pages = [
      { route: '/journal', name: 'Journal' },
      { route: '/nodes', name: 'Nodes' },
      { route: '/matrix', name: 'Matrix' },
      { route: '/braindump', name: 'Brain Dump' },
      { route: '/timebox', name: 'Timebox' },
      { route: '/calendar', name: 'Calendar' },
      { route: '/todos', name: 'Todos' }
    ]
    
    for (const { route, name } of pages) {
      console.log(`📱 Testing ${name} on iPhone...`)
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      
      // Should not redirect to login
      await expect(page).not.toHaveURL(/.*login.*/)
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/iphone-${route.slice(1)}-authenticated.png`,
        fullPage: true 
      })
      
      console.log(`✅ ${name} works!`)
    }
    
    await context.close()
  })

  test('Browse all app pages on iPad', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro 11'],
      storageState: 'e2e/storage-states/realUser.json'
    })
    const page = await context.newPage()
    
    const pages = [
      { route: '/journal', name: 'Journal' },
      { route: '/nodes', name: 'Nodes' },
      { route: '/matrix', name: 'Matrix' }
    ]
    
    for (const { route, name } of pages) {
      console.log(`📱 Testing ${name} on iPad...`)
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      
      // Should not redirect to login
      await expect(page).not.toHaveURL(/.*login.*/)
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/ipad-${route.slice(1)}-authenticated.png`,
        fullPage: true 
      })
      
      console.log(`✅ ${name} works!`)
    }
    
    await context.close()
  })
})