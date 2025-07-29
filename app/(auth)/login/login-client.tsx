'use client'

import { useState, useEffect } from 'react'
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Brain, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function LoginClient() {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Check for redirect result on mount (simplified version)
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) {
          setIsSigningIn(true)
          
          const idToken = await result.user.getIdToken()
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
          })
          
          if (response.ok) {
            const redirect = sessionStorage.getItem('auth_redirect') || searchParams.get('redirect') || '/journal'
            sessionStorage.removeItem('auth_redirect')
            window.location.href = redirect
          } else {
            const data = await response.json()
            console.error('[Login] Session API error from redirect:', data)
            setError(data.error || 'Failed to set session')
            setIsSigningIn(false)
          }
        }
      } catch (error: any) {
        console.error('[Login] Error checking redirect result:', error)
        // Don't set error state here as it might not be a real error
        // (e.g., no redirect result to handle)
      }
    }

    checkRedirectResult()
  }, [])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    setError(null)
    
    
    try {
      const provider = new GoogleAuthProvider()
      
      try {
        // Always try popup first (like the working manual auth button)
        const result = await signInWithPopup(auth, provider)
        
        
        // Get the ID token
        const idToken = await result.user.getIdToken()
        
        // Set auth cookie via API
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
        })
        
        
        if (response.ok) {
          // Redirect to intended page or journal
          const redirect = searchParams.get('redirect') || '/journal'
          window.location.href = redirect
        } else {
          const data = await response.json()
          console.error('[Login] Session API error:', data)
          throw new Error(data.error || 'Failed to set session')
        }
      } catch (popupError: any) {
        // If popup blocked, fall back to redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          
          // Store redirect URL for after auth
          const redirect = searchParams.get('redirect') || '/journal'
          sessionStorage.setItem('auth_redirect', redirect)
          
          await signInWithRedirect(auth, provider)
        } else {
          throw popupError
        }
      }
    } catch (error: any) {
      console.error('[Login] Sign in failed:', error)
      setError(error.message || 'Failed to sign in')
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Brain Space</h1>
            <Sparkles className="h-6 w-6 text-secondary" />
          </div>
          <p className="text-muted-foreground">
            Capture, organize, and explore your thoughts with AI
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isSigningIn ? (
            <>
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to our{' '}
            <a href="#" className="text-brain-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-brain-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}