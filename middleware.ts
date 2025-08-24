import { NextRequest, NextResponse } from 'next/server'
import { 
  validateAuthToken, 
  isPublicPath, 
  isPublicApiRoute,
  getAuthRedirectUrl, 
  getSecurityHeaders,
  logAuthEvent,
  AUTH_COOKIE_NAME 
} from './lib/auth-helpers-edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if running in Playwright test mode
  const isTestMode = process.env.PLAYWRIGHT_TEST === 'true' || 
                     process.env.TEST_MODE === 'true' ||
                     request.headers.get('x-playwright-test') === 'true'
  
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)
  
  // Create response with security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Apply security headers
  const securityHeaders = getSecurityHeaders()
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Skip auth check for public paths
  if (isPublicPath(pathname)) {
    logAuthEvent('Public path accessed', { pathname })
    return response
  }
  
  // Special handling for API routes
  if (pathname.startsWith('/api/')) {
    // Some API routes are public (like auth endpoints)
    if (isPublicApiRoute(pathname)) {
      logAuthEvent('Public API route accessed', { pathname })
      return response
    }
    
    // For protected API routes, we'll still check auth in route handlers
    // but we can add some basic validation here
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    
    if (!token) {
      logAuthEvent('API request without token', { pathname })
      // Let the API route handle the missing token error
      return response
    }
    
    // Basic token validation for API routes
    const tokenValidation = validateAuthToken(token)
    if (!tokenValidation.valid) {
      logAuthEvent('API request with invalid token', { 
        pathname, 
        reason: tokenValidation.reason 
      })
      // Let the API route handle the invalid token error
      return response
    }
    
    // Add user info to headers for API routes
    if (tokenValidation.decoded) {
      requestHeaders.set('x-user-id', tokenValidation.decoded.uid)
      requestHeaders.set('x-user-email', tokenValidation.decoded.email || '')
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  // For protected pages, verify authentication
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  
  if (!token) {
    logAuthEvent('Page request without token', { pathname, isTestMode })
    // No token, redirect to login (unless in test mode with test header)
    if (!isTestMode) {
      return NextResponse.redirect(new URL(getAuthRedirectUrl(pathname), request.url))
    }
  }
  
  // Enhanced token validation for pages
  const tokenValidation = validateAuthToken(token)
  
  if (!tokenValidation.valid || !tokenValidation.decoded) {
    logAuthEvent('Page request with invalid token', { 
      pathname, 
      reason: tokenValidation.reason 
    })
    
    // Invalid or expired token, clear it and redirect to login
    const redirectResponse = NextResponse.redirect(
      new URL(getAuthRedirectUrl(pathname), request.url)
    )
    redirectResponse.cookies.delete(AUTH_COOKIE_NAME)
    
    // Apply security headers to redirect response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value)
    })
    
    return redirectResponse
  }
  
  // Valid auth, proceed with request
  // Add user info to headers for server components
  requestHeaders.set('x-user-id', tokenValidation.decoded.uid)
  requestHeaders.set('x-user-email', tokenValidation.decoded.email || '')
  
  logAuthEvent('Authenticated page access', { 
    pathname, 
    userId: tokenValidation.decoded.uid 
  })
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}