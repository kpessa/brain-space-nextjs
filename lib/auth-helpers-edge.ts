// Edge-compatible auth helpers (no Firebase Admin SDK)
import { jwtDecode } from 'jwt-decode'

export const AUTH_COOKIE_NAME = 'firebase-auth-token'

/**
 * Log authentication events for monitoring
 * Only logs in development or when explicitly enabled
 */
export function logAuthEvent(event: string, details?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development' || process.env.LOG_AUTH_EVENTS === 'true') {
    console.log(`[Edge Auth] ${event}`, details ? JSON.stringify(details, null, 2) : '')
  }
}

/**
 * Basic JWT decode for Edge runtime (middleware)
 * WARNING: This does NOT verify the signature, only decodes the token
 * Full verification MUST happen in API routes with Firebase Admin SDK
 * 
 * This is a necessary compromise for Edge runtime middleware where
 * Firebase Admin SDK is not available due to Node.js API limitations
 */
export function decodeAuthToken(token: string): { uid: string; email?: string; exp: number } | null {
  try {
    // Validate token format before decode
    const parts = token.split('.')
    if (parts.length !== 3) {
      logAuthEvent('Invalid JWT format - wrong number of parts')
      return null
    }
    
    const decoded = jwtDecode<{ 
      sub?: string;
      user_id?: string; 
      email?: string; 
      exp: number;
      iat: number;
      aud: string;
      iss: string;
    }>(token)
    
    // Validate required JWT claims
    if (!decoded.exp || !decoded.iat) {
      logAuthEvent('Missing required JWT claims')
      return null
    }
    
    // Check if token is expired (with 30 second buffer)
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp < (now - 30)) {
      logAuthEvent('Token expired')
      return null
    }
    
    // Validate issuer for Firebase tokens
    const expectedIssuer = `https://securetoken.google.com/${decoded.aud}`
    if (decoded.iss !== expectedIssuer) {
      logAuthEvent('Invalid token issuer')
      return null
    }
    
    // Extract user ID (Firebase uses 'sub', some custom tokens use 'user_id')
    const uid = decoded.sub || decoded.user_id
    if (!uid) {
      logAuthEvent('Missing user ID in token')
      return null
    }
    
    return {
      uid,
      email: decoded.email,
      exp: decoded.exp
    }
  } catch (error) {
    logAuthEvent('Token decode failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    return null
  }
}

/**
 * Check if a path is public (doesn't require auth)
 */
export function isPublicPath(pathname: string): boolean {
  const publicPaths = [
    '/login',
    '/api/auth',
    '/__/auth/handler',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/auth-debug',
    '/robots.txt',
    '/sitemap.xml',
  ]
  
  return publicPaths.some(path => pathname.startsWith(path))
}

/**
 * Check if running in test mode
 */
function isTestMode(): boolean {
  return process.env.PLAYWRIGHT_TEST === 'true' || 
         process.env.TEST_MODE === 'true' ||
         process.env.NODE_ENV === 'test'
}

/**
 * Enhanced token validation for Edge runtime
 * Performs additional checks beyond basic decode
 */
export function validateAuthToken(token: string): {
  valid: boolean;
  reason?: string;
  decoded?: { uid: string; email?: string; exp: number };
} {
  // Basic format validation
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing or invalid token' }
  }
  
  // In test mode, accept test tokens without full validation
  if (isTestMode() && token.startsWith('eyJ')) {
    const decoded = decodeAuthToken(token)
    if (decoded) {
      logAuthEvent('Test mode token accepted', { uid: decoded.uid })
      return { valid: true, decoded }
    }
  }
  
  if (token.length < 100) {
    return { valid: false, reason: 'Token too short' }
  }
  
  if (token.length > 4096) {
    return { valid: false, reason: 'Token too long' }
  }
  
  // Decode and validate
  const decoded = decodeAuthToken(token)
  if (!decoded) {
    return { valid: false, reason: 'Token decode failed' }
  }
  
  return { valid: true, decoded }
}

/**
 * Check if an API route should bypass auth checks
 * Some API routes handle auth internally or are public
 */
export function isPublicApiRoute(pathname: string): boolean {
  const publicApiRoutes = [
    '/api/auth/',
    '/api/health',
    '/api/status',
  ]
  
  return publicApiRoutes.some(route => pathname.startsWith(route))
}

/**
 * Get redirect URL for unauthenticated users
 */
export function getAuthRedirectUrl(currentPath: string): string {
  // Store the attempted URL to redirect back after login
  const loginPath = '/login'
  
  // Don't redirect back to login or auth pages
  if (!isPublicPath(currentPath) && currentPath !== '/') {
    return `${loginPath}?redirect=${encodeURIComponent(currentPath)}`
  }
  
  return loginPath
}

/**
 * Security headers for authentication-related responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent CSRF attacks
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Firebase Auth COOP requirements
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
  }
}