import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie, clearAuthCookie, verifyAuth } from '@/lib/auth-helpers'
import { adminAuth } from '@/lib/firebase-admin'
import { withCSRFProtection } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/session - Set auth cookie from client-side token
 */
export async function POST(request: NextRequest) {
  return withCSRFProtection(request, async (request) => {
    try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      )
    }

    // Token received for session creation

    // Check if Firebase Admin is available
    if (!adminAuth) {

      // In development without admin SDK, we might want to allow setting the cookie
      // but in production this should fail
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { 
            error: 'Authentication service unavailable',
            details: 'Firebase Admin SDK not initialized. Please check server configuration.',
          },
          { status: 503 }
        )
      }
      
      // Development fallback - set cookie without full verification

      await setAuthCookie(token)
      
      return NextResponse.json({
        success: true,
        warning: 'Token not fully verified (development mode)',
        user: {
          uid: 'dev-user',
          email: 'dev@example.com',
          displayName: 'Development User',
        }
      })
    }

    // Verify the token is valid before setting cookie
    const { user, error } = await verifyAuth(`Bearer ${token}`)
    
    if (error || !user) {
      console.error('[Session API] Token verification failed:', error)
      return NextResponse.json(
        { 
          error: error || 'Invalid token',
          details: 'Token verification failed. Please try signing in again.',
        },
        { status: 401 }
      )
    }

    // Set secure HTTP-only cookie

    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.name,
      }
    })
  } catch (error) {
    console.error('[Session API] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
  })
}

/**
 * DELETE /api/auth/session - Clear auth cookie
 */
export async function DELETE(request: NextRequest) {
  return withCSRFProtection(request, async () => {
    try {
    await clearAuthCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
  })
}

/**
 * GET /api/auth/session - Check current session
 */
export async function GET() {
  // Check current session status

  try {
    // Check if Firebase Admin is available
    if (!adminAuth) {

      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { 
            authenticated: false,
            error: 'Authentication service unavailable',
            details: 'Firebase Admin SDK not initialized',
          },
          { status: 503 }
        )
      }
      
      // Development mode - return not authenticated
      return NextResponse.json(
        { 
          authenticated: false,
          error: 'Development mode - no Firebase Admin',
        },
        { status: 401 }
      )
    }

    const { user, error } = await verifyAuth()

    if (error || !user) {
      return NextResponse.json(
        { 
          authenticated: false, 
          error: error || 'No valid session',
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.name,
      }
    })
  } catch (error) {
    console.error('[Session API] Unexpected error in GET:', error)
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Failed to check session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}