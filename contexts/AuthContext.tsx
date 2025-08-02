'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  AuthError
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { googleCalendarService } from '@/services/googleCalendar'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signUp: (email: string, password: string) => Promise<{ error?: Error }>
  isOfflineMode: boolean
  // Google Calendar specific methods
  connectGoogleCalendar: () => Promise<boolean>
  disconnectGoogleCalendar: () => Promise<void>
  isGoogleCalendarConnected: () => boolean
  refreshGoogleCalendarAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [googleCalendarReady, setGoogleCalendarReady] = useState(false)
  
  // Sync with Zustand store
  const { setUser: setStoreUser, setLoading: setStoreLoading } = useAuthStore()

  // Helper function to set auth cookie
  const setAuthCookie = async (user: User) => {
    try {
      const idToken = await user.getIdToken()
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      })
    } catch (error) {
      console.error('Failed to set auth cookie:', error)
    }
  }

  // Helper function to clear auth cookie
  const clearAuthCookie = async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to clear auth cookie:', error)
    }
  }

  useEffect(() => {
    console.log('[AuthContext] useEffect initialized', {
      timestamp: new Date().toISOString(),
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
    })

    // Skip redirect check if we're on the auth handler page
    // The handler page will manage its own auth flow
    const isAuthHandlerPage = typeof window !== 'undefined' && 
      window.location.pathname === '/__/auth/handler'
    
    if (!isAuthHandlerPage) {
      // Check for redirect result only if we're NOT on the auth handler page
      getRedirectResult(auth)
        .then(async (result) => {
          if (result && result.user) {
            console.log('[AuthContext] Redirect result user found', {
              userEmail: result.user.email,
              timestamp: new Date().toISOString(),
            })
            
            // Don't handle the redirect result here - let onAuthStateChanged handle it
            // This prevents duplicate cookie setting and profile creation
          }
        })
        .catch((error) => {
          console.error('[AuthContext] Redirect result error:', error)
          // Clear any redirect errors to prevent loops
          if (error.code === 'auth/redirect-cancelled-by-user') {
          }
        })
    }

    // Check offline status
    const handleOnline = () => setIsOfflineMode(false)
    const handleOffline = () => setIsOfflineMode(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial offline status
    setIsOfflineMode(!navigator.onLine)

    let unsubscribe: () => void = () => {}
    let hasSetCookie = false // Track if we've already set the cookie

    try {
      // Listen for auth changes
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('[AuthContext] Auth state changed', {
          hasUser: !!firebaseUser,
          userEmail: firebaseUser?.email,
          hasSetCookie,
          timestamp: new Date().toISOString(),
        })

        if (firebaseUser) {
          setUser(firebaseUser)
          
          // Only set cookie if we haven't already done so
          // This prevents duplicate cookie setting from redirect flow
          if (!hasSetCookie && !isAuthHandlerPage) {
            hasSetCookie = true
            await setAuthCookie(firebaseUser)

            // Create or update user profile in Firestore
            try {
              const userRef = doc(db, 'users', firebaseUser.uid, 'profile', 'data')
              const userDoc = await getDoc(userRef)

              if (!userDoc.exists()) {
                await setDoc(userRef, {
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
              }

              // Initialize Google Calendar service for authenticated user
              await initializeGoogleCalendar()
            } catch (error) {
              console.error('[AuthContext] Error creating user profile:', error)
            }
          }
        } else {
          setUser(null)
          hasSetCookie = false
          // Clear auth cookie when user signs out
          await clearAuthCookie()
        }
        
        setLoading(false)
        setStoreUser(firebaseUser)
        setStoreLoading(false)
      })
    } catch (error) {
      console.error('[AuthContext] Error setting up auth listener:', error)
      setLoading(false)
      setStoreLoading(false)
    }

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setStoreUser, setStoreLoading])

  // Initialize Google Calendar service when user is authenticated
  const initializeGoogleCalendar = async () => {
    try {
      console.log('[AuthContext] Initializing Google Calendar service...')
      
      // Wait for Google Calendar service to be ready
      let attempts = 0
      const maxAttempts = 10
      
      while (!googleCalendarService.isReady() && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500))
        attempts++
      }
      
      if (googleCalendarService.isReady()) {
        // Try to authorize with existing token (immediate mode)
        const hasValidToken = await googleCalendarService.authorize(true)
        setGoogleCalendarReady(true)
        
        if (hasValidToken) {
          console.log('[AuthContext] Google Calendar already authorized with existing token')
        } else {
          console.log('[AuthContext] Google Calendar ready but no valid token found')
        }
      } else {
        console.warn('[AuthContext] Google Calendar service failed to initialize after 5 seconds')
        setGoogleCalendarReady(false)
      }
    } catch (error) {
      console.error('[AuthContext] Error initializing Google Calendar:', error)
      setGoogleCalendarReady(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)

      // Create initial user profile
      const userRef = doc(db, 'users', user.uid, 'profile', 'data')
      await setDoc(userRef, {
        id: user.uid,
        email: user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signInWithGoogle = async () => {
    console.log('[AuthContext] Initiating Google sign-in', {
      timestamp: new Date().toISOString(),
      isProduction: process.env.NODE_ENV === 'production',
    })
    
    try {
      const provider = new GoogleAuthProvider()
      // Request calendar scopes for seamless calendar integration
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly')
      provider.addScope('https://www.googleapis.com/auth/calendar.events')

      // Check if we're in production and should use redirect instead of popup
      const isProduction = process.env.NODE_ENV === 'production'
      const shouldUseRedirect = isProduction && typeof window !== 'undefined' && 
        (window.location.hostname.includes('vercel.app') || 
         window.location.hostname !== 'localhost')

      if (shouldUseRedirect) {
        // Use redirect flow in production to avoid COOP issues
        await signInWithRedirect(auth, provider)
        return
      }

      try {
        // Try popup first in development
        const result = await signInWithPopup(auth, provider)
        
        console.log('[AuthContext] Google sign-in popup successful', {
          userEmail: result.user.email,
          timestamp: new Date().toISOString(),
        })
        
        // Extract and store Google Calendar access token if available
        const credential = GoogleAuthProvider.credentialFromResult(result)
        if (credential?.accessToken) {
          console.log('[AuthContext] Google Calendar token received during sign-in')
          // Store the token for calendar access
          await storeGoogleCalendarToken(credential.accessToken)
        }
        
        // Don't set cookie here - let onAuthStateChanged handle it
        // This prevents duplicate cookie setting
      } catch (popupError: any) {
        // If popup blocked or COOP error, fall back to redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          await signInWithRedirect(auth, provider)
        } else {
          throw popupError
        }
      }
    } catch (error) {
      console.error('[AuthContext] Google sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Sign out from Google Calendar first
      await googleCalendarService.signOut()
      
      // Then sign out from Firebase
      await firebaseSignOut(auth)
      
      // Clear auth cookie
      await clearAuthCookie()
      
      // Reset Google Calendar state
      setGoogleCalendarReady(false)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  // Helper function to store Google Calendar token
  const storeGoogleCalendarToken = async (accessToken: string) => {
    if (!user?.uid) return
    
    try {
      const userRef = doc(db, 'users', user.uid, 'settings', 'googleCalendar')
      await setDoc(
        userRef,
        {
          google_access_token: accessToken,
          updatedAt: new Date(),
          connectedAt: new Date(),
        },
        { merge: true }
      )
      console.log('[AuthContext] Google Calendar token stored successfully')
    } catch (error) {
      console.error('[AuthContext] Failed to store Google Calendar token:', error)
    }
  }

  // Connect Google Calendar (separate from main auth)
  const connectGoogleCalendar = async (): Promise<boolean> => {
    try {
      if (!googleCalendarService.isReady()) {
        console.error('[AuthContext] Google Calendar service not ready')
        return false
      }
      
      const success = await googleCalendarService.authorize(false)
      if (success) {
        console.log('[AuthContext] Google Calendar connected successfully')
        return true
      }
      
      return false
    } catch (error) {
      console.error('[AuthContext] Failed to connect Google Calendar:', error)
      return false
    }
  }

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = async (): Promise<void> => {
    try {
      await googleCalendarService.signOut()
      console.log('[AuthContext] Google Calendar disconnected successfully')
    } catch (error) {
      console.error('[AuthContext] Failed to disconnect Google Calendar:', error)
      throw error
    }
  }

  // Check if Google Calendar is connected
  const isGoogleCalendarConnected = (): boolean => {
    return googleCalendarService.isAuthorized()
  }

  // Refresh Google Calendar authentication
  const refreshGoogleCalendarAuth = async (): Promise<boolean> => {
    try {
      // Try immediate authorization first (with existing token)
      const hasValidToken = await googleCalendarService.authorize(true)
      
      if (!hasValidToken) {
        // If no valid token, try full re-authorization
        return await googleCalendarService.authorize(false)
      }
      
      return true
    } catch (error) {
      console.error('[AuthContext] Failed to refresh Google Calendar auth:', error)
      return false
    }
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    signIn,
    signUp,
    isOfflineMode,
    // Google Calendar methods
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    isGoogleCalendarConnected,
    refreshGoogleCalendarAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Convenience hook for auth state from store (can be used anywhere)
export function useAuthState() {
  return useAuthStore()
}