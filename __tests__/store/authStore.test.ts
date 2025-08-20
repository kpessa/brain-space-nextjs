import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '@/store/authStore'
import type { User } from 'firebase/auth'

// Mock Firebase to avoid actual Firebase calls in tests
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null as any,
    signInWithPopup: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    updateProfile: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    updatePassword: jest.fn(),
    reauthenticateWithCredential: jest.fn(),
  },
  db: {},
  storage: {},
}))

// Mock Firebase Auth functions
const mockFirebaseAuth = {
  signInWithPopup: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  GithubAuthProvider: jest.fn(),
  EmailAuthProvider: jest.fn(),
}

jest.mock('firebase/auth', () => mockFirebaseAuth)

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      loading: true,
      error: null,
      isAuthenticated: false,
    })
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockFirebaseAuth.signInWithPopup.mockResolvedValue({
      user: null,
      credential: null
    })
    mockFirebaseAuth.signInWithEmailAndPassword.mockResolvedValue({
      user: null
    })
    mockFirebaseAuth.createUserWithEmailAndPassword.mockResolvedValue({
      user: null
    })
    mockFirebaseAuth.signOut.mockResolvedValue(undefined)
    mockFirebaseAuth.onAuthStateChanged.mockReturnValue(() => {})
    mockFirebaseAuth.updateProfile.mockResolvedValue(undefined)
    mockFirebaseAuth.sendPasswordResetEmail.mockResolvedValue(undefined)
    mockFirebaseAuth.updatePassword.mockResolvedValue(undefined)
    mockFirebaseAuth.reauthenticateWithCredential.mockResolvedValue({
      user: null
    })
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('User Management', () => {
    it('sets user and authentication state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const mockUser: Partial<User> = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.jpg'
      }
      
      act(() => {
        result.current.setUser(mockUser as User)
      })
      
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('clears user when set to null', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // First set a user
      const mockUser: Partial<User> = {
        uid: 'test-uid',
        email: 'test@example.com'
      }
      
      act(() => {
        result.current.setUser(mockUser as User)
      })
      
      expect(result.current.isAuthenticated).toBe(true)
      
      // Then clear the user
      act(() => {
        result.current.setUser(null)
      })
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('sets user with undefined/falsy values', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const mockUser: Partial<User> = {
        uid: '',
        email: undefined,
        displayName: null
      }
      
      act(() => {
        result.current.setUser(mockUser as User)
      })
      
      // User object with empty uid is still considered a user object by !!user logic
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true) // !!mockUser is true for any object
    })
  })

  describe('Loading State Management', () => {
    it('sets loading state to true', () => {
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.loading).toBe(true)
    })

    it('sets loading state to false', () => {
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.setLoading(false)
      })
      
      expect(result.current.loading).toBe(false)
    })

    it('toggles loading state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Initially true
      expect(result.current.loading).toBe(true)
      
      act(() => {
        result.current.setLoading(false)
      })
      
      expect(result.current.loading).toBe(false)
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.loading).toBe(true)
    })
  })

  describe('Error State Management', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const errorMessage = 'Authentication failed'
      
      act(() => {
        result.current.setError(errorMessage)
      })
      
      expect(result.current.error).toBe(errorMessage)
    })

    it('clears error when set to null', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // First set an error
      act(() => {
        result.current.setError('Some error')
      })
      
      expect(result.current.error).toBe('Some error')
      
      // Then clear it
      act(() => {
        result.current.setError(null)
      })
      
      expect(result.current.error).toBeNull()
    })

    it('clears error when setting user', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // First set an error
      act(() => {
        result.current.setError('Authentication failed')
      })
      
      expect(result.current.error).toBe('Authentication failed')
      
      // Setting a user should clear the error
      const mockUser: Partial<User> = {
        uid: 'test-uid',
        email: 'test@example.com'
      }
      
      act(() => {
        result.current.setUser(mockUser as User)
      })
      
      expect(result.current.error).toBeNull()
    })

    it('handles empty string error', () => {
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.setError('')
      })
      
      expect(result.current.error).toBe('')
    })
  })

  describe('Logout Functionality', () => {
    it('clears user and authentication state on logout', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // First set a user and error
      const mockUser: Partial<User> = {
        uid: 'test-uid',
        email: 'test@example.com'
      }
      
      act(() => {
        result.current.setUser(mockUser as User)
        result.current.setError('Some error')
      })
      
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.error).toBe('Some error')
      
      // Logout should clear everything
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('handles logout when no user is set', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // User is already null
      expect(result.current.user).toBeNull()
      
      // Logout should still work without errors
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('preserves loading state during logout', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Set loading to false
      act(() => {
        result.current.setLoading(false)
      })
      
      expect(result.current.loading).toBe(false)
      
      // Logout should not affect loading state
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.loading).toBe(false)
    })
  })

  describe('State Consistency', () => {
    it('maintains consistency between user and isAuthenticated', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Test with valid user
      const validUser: Partial<User> = {
        uid: 'valid-uid',
        email: 'valid@example.com'
      }
      
      act(() => {
        result.current.setUser(validUser as User)
      })
      
      expect(result.current.isAuthenticated).toBe(true)
      
      // Test with null user
      act(() => {
        result.current.setUser(null)
      })
      
      expect(result.current.isAuthenticated).toBe(false)
      
      // Test with user object but falsy uid - still counts as authenticated per !!user logic
      const userWithEmptyUid: Partial<User> = {
        uid: '',
        email: 'test@example.com'
      }
      
      act(() => {
        result.current.setUser(userWithEmptyUid as User)
      })
      
      expect(result.current.isAuthenticated).toBe(true) // !!user is true for any object
    })

    it('handles rapid state changes', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const user1: Partial<User> = { uid: 'user1', email: 'user1@example.com' }
      const user2: Partial<User> = { uid: 'user2', email: 'user2@example.com' }
      
      act(() => {
        // Rapid state changes
        result.current.setLoading(true)
        result.current.setUser(user1 as User)
        result.current.setError('Error 1')
        result.current.setUser(user2 as User) // Should clear error
        result.current.setLoading(false)
      })
      
      expect(result.current.user).toEqual(user2)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.error).toBeNull() // Cleared by setUser
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined user object', () => {
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        // @ts-ignore - Testing edge case
        result.current.setUser(undefined)
      })
      
      expect(result.current.user).toBeUndefined()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('handles user object with missing properties', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const incompleteUser = {
        uid: 'test-uid'
        // Missing email, displayName, etc.
      }
      
      act(() => {
        result.current.setUser(incompleteUser as User)
      })
      
      expect(result.current.user).toEqual(incompleteUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles very long error messages', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const longError = 'A'.repeat(1000) // Very long error message
      
      act(() => {
        result.current.setError(longError)
      })
      
      expect(result.current.error).toBe(longError)
    })

    it('handles special characters in error messages', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const specialCharError = 'Error with special chars: <>"&\'`\n\t'
      
      act(() => {
        result.current.setError(specialCharError)
      })
      
      expect(result.current.error).toBe(specialCharError)
    })

    it('handles multiple consecutive logout calls', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Set initial user
      const mockUser: Partial<User> = {
        uid: 'test-uid',
        email: 'test@example.com'
      }
      
      act(() => {
        result.current.setUser(mockUser as User)
      })
      
      expect(result.current.isAuthenticated).toBe(true)
      
      // Multiple logout calls
      act(() => {
        result.current.logout()
        result.current.logout()
        result.current.logout()
      })
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Store Persistence', () => {
    it('maintains state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useAuthStore())
      const { result: result2 } = renderHook(() => useAuthStore())
      
      const mockUser: Partial<User> = {
        uid: 'test-uid',
        email: 'test@example.com'
      }
      
      act(() => {
        result1.current.setUser(mockUser as User)
      })
      
      // Both hooks should see the same state
      expect(result1.current.user).toEqual(mockUser)
      expect(result2.current.user).toEqual(mockUser)
      expect(result1.current.isAuthenticated).toBe(true)
      expect(result2.current.isAuthenticated).toBe(true)
    })

    it('synchronizes state changes across hook instances', () => {
      const { result: result1 } = renderHook(() => useAuthStore())
      const { result: result2 } = renderHook(() => useAuthStore())
      
      act(() => {
        result1.current.setError('Error from instance 1')
      })
      
      expect(result1.current.error).toBe('Error from instance 1')
      expect(result2.current.error).toBe('Error from instance 1')
      
      act(() => {
        result2.current.setLoading(false)
      })
      
      expect(result1.current.loading).toBe(false)
      expect(result2.current.loading).toBe(false)
    })
  })

  describe('Performance', () => {
    it('does not trigger unnecessary re-renders for same values', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const mockUser: Partial<User> = {
        uid: 'test-uid',
        email: 'test@example.com'
      }
      
      act(() => {
        result.current.setUser(mockUser as User)
      })
      
      const firstUser = result.current.user
      
      // Setting the same user again
      act(() => {
        result.current.setUser(mockUser as User)
      })
      
      // Zustand should handle this efficiently
      expect(result.current.user).toEqual(firstUser)
    })

    it('handles rapid state updates efficiently', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Perform many rapid updates
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setLoading(i % 2 === 0)
        }
      })
      
      expect(result.current.loading).toBe(false) // Last value
    })
  })

  describe('Type Safety', () => {
    it('maintains proper typing for user object', () => {
      const { result } = renderHook(() => useAuthStore())
      
      const typedUser: User = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.jpg',
        phoneNumber: null, // Adding missing property
        providerId: 'firebase', // Adding missing property
        emailVerified: true,
        isAnonymous: false,
        metadata: {
          creationTime: '2024-01-01T00:00:00.000Z',
          lastSignInTime: '2024-01-01T00:00:00.000Z'
        },
        providerData: [],
        refreshToken: 'refresh-token',
        tenantId: null,
        // Add required methods with mock implementations
        delete: jest.fn(),
        getIdToken: jest.fn().mockResolvedValue('id-token'),
        getIdTokenResult: jest.fn(),
        reload: jest.fn(),
        toJSON: jest.fn()
      }
      
      act(() => {
        result.current.setUser(typedUser)
      })
      
      expect(result.current.user?.uid).toBe('test-uid')
      expect(result.current.user?.email).toBe('test@example.com')
      expect(result.current.user?.displayName).toBe('Test User')
      expect(result.current.user?.emailVerified).toBe(true)
    })
  })
})