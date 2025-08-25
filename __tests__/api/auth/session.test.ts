// Mock firebase-admin before importing anything
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  cert: jest.fn(),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createSessionCookie: jest.fn(),
  })),
}))

// Mock dependencies
jest.mock('@/lib/auth-helpers')
jest.mock('@/lib/firebase-admin')
jest.mock('@/lib/csrf')

// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(url, init = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.headers = new Headers(init.headers || {})
      this.body = init.body
      this._bodyUsed = false
    }
    
    async json() {
      if (this._bodyUsed) throw new Error('Body already read')
      this._bodyUsed = true
      return JSON.parse(this.body)
    }
    
    async text() {
      if (this._bodyUsed) throw new Error('Body already read')
      this._bodyUsed = true
      return this.body
    }
  },
  NextResponse: class {
    static json(body, init = {}) {
      return {
        body,
        status: init.status || 200,
        headers: new Headers(init.headers || {}),
        json: async () => body,
        text: async () => JSON.stringify(body)
      }
    }
  },
  Response: class {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.headers = new Headers(init.headers || {})
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }
}))

import { POST, DELETE, GET } from '@/app/api/auth/session/route'
import { NextRequest } from 'next/server'
import * as authHelpers from '@/lib/auth-helpers'
import * as firebaseAdmin from '@/lib/firebase-admin'
import * as csrf from '@/lib/csrf'

describe('/api/auth/session', () => {
  const mockSetAuthCookie = jest.spyOn(authHelpers, 'setAuthCookie')
  const mockClearAuthCookie = jest.spyOn(authHelpers, 'clearAuthCookie')
  const mockVerifyAuth = jest.spyOn(authHelpers, 'verifyAuth')
  const mockIsFirebaseAdminInitialized = jest.spyOn(firebaseAdmin, 'isFirebaseAdminInitialized')
  const mockGetFirebaseAdminStatus = jest.spyOn(firebaseAdmin, 'getFirebaseAdminStatus')
  const mockWithCSRFProtection = jest.spyOn(csrf, 'withCSRFProtection')

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default CSRF protection to pass through
    mockWithCSRFProtection.mockImplementation(async (req, handler) => {
      return handler(req)
    })
  })

  describe('POST /api/auth/session', () => {
    it('should create session with valid token', async () => {
      const mockToken = 'valid-jwt-token'
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      }

      mockIsFirebaseAdminInitialized.mockReturnValue(true)
      mockVerifyAuth.mockResolvedValue({
        user: mockUser,
        mode: 'production',
        error: null
      })
      mockSetAuthCookie.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: mockToken })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.name
      })
      expect(mockSetAuthCookie).toHaveBeenCalledWith(mockToken)
    })

    it('should reject request without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token required')
      expect(mockSetAuthCookie).not.toHaveBeenCalled()
    })

    it('should reject invalid token', async () => {
      mockIsFirebaseAdminInitialized.mockReturnValue(true)
      mockVerifyAuth.mockResolvedValue({
        user: null,
        error: 'Invalid token signature',
        mode: 'production'
      })

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token signature')
      expect(mockSetAuthCookie).not.toHaveBeenCalled()
    })

    it('should handle development mode when Firebase Admin not initialized', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockIsFirebaseAdminInitialized.mockReturnValue(false)
      mockGetFirebaseAdminStatus.mockReturnValue({
        initialized: false,
        mode: 'development',
        error: 'Missing service account'
      })
      mockSetAuthCookie.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'dev-token' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.warning).toContain('Development mode')
      expect(data.user.uid).toBe('dev-user')
      expect(mockSetAuthCookie).toHaveBeenCalledWith('dev-token')

      process.env.NODE_ENV = originalEnv
    })

    it('should fail in production when Firebase Admin not initialized', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      mockIsFirebaseAdminInitialized.mockReturnValue(false)
      mockGetFirebaseAdminStatus.mockReturnValue({
        initialized: false,
        mode: 'error',
        error: 'Missing service account'
      })

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'any-token' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Authentication service unavailable')
      expect(mockSetAuthCookie).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should handle unexpected errors', async () => {
      mockIsFirebaseAdminInitialized.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'token' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create session')
      expect(data.details).toBe('Unexpected error')
    })
  })

  describe('DELETE /api/auth/session', () => {
    it('should clear auth cookie', async () => {
      mockClearAuthCookie.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockClearAuthCookie).toHaveBeenCalled()
    })

    it('should handle clear cookie errors', async () => {
      mockClearAuthCookie.mockRejectedValue(new Error('Cookie error'))

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete session')
    })
  })

  describe('GET /api/auth/session', () => {
    it('should return authenticated user', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      }

      mockIsFirebaseAdminInitialized.mockReturnValue(true)
      mockVerifyAuth.mockResolvedValue({
        user: mockUser,
        mode: 'production',
        error: null
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authenticated).toBe(true)
      expect(data.user).toEqual({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.name
      })
    })

    it('should return not authenticated when no session', async () => {
      mockIsFirebaseAdminInitialized.mockReturnValue(true)
      mockVerifyAuth.mockResolvedValue({
        user: null,
        error: 'No auth token',
        mode: 'production'
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.authenticated).toBe(false)
      expect(data.error).toBe('No auth token')
    })

    it('should handle Firebase Admin not initialized in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockIsFirebaseAdminInitialized.mockReturnValue(false)
      mockGetFirebaseAdminStatus.mockReturnValue({
        initialized: false,
        mode: 'development',
        error: 'Missing config'
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.authenticated).toBe(false)
      expect(data.error).toContain('Development mode')

      process.env.NODE_ENV = originalEnv
    })

    it('should fail in production when Firebase Admin not initialized', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      mockIsFirebaseAdminInitialized.mockReturnValue(false)
      mockGetFirebaseAdminStatus.mockReturnValue({
        initialized: false,
        mode: 'error',
        error: 'Missing service account'
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.authenticated).toBe(false)
      expect(data.error).toBe('Authentication service unavailable')

      process.env.NODE_ENV = originalEnv
    })

    it('should handle unexpected errors', async () => {
      mockIsFirebaseAdminInitialized.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.authenticated).toBe(false)
      expect(data.error).toBe('Failed to check session')
      expect(data.details).toBe('Database connection failed')
    })
  })

  describe('CSRF Protection', () => {
    it('should apply CSRF protection to POST requests', async () => {
      mockWithCSRFProtection.mockImplementation(async (req, handler) => {
        // Simulate CSRF check failure
        return new Response(JSON.stringify({ error: 'CSRF token invalid' }), {
          status: 403
        })
      })

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'token' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('CSRF token invalid')
      expect(mockSetAuthCookie).not.toHaveBeenCalled()
    })

    it('should apply CSRF protection to DELETE requests', async () => {
      mockWithCSRFProtection.mockImplementation(async (req, handler) => {
        return new Response(JSON.stringify({ error: 'CSRF token missing' }), {
          status: 403
        })
      })

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('CSRF token missing')
      expect(mockClearAuthCookie).not.toHaveBeenCalled()
    })
  })
})