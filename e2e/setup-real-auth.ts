/**
 * One-time setup script for real Google account authentication
 * Run this script to authenticate with your real Google account and save the state
 * 
 * Usage: pnpm exec ts-node e2e/setup-real-auth.ts
 */

import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const STORAGE_STATE_DIR = path.join(__dirname, 'storage-states')
const REAL_USER_STATE_PATH = path.join(STORAGE_STATE_DIR, 'realUser.json')

async function setupRealAuthentication() {
  console.log('🔐 Real User Authentication Setup')
  console.log('==================================')
  console.log('This script will help you authenticate with your real Google account.')
  console.log('The authentication state will be saved locally for future test runs.')
  console.log('')
  
  // Check if storage state already exists
  if (fs.existsSync(REAL_USER_STATE_PATH)) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise<string>((resolve) => {
      rl.question('⚠️  Authentication state already exists. Overwrite? (y/N): ', resolve)
    })
    rl.close()
    
    if (answer.toLowerCase() !== 'y') {
      console.log('✅ Using existing authentication state.')
      process.exit(0)
    }
  }
  
  // Ensure storage state directory exists
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true })
  }
  
  console.log('\n📋 Instructions:')
  console.log('1. A browser window will open')
  console.log('2. Click "Continue with Google" to sign in')
  console.log('3. Complete the Google sign-in process')
  console.log('4. Once you see the journal page, the script will save your auth state')
  console.log('5. Close the browser when done\n')
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  await new Promise<void>((resolve) => {
    rl.question('Press ENTER to start...', () => {
      rl.close()
      resolve()
    })
  })
  
  // Launch browser in non-headless mode for manual authentication
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Slow down actions for visibility
  })
  
  try {
    const context = await browser.newContext({
      // Use a clean context for authentication
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    const page = await context.newPage()
    
    console.log('\n🌐 Opening Brain Space login page...')
    await page.goto('http://localhost:3000/login')
    
    // Wait for Google sign-in button and click it
    console.log('⏳ Waiting for Google sign-in button...')
    await page.waitForSelector('button:has-text("Continue with Google")', { timeout: 30000 })
    
    console.log('🖱️  Please complete the Google sign-in process in the browser...')
    
    // Set up event listeners for navigation
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        console.log(`📍 Navigated to: ${frame.url()}`)
      }
    })
    
    // Wait for successful authentication
    // We'll know authentication is successful when we're redirected away from login
    try {
      await page.waitForFunction(
        () => !window.location.pathname.includes('/login'),
        { timeout: 300000 } // 5 minutes timeout for manual auth
      )
      
      console.log('\n✅ Authentication successful!')
      
      // Wait a bit for all cookies to be set
      await page.waitForTimeout(2000)
      
      // Get the current URL
      const currentUrl = page.url()
      console.log(`📍 Current page: ${currentUrl}`)
      
      // Save the storage state
      console.log('💾 Saving authentication state...')
      await context.storageState({ path: REAL_USER_STATE_PATH })
      
      console.log(`✅ Authentication state saved to: ${REAL_USER_STATE_PATH}`)
      
      // Get some info about what was saved
      const cookies = await context.cookies()
      const localStorage = await page.evaluate(() => Object.keys(window.localStorage))
      
      console.log(`\n📊 Saved authentication data:`)
      console.log(`   - Cookies: ${cookies.length}`)
      console.log(`   - LocalStorage keys: ${localStorage.length}`)
      
      // Look for Firebase auth cookie
      const authCookie = cookies.find(c => c.name === 'firebase-auth-token' || c.name === '__session')
      if (authCookie) {
        console.log(`   - Auth cookie found: ${authCookie.name}`)
      }
      
      console.log('\n✅ Setup complete! You can now run tests with your real account.')
      console.log('💡 Use the "realUserPage" fixture in your tests to access authenticated pages.')
      
    } catch (error) {
      console.error('\n❌ Authentication timeout or error:', error)
      console.log('Please try again and complete the sign-in process.')
    }
    
  } catch (error) {
    console.error('❌ Error during setup:', error)
  } finally {
    console.log('\n🔒 Closing browser...')
    await browser.close()
  }
}

// Run the setup
setupRealAuthentication().catch(console.error)