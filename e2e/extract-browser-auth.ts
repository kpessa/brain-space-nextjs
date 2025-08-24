/**
 * Extract authentication from existing browser session
 * This helps you get auth cookies from your currently logged-in browser
 */

import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const STORAGE_STATE_DIR = path.join(__dirname, 'storage-states')
const REAL_USER_STATE_PATH = path.join(STORAGE_STATE_DIR, 'realUser.json')

async function extractExistingAuth() {
  console.log('🔐 Extract Authentication from Existing Browser')
  console.log('================================================')
  console.log('')
  console.log('This script will help you extract authentication from your browser.')
  console.log('')
  console.log('📋 Instructions:')
  console.log('1. Make sure you are logged into Brain Space in your regular browser')
  console.log('2. Open Developer Tools (F12)')
  console.log('3. Go to Application/Storage tab')
  console.log('4. Find Cookies for http://localhost:3000')
  console.log('5. Look for "firebase-auth-token" or "__session" cookie')
  console.log('6. Copy the cookie value')
  console.log('')
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  // Get cookie value from user
  const cookieValue = await new Promise<string>((resolve) => {
    rl.question('Paste the firebase-auth-token cookie value here: ', resolve)
  })
  
  if (!cookieValue || cookieValue.trim() === '') {
    console.log('❌ No cookie value provided')
    rl.close()
    process.exit(1)
  }
  
  // Get user email
  const userEmail = await new Promise<string>((resolve) => {
    rl.question('Enter your email (kpessa@gmail.com): ', (answer) => {
      resolve(answer || 'kpessa@gmail.com')
    })
  })
  
  rl.close()
  
  // Ensure directory exists
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true })
  }
  
  // Create storage state with the extracted cookie
  const storageState = {
    cookies: [
      {
        name: 'firebase-auth-token',
        value: cookieValue.trim(),
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const
      }
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'firebase-user',
            value: JSON.stringify({
              email: userEmail,
              emailVerified: true
            })
          }
        ]
      }
    ]
  }
  
  // Save the storage state
  fs.writeFileSync(REAL_USER_STATE_PATH, JSON.stringify(storageState, null, 2))
  
  console.log('')
  console.log('✅ Authentication extracted successfully!')
  console.log(`📁 Saved to: ${REAL_USER_STATE_PATH}`)
  console.log('')
  console.log('You can now run tests with your real account:')
  console.log('  pnpm run test:e2e:real')
  console.log('')
  console.log('Or use the realUserPage fixture in any test!')
}

// Alternative: Connect to existing Edge browser with debugging port
async function connectToExistingBrowser() {
  console.log('')
  console.log('🌐 Alternative: Connect to Running Browser')
  console.log('==========================================')
  console.log('')
  console.log('To connect Playwright to your existing Edge browser:')
  console.log('')
  console.log('1. Close all Edge windows')
  console.log('2. Start Edge with remote debugging:')
  console.log('')
  console.log('   Windows:')
  console.log('   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222')
  console.log('')
  console.log('   Mac:')
  console.log('   /Applications/Microsoft\\ Edge.app/Contents/MacOS/Microsoft\\ Edge --remote-debugging-port=9222')
  console.log('')
  console.log('   Linux:')
  console.log('   microsoft-edge --remote-debugging-port=9222')
  console.log('')
  console.log('3. Log into Brain Space in that browser')
  console.log('4. Run this test to use that browser:')
  console.log('')
  console.log('   pnpm exec playwright test e2e/test-with-existing-browser.spec.ts')
}

// Run the extraction
extractExistingAuth()
  .then(() => connectToExistingBrowser())
  .catch(console.error)