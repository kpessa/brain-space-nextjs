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

      process.exit(0)
    }
  }
  
  // Ensure storage state directory exists
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true })
  }

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

    await page.goto('http://localhost:3000/login')
    
    // Wait for Google sign-in button and click it

    await page.waitForSelector('button:has-text("Continue with Google")', { timeout: 30000 })

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

      // Wait a bit for all cookies to be set
      await page.waitForTimeout(2000)
      
      // Get the current URL
      const currentUrl = page.url()

      // Save the storage state

      await context.storageState({ path: REAL_USER_STATE_PATH })

      // Get some info about what was saved
      const cookies = await context.cookies()
      const localStorage = await page.evaluate(() => Object.keys(window.localStorage))

      // Look for Firebase auth cookie
      const authCookie = cookies.find(c => c.name === 'firebase-auth-token' || c.name === '__session')
      if (authCookie) {

      }

    } catch (error) {

    }
    
  } catch (error) {

  } finally {

    await browser.close()
  }
}

// Run the setup
setupRealAuthentication().catch(console.error)