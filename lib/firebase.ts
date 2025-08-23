import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Note: Firebase may log some expected errors when not using Firebase Hosting
// These can be safely ignored (e.g., looking for __/firebase/init.json)

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

try {
  // Initialize Firebase only if it hasn't been initialized
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

  // Initialize services
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)

  // Connect to emulators if enabled
  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
  
  if (useEmulators && typeof window !== 'undefined') {
    
    try {
      // @ts-ignore - emulator connection state
      if (!auth._canInitEmulator) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
      }
    } catch (error) {
      console.warn('Failed to connect to Auth emulator:', error)
    }

    try {
      // @ts-ignore
      if (!db._settings?.host?.includes('localhost')) {
        connectFirestoreEmulator(db, 'localhost', 8080)
      }
    } catch (error) {
      console.warn('Failed to connect to Firestore emulator:', error)
    }

    try {
      // @ts-ignore
      if (!storage._protocol?.includes('localhost')) {
        connectStorageEmulator(storage, 'localhost', 9199)
      }
    } catch (error) {
      console.warn('Failed to connect to Storage emulator:', error)
    }
  } else if (typeof window !== 'undefined') {

  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error)
  throw error
}

export { auth, db, storage }
export default app