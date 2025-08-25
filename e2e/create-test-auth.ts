/**
 * Create a test authentication state without OAuth
 * This creates a mock authenticated state for testing journal features
 */

import * as fs from 'fs'
import * as path from 'path'

const STORAGE_STATE_DIR = path.join(__dirname, 'storage-states')
const TEST_AUTH_PATH = path.join(STORAGE_STATE_DIR, 'testUser.json')

// Ensure directory exists
if (!fs.existsSync(STORAGE_STATE_DIR)) {
  fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true })
}

// Create a test authentication state
// This mimics what would be saved after real authentication
const testAuthState = {
  cookies: [
    {
      name: 'firebase-auth-token',
      value: 'test-jwt-token-for-kpessa',
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400, // 24 hours
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
            uid: 'test-user-kpessa',
            email: 'kpessa@gmail.com',
            displayName: 'Test User',
            photoURL: null,
            emailVerified: true
          })
        }
      ]
    }
  ]
}

// Write the test auth state
fs.writeFileSync(TEST_AUTH_PATH, JSON.stringify(testAuthState, null, 2))

