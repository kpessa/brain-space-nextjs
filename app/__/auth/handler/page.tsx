'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function FirebaseAuthHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Completing sign in...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined
    let timeoutId: NodeJS.Timeout | undefined

    const handleAuthCompletion = async () => {
      try {
        // First, check for redirect result
        const result = await getRedirectResult(auth)

        // Set up auth state listener with proper cleanup
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted) return

          if (user) {
            setStatus('Setting up your session...')
            
            try {
              // Get fresh ID token
              const idToken = await user.getIdToken(true)
              
              if (!mounted) return // Check if still mounted after async operation
              
              // Set auth cookie via API
              const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: idToken }),
              })
              
              if (!mounted) return // Check again after fetch
              
              if (response.ok) {
                setStatus('Redirecting...')
                
                // Get redirect URL from params or default to journal
                const redirect = searchParams.get('redirect') || '/journal'
                
                // Use window.location for a full page reload to ensure middleware runs
                window.location.href = redirect
              } else {
                const data = await response.json()
                throw new Error(data.error || 'Failed to set session')
              }
            } catch (error) {
              if (!mounted) return
              console.error('[Auth Handler] Error setting cookie:', error)
              setError('Failed to complete sign in. Please try again.')
            }
          } else {
            // No user after waiting, redirect to login
            timeoutId = setTimeout(() => {
              if (mounted && !auth.currentUser) {
                router.push('/login')
              }
            }, 3000)
          }
        })

      } catch (error) {
        if (!mounted) return
        console.error('[Auth Handler] Error:', error)
        setError('An error occurred during sign in. Please try again.')
      }
    }

    handleAuthCompletion()

    // Cleanup function
    return () => {
      mounted = false
      if (unsubscribe) {
        unsubscribe()
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {!error ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brain-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{status}</p>
          </>
        ) : (
          <>
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-brain-600 text-white rounded-lg hover:bg-brain-700 transition-colors"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}