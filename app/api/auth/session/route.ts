import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie, clearAuthCookie, verifyAuth } from '@/lib/auth-helpers'
import { 
  getAdminAuth, 
  isFirebaseAdminInitialized, 
  getFirebaseAdminStatus 
} from '@/lib/firebase-admin'
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
    if (!isFirebaseAdminInitialized()) {
      const adminStatus = getFirebaseAdminStatus()
      
      // In production, Firebase Admin SDK is required
      if (process.env.NODE_ENV === 'production') {

        return NextResponse.json(
          { 
            error: 'Authentication service unavailable',
            details: `Firebase Admin SDK initialization failed: ${adminStatus.error}`,
            adminStatus: adminStatus.mode,
          },
          { status: 503 }
        )
      }
      
      // Development fallback - set cookie without full verification

      await setAuthCookie(token)
      
      return NextResponse.json({
        success: true,
        warning: 'Development mode - token not fully verified',
        adminStatus: adminStatus.mode,
        user: {
          uid: 'dev-user',
          email: 'dev@example.com',
          displayName: 'Development User',
        }
      })
    }

    // Verify the token is valid before setting cookie
    const authResult = await verifyAuth(`Bearer ${token}`)
    
    if (authResult.error || !authResult.user) {

      return NextResponse.json(
        { 
          error: authResult.error || 'Invalid token',
          details: 'Token verification failed. Please try signing in again.',
          mode: authResult.mode,
        },
        { status: 401 }
      )
    }

    // Set secure HTTP-only cookie
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      mode: authResult.mode,
      warning: authResult.warning,
      user: {
        uid: authResult.user.uid,
        email: authResult.user.email,
        displayName: authResult.user.name,
      }
    })
  } catch (error) {

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
    if (!isFirebaseAdminInitialized()) {
      const adminStatus = getFirebaseAdminStatus()
      
      if (process.env.NODE_ENV === 'production') {

        return NextResponse.json(
          { 
            authenticated: false,
            error: 'Authentication service unavailable',
            details: `Firebase Admin SDK initialization failed: ${adminStatus.error}`,
            adminStatus: adminStatus.mode,
          },
          { status: 503 }
        )
      }
      
      // Development mode - return not authenticated
      return NextResponse.json(
        { 
          authenticated: false,
          error: 'Development mode - Firebase Admin not initialized',
          adminStatus: adminStatus.mode,
        },
        { status: 401 }
      )
    }

    const authResult = await verifyAuth()

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { 
          authenticated: false, 
          error: authResult.error || 'No valid session',
          mode: authResult.mode,
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      mode: authResult.mode,
      warning: authResult.warning,
      user: {
        uid: authResult.user.uid,
        email: authResult.user.email,
        displayName: authResult.user.name,
      }
    })
  } catch (error) {

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