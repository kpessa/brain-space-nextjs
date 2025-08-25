import '@testing-library/jest-dom'

// Add fetch polyfill for Node environment
global.fetch = require('node-fetch')

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
  db: {},
  storage: {},
}))

// Mock environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com'
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com'
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456'
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id'

// Mock Firebase Admin environment variables
process.env.FIREBASE_ADMIN_PROJECT_ID = 'test-project'
process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'test@test.com'
process.env.FIREBASE_ADMIN_PRIVATE_KEY = 'test-key'

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  cert: jest.fn(),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createSessionCookie: jest.fn(),
    verifySessionCookie: jest.fn(),
  })),
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
  })),
}))

// Mock jwks-rsa which causes import errors
jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn(),
  hapiJwt2Key: jest.fn(),
  expressJwtSecret: jest.fn(),
  koaJwt2Key: jest.fn(),
  passportJwtSecret: jest.fn(),
}))

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
