import { chromium, FullConfig } from '@playwright/test'
import { TEST_USERS, generateTestToken } from './helpers/auth'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {

  // Set test environment variables
  process.env.PLAYWRIGHT_TEST = 'true'
  process.env.NODE_ENV = 'test'
  process.env.TEST_MODE = 'true'
  
  // Create storage state directory if it doesn't exist
  const storageStateDir = path.join(__dirname, 'storage-states')
  if (!fs.existsSync(storageStateDir)) {
    fs.mkdirSync(storageStateDir, { recursive: true })
  }
  
  // Create authenticated state for default user
  const browser = await chromium.launch()
  
  try {
    // Create authenticated context for default user
    const defaultContext = await browser.newContext()
    const defaultPage = await defaultContext.newPage()
    
    // Set auth cookie
    const defaultToken = generateTestToken(TEST_USERS.default)
    await defaultContext.addCookies([
      {
        name: 'firebase-auth-token',
        value: defaultToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 3600,
      },
    ])
    
    // Save storage state
    await defaultContext.storageState({ 
      path: path.join(storageStateDir, 'defaultUser.json') 
    })
    await defaultContext.close()
    
    // Create authenticated context for admin user
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    
    // Set admin auth cookie
    const adminToken = generateTestToken(TEST_USERS.admin)
    await adminContext.addCookies([
      {
        name: 'firebase-auth-token',
        value: adminToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 3600,
      },
    ])
    
    // Save admin storage state
    await adminContext.storageState({ 
      path: path.join(storageStateDir, 'adminUser.json') 
    })
    await adminContext.close()

  } catch (error) {

    throw error
  } finally {
    await browser.close()
  }

}

export default globalSetup