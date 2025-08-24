import { Page, BrowserContext } from '@playwright/test'
import * as jwt from 'jsonwebtoken'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Test Authentication Helper
 * Provides mock authentication for Playwright tests
 */

// Test user configurations
export const TEST_USERS = {
  default: {
    uid: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  admin: {
    uid: 'admin-user-456',
    email: 'admin@example.com',
    name: 'Admin User',
    isAdmin: true,
  },
  noEmail: {
    uid: 'no-email-user-789',
    name: 'No Email User',
  },
} as const

export type TestUser = typeof TEST_USERS[keyof typeof TEST_USERS]

/**
 * Generate a mock Firebase JWT token for testing
 */
export function generateTestToken(user: TestUser = TEST_USERS.default): string {
  const now = Math.floor(Date.now() / 1000)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-project'
  
  const payload = {
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    auth_time: now,
    user_id: user.uid,
    sub: user.uid,
    iat: now,
    exp: now + 3600, // 1 hour from now
    email: user.email,
    email_verified: true,
    firebase: {
      identities: {
        email: user.email ? [user.email] : [],
      },
      sign_in_provider: 'custom',
    },
  }
  
  // Use a test secret for signing (only for tests)
  const testSecret = process.env.TEST_JWT_SECRET || 'test-secret-key-only-for-tests'
  return jwt.sign(payload, testSecret)
}

/**
 * Set authentication cookie for a page or context
 */
export async function setAuthCookie(
  target: Page | BrowserContext,
  user: TestUser = TEST_USERS.default
): Promise<void> {
  const token = generateTestToken(user)
  
  // Determine if we have a page or context
  const context = 'context' in target ? target.context() : target
  
  await context.addCookies([
    {
      name: 'firebase-auth-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    },
  ])
}

/**
 * Clear authentication for a page or context
 */
export async function clearAuth(target: Page | BrowserContext): Promise<void> {
  const context = 'context' in target ? target.context() : target
  await context.clearCookies()
}

/**
 * Authenticate and navigate to a protected route
 */
export async function authenticatedGoto(
  page: Page,
  url: string,
  user: TestUser = TEST_USERS.default
): Promise<void> {
  await setAuthCookie(page, user)
  await page.goto(url)
}

/**
 * Create an authenticated context
 */
export async function createAuthenticatedContext(
  browser: any,
  user: TestUser = TEST_USERS.default
): Promise<BrowserContext> {
  const context = await browser.newContext()
  
  // Add auth cookie to context
  const token = generateTestToken(user)
  await context.addCookies([
    {
      name: 'firebase-auth-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ])
  
  return context
}

/**
 * Mock Firebase Auth API responses
 */
export async function mockAuthEndpoints(page: Page, options?: {
  shouldFail?: boolean
  customResponse?: any
}): Promise<void> {
  await page.route('**/api/auth/**', (route) => {
    if (options?.shouldFail) {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Authentication failed',
          ...options.customResponse 
        }),
      })
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: TEST_USERS.default,
          ...options?.customResponse,
        }),
      })
    }
  })
  
  // Mock Google OAuth endpoints
  await page.route('**/accounts.google.com/**', (route) => {
    route.fulfill({
      status: 200,
      body: 'Mock Google Auth',
    })
  })
  
  // Mock Firebase Auth endpoints
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        idToken: generateTestToken(),
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
      }),
    })
  })
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout = 5000): Promise<boolean> {
  try {
    // Wait for either successful redirect or auth cookie
    await Promise.race([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout }),
      page.waitForFunction(
        () => document.cookie.includes('firebase-auth-token'),
        { timeout }
      ),
    ])
    return true
  } catch {
    return false
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies()
  return cookies.some(cookie => cookie.name === 'firebase-auth-token')
}

/**
 * Get current user from page context
 */
export async function getCurrentUser(page: Page): Promise<TestUser | null> {
  const cookies = await page.context().cookies()
  const authCookie = cookies.find(cookie => cookie.name === 'firebase-auth-token')
  
  if (!authCookie) {
    return null
  }
  
  try {
    const decoded = jwt.decode(authCookie.value) as any
    return {
      uid: decoded.sub || decoded.user_id,
      email: decoded.email,
      name: decoded.name || 'Test User',
    }
  } catch {
    return null
  }
}

/**
 * Check if real user authentication state exists
 */
export function hasRealUserAuth(): boolean {
  const realUserStatePath = path.join(__dirname, '..', 'storage-states', 'realUser.json')
  return fs.existsSync(realUserStatePath)
}

/**
 * Get real user storage state path
 */
export function getRealUserStorageStatePath(): string {
  return path.join(__dirname, '..', 'storage-states', 'realUser.json')
}

/**
 * Load real user authentication state
 */
export async function loadRealUserAuth(context: BrowserContext): Promise<boolean> {
  const statePath = getRealUserStorageStatePath()
  
  if (!fs.existsSync(statePath)) {
    console.warn('⚠️  Real user authentication state not found.')
    console.log('Run: pnpm exec ts-node e2e/setup-real-auth.ts')
    return false
  }
  
  try {
    // Load the saved storage state
    const storageState = JSON.parse(fs.readFileSync(statePath, 'utf-8'))
    
    // Apply cookies
    if (storageState.cookies) {
      await context.addCookies(storageState.cookies)
    }
    
    // Note: localStorage and sessionStorage are page-specific
    // They will be restored when navigating to the origin
    
    return true
  } catch (error) {
    console.error('Failed to load real user auth state:', error)
    return false
  }
}

/**
 * Verify if real user is authenticated
 */
export async function verifyRealUserAuth(page: Page): Promise<boolean> {
  // Navigate to a protected route
  await page.goto('/journal')
  
  // Check if we're redirected to login
  await page.waitForLoadState('networkidle')
  const url = page.url()
  
  return !url.includes('/login')
}