import { cookies } from 'next/headers'
import { 
  getAdminAuth, 
  isFirebaseAdminInitialized, 
  verifyFirebaseToken,
  getFirebaseAdminStatus 
} from './firebase-admin'
import { DecodedIdToken } from 'firebase-admin/auth'

export const AUTH_COOKIE_NAME = 'firebase-auth-token'
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 5 // 5 days

export interface AuthResult {
  user: DecodedIdToken | null
  error: string | null
  warning?: string
  mode?: 'production' | 'development' | 'disabled'
}

/**
 * Verify Firebase ID token from cookies or Authorization header with enhanced security
 */
export async function verifyAuth(
  authHeader?: string | null
): Promise<AuthResult> {
  try {
    let token: string | undefined

    // Check Authorization header first
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Fall back to cookie if no header token
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value
    }

    if (!token) {
      return { user: null, error: 'No auth token found' }
    }

    // Check Firebase Admin SDK status
    const adminStatus = getFirebaseAdminStatus()
    
    if (!isFirebaseAdminInitialized()) {
      // Production requires Firebase Admin SDK
      if (process.env.NODE_ENV === 'production') {

        return { 
          user: null, 
          error: 'Authentication service unavailable',
          mode: adminStatus.mode
        }
      }
      
      // Development fallback with warning
      if (process.env.NODE_ENV === 'development') {
        try {
          const developmentUser = await developmentTokenDecode(token)
          return {
            user: developmentUser,
            error: null,
            warning: 'Development mode - token not fully verified',
            mode: 'development'
          }
        } catch (error) {
          return { 
            user: null, 
            error: error instanceof Error ? error.message : 'Failed to decode token',
            mode: 'development'
          }
        }
      }
      
      return { 
        user: null, 
        error: 'Firebase Admin SDK not initialized',
        mode: adminStatus.mode
      }
    }
    
    // Use secure Firebase Admin verification
    try {
      const decodedToken = await verifyFirebaseToken(token)
      return { 
        user: decodedToken, 
        error: null,
        mode: 'production'
      }
    } catch (error) {
      // Handle specific Firebase auth errors
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed'
      
      // Log security events in production
      if (process.env.NODE_ENV === 'production') {

      }
      
      return { 
        user: null, 
        error: errorMessage,
        mode: 'production'
      }
    }
  } catch (error) {

    return { 
      user: null, 
      error: error instanceof Error ? error.message : 'Authentication failed'
    }
  }
}

/**
 * Development-only token decode (NOT FOR PRODUCTION)
 * This provides basic JWT parsing without signature verification
 */
async function developmentTokenDecode(token: string): Promise<DecodedIdToken> {
  try {
    // Basic JWT decode for development
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    
    // Check if token is expired
    const now = Date.now() / 1000
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired')
    }
    
    // Return a minimal decoded token for development
    return {
      uid: payload.sub || payload.user_id || 'dev-user',
      email: payload.email || 'dev@example.com',
      name: payload.name || 'Development User',
      email_verified: payload.email_verified ?? true,
      auth_time: payload.auth_time || Math.floor(Date.now() / 1000),
      iat: payload.iat || Math.floor(Date.now() / 1000),
      exp: payload.exp || Math.floor(Date.now() / 1000) + 3600,
      firebase: payload.firebase || { identities: {}, sign_in_provider: 'custom' },
    } as DecodedIdToken
  } catch (error) {
    throw new Error('Failed to decode development token')
  }
}

/**
 * Set auth cookie with secure settings
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  }
  
  if (process.env.NODE_ENV === 'development') {

  }
  
  cookieStore.set(AUTH_COOKIE_NAME, token, cookieOptions)
  
  if (process.env.NODE_ENV === 'development') {

  }
}

/**
 * Clear auth cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

