import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Firebase Admin SDK instance
let adminApp: App | null = null
let adminAuth: Auth | null = null
let adminDb: Firestore | null = null

// Configuration validation and initialization status
interface AdminConfig {
  projectId: string
  clientEmail?: string
  privateKey?: string
  serviceAccountKeyPath?: string
}

interface InitializationResult {
  success: boolean
  error?: string
  mode: 'production' | 'development' | 'disabled'
  details: string
}

/**
 * Get Firebase Admin configuration from environment variables
 */
function getAdminConfig(): AdminConfig | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  
  if (!projectId) {
    return null
  }

  return {
    projectId,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    serviceAccountKeyPath: process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_PATH,
  }
}

/**
 * Initialize Firebase Admin SDK with proper error handling and fallbacks
 */
function initializeFirebaseAdmin(): InitializationResult {
  try {
    // Skip if already initialized
    if (getApps().length > 0) {
      adminApp = getApps()[0] as App
      adminAuth = getAuth(adminApp)
      adminDb = getFirestore(adminApp)
      return {
        success: true,
        mode: 'production',
        details: 'Already initialized'
      }
    }

    const config = getAdminConfig()
    
    if (!config) {
      return {
        success: false,
        error: 'Missing Firebase project configuration',
        mode: 'disabled',
        details: 'FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID required'
      }
    }

    // Try service account key file first (recommended for production)
    if (config.serviceAccountKeyPath) {
      try {
        adminApp = initializeApp({
          credential: cert(config.serviceAccountKeyPath),
          projectId: config.projectId,
        })
        
        adminAuth = getAuth(adminApp)
        adminDb = getFirestore(adminApp)
        
        return {
          success: true,
          mode: 'production',
          details: 'Initialized with service account key file'
        }
      } catch (error) {

        // Fall through to try environment variables
      }
    }

    // Try environment variables (service account credentials)
    if (config.clientEmail && config.privateKey) {
      try {
        adminApp = initializeApp({
          credential: cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey: config.privateKey,
          }),
        })
        
        adminAuth = getAuth(adminApp)
        adminDb = getFirestore(adminApp)
        
        return {
          success: true,
          mode: 'production',
          details: 'Initialized with environment variables'
        }
      } catch (error) {

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown initialization error',
          mode: 'disabled',
          details: 'Invalid service account credentials in environment variables'
        }
      }
    }

    // Try Application Default Credentials (for Google Cloud environments)
    if (process.env.NODE_ENV === 'production') {
      try {
        adminApp = initializeApp({
          projectId: config.projectId,
        })
        
        adminAuth = getAuth(adminApp)
        adminDb = getFirestore(adminApp)
        
        return {
          success: true,
          mode: 'production',
          details: 'Initialized with Application Default Credentials'
        }
      } catch (error) {

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown ADC error',
          mode: 'disabled',
          details: 'No valid credentials found for production environment'
        }
      }
    }

    // Development mode - allow without credentials but warn
    if (process.env.NODE_ENV === 'development') {
      return {
        success: false,
        error: 'Development mode without Firebase Admin credentials',
        mode: 'development',
        details: 'Add Firebase service account credentials for full authentication'
      }
    }

    return {
      success: false,
      error: 'No valid Firebase Admin credentials found',
      mode: 'disabled',
      details: 'Production requires service account credentials'
    }
    
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      mode: 'disabled',
      details: 'Unexpected initialization failure'
    }
  }
}

// Initialize Firebase Admin
const initResult = initializeFirebaseAdmin()

// Log initialization result
if (process.env.NODE_ENV === 'development') {

} else if (!initResult.success) {

}

/**
 * Get Firebase Admin Auth instance
 * @returns Auth instance or null if not initialized
 */
export function getAdminAuth(): Auth | null {
  return adminAuth
}

/**
 * Get Firebase Admin Firestore instance
 * @returns Firestore instance or null if not initialized
 */
export function getAdminDb(): Firestore | null {
  return adminDb
}

/**
 * Check if Firebase Admin SDK is properly initialized
 * @returns boolean indicating initialization status
 */
export function isFirebaseAdminInitialized(): boolean {
  return initResult.success && adminAuth !== null
}

/**
 * Get Firebase Admin initialization details for debugging
 * @returns InitializationResult with status and details
 */
export function getFirebaseAdminStatus(): InitializationResult {
  return initResult
}

/**
 * Verify Firebase ID token with proper error handling
 * @param token - Firebase ID token to verify
 * @returns Promise<DecodedIdToken> or throws error
 */
export async function verifyFirebaseToken(token: string) {
  if (!adminAuth) {
    throw new Error('Firebase Admin SDK not initialized')
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Additional validation
    const now = Date.now() / 1000
    if (decodedToken.exp < now) {
      throw new Error('Token expired')
    }
    
    return decodedToken
  } catch (error) {
    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('Token expired')) {
        throw new Error('Token expired')
      }
      if (error.message.includes('Invalid token')) {
        throw new Error('Invalid token format')
      }
      if (error.message.includes('Firebase ID token has been revoked')) {
        throw new Error('Token revoked')
      }
    }
    
    throw new Error('Token verification failed')
  }
}

// Export legacy compatibility (deprecated - use getAdminAuth/getAdminDb)
export { adminAuth, adminDb }