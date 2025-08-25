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

  console.log('2. Open Developer Tools (F12)')

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  // Get cookie value from user
  const cookieValue = await new Promise<string>((resolve) => {
    rl.question('Paste the firebase-auth-token cookie value here: ', resolve)
  })
  
  if (!cookieValue || cookieValue.trim() === '') {

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

}

// Alternative: Connect to existing Edge browser with debugging port
async function connectToExistingBrowser() {

  console.log('   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222')

}

// Run the extraction
extractExistingAuth()
  .then(() => connectToExistingBrowser())
  .catch(console.error)