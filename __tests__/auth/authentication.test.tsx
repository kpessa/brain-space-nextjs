import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import FirebaseAuthHandler from '@/app/__/auth/handler/page'
import { auth } from '@/lib/firebase'

jest.mock('firebase/auth', () => ({
  getRedirectResult: jest.fn(),
  onAuthStateChanged: jest.fn(),
}))

jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}))

describe('Authentication Flow', () => {
  const mockRouter = useRouter as jest.Mock
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
    })
  })

  describe('FirebaseAuthHandler', () => {
    it('displays loading state initially', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // Don't call callback immediately to test loading state
        return jest.fn() // unsubscribe function
      })

      render(<FirebaseAuthHandler />)
      
      expect(screen.getByText('Completing sign in...')).toBeInTheDocument()
    })

    it('handles successful authentication', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn().mockResolvedValue('test-token'),
      }

      // Mock successful session creation
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // Simulate auth state change after mount
        setTimeout(() => callback(mockUser), 100)
        return jest.fn()
      })

      render(<FirebaseAuthHandler />)

      await waitFor(() => {
        expect(screen.getByText('Setting up your session...')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'test-token' }),
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
      })
    })

    it('handles authentication failure', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn().mockResolvedValue('test-token'),
      }

      // Mock failed session creation
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Session creation failed' }),
      })

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 100)
        return jest.fn()
      })

      render(<FirebaseAuthHandler />)

      await waitFor(() => {
        expect(screen.getByText('Failed to complete sign in. Please try again.')).toBeInTheDocument()
      })
    })

    it('redirects to login when no user is authenticated', async () => {
      const router = mockRouter()

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // Call with null user (not authenticated)
        setTimeout(() => callback(null), 100)
        return jest.fn()
      })

      render(<FirebaseAuthHandler />)

      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/login')
      }, { timeout: 4000 })
    })

    it('handles token generation errors', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn().mockRejectedValue(new Error('Token generation failed')),
      }

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 100)
        return jest.fn()
      })

      render(<FirebaseAuthHandler />)

      await waitFor(() => {
        expect(screen.getByText('Failed to complete sign in. Please try again.')).toBeInTheDocument()
      })
    })

    it('cleans up auth listener on unmount', () => {
      const unsubscribe = jest.fn()
      mockOnAuthStateChanged.mockReturnValue(unsubscribe)

      const { unmount } = render(<FirebaseAuthHandler />)
      
      unmount()
      
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('handles refresh button click on error', async () => {
      // Mock window.location.reload
      const originalReload = window.location.reload
      window.location.reload = jest.fn()

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(null), 100)
        return jest.fn()
      })

      render(<FirebaseAuthHandler />)

      // Wait for error state
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh page/i })
        expect(refreshButton).toBeInTheDocument()
      }, { timeout: 5000 })

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh page/i })
      fireEvent.click(refreshButton)

      expect(window.location.reload).toHaveBeenCalled()

      // Restore original reload
      window.location.reload = originalReload
    })
  })
})