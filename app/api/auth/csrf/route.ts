import { NextResponse } from 'next/server'
import { getCSRFToken } from '@/lib/csrf'

/**
 * GET /api/auth/csrf
 * Returns a CSRF token for the client to use in subsequent requests
 */
export async function GET() {
  try {
    const token = await getCSRFToken()
    
    return NextResponse.json({ 
      token,
      message: 'Include this token in the x-csrf-token header for POST/PUT/DELETE requests'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}