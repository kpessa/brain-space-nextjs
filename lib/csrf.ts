import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CSRF_TOKEN_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex')
}

/**
 * Get or create CSRF token from cookies
 */
export async function getCSRFToken(): Promise<string> {
  try {
    const cookieStore = await cookies()
    const existingToken = cookieStore.get(CSRF_TOKEN_NAME)
    
    if (existingToken?.value) {
      return existingToken.value
    }
    
    // Generate new token
    const newToken = generateCSRFToken()
    
    // Set cookie with secure options
    cookieStore.set(CSRF_TOKEN_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })
    
    return newToken
  } catch (error) {
    console.error('Error getting CSRF token:', error)
    // If cookies are not available, just return a new token
    return generateCSRFToken()
  }
}

/**
 * Verify CSRF token from request
 */
export async function verifyCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF check for GET requests
  if (request.method === 'GET' || request.method === 'HEAD') {
    return true
  }
  
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value
  
  if (!cookieToken) {
    return false
  }
  
  // Check header token first (preferred method)
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  
  if (headerToken) {
    // If we have a header token, use it and skip body parsing
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    )
  }
  
  // Only check body if no header token (for backwards compatibility)
  let bodyToken: string | undefined
  try {
    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      // Clone the request to avoid consuming the body
      const clonedRequest = request.clone()
      const body = await clonedRequest.json()
      bodyToken = body._csrf
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const clonedRequest = request.clone()
      const formData = await clonedRequest.formData()
      bodyToken = formData.get('_csrf') as string
    }
  } catch {
    // Body parsing failed, ignore
  }
  
  if (!bodyToken) {
    return false
  }
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(bodyToken)
  )
}

/**
 * CSRF protection middleware for API routes
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Verify CSRF token
  const isValid = await verifyCSRFToken(request)
  
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }
  
  // Call the actual handler
  return handler(request)
}

/**
 * Hook to get CSRF token on client side
 */
export async function useCSRFToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'include'
  })
  
  if (!response.ok) {
    throw new Error('Failed to get CSRF token')
  }
  
  const data = await response.json()
  return data.token
}