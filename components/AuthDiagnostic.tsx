'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export function AuthDiagnostic() {
  const [authState, setAuthState] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (user) {
        try {
          const idToken = await user.getIdToken()
          const idTokenResult = await user.getIdTokenResult()
          
          setAuthState({
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
              providerId: user.providerId,
              providerData: user.providerData
            },
            token: {
              exists: true,
              expirationTime: idTokenResult.expirationTime,
              authTime: idTokenResult.authTime,
              issuedAtTime: idTokenResult.issuedAtTime,
              signInProvider: idTokenResult.signInProvider,
              claims: idTokenResult.claims
            }
          })
        } catch (error) {

          setAuthState({ user: user, error: 'Failed to get token' })
        }
      } else {
        setAuthState(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded-lg text-xs">
      <h3 className="font-bold mb-2">Auth Diagnostic</h3>
      {loading ? (
        <p>Loading auth state...</p>
      ) : (
        <>
          <div className="mb-4">
            <h4 className="font-semibold mb-1">Firebase Config:</h4>
            <div className="bg-white p-2 rounded">
              <div>Auth Domain: {auth.config.authDomain || 'Not set'}</div>
              <div>Project ID: {auth.config.projectId || 'Not set'}</div>
              <div>API Key: {auth.config.apiKey ? '✓ Present' : '✗ Missing'}</div>
              <div>App ID: {auth.config.appId ? '✓ Present' : '✗ Missing'}</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Auth State:</h4>
            <pre className="overflow-auto bg-white p-2 rounded">{JSON.stringify(authState, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  )
}