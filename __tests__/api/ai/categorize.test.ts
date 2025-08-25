// Mock firebase-admin before importing route
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  cert: jest.fn(),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}))

jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}))

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

import { POST } from '@/app/api/ai/categorize/route'
import { NextRequest } from 'next/server'
import * as authHelpers from '@/lib/auth-helpers'
import * as validationMiddleware from '@/lib/validations/middleware'

// Mock dependencies
jest.mock('@/lib/auth-helpers')
jest.mock('@/lib/validations/middleware')

// Mock fetch for API calls
global.fetch = jest.fn()

describe('/api/ai/categorize', () => {
  const mockVerifyAuth = jest.spyOn(authHelpers, 'verifyAuth')
  const mockValidateBody = jest.spyOn(validationMiddleware, 'validateBody')
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock setup - authenticated user
    mockVerifyAuth.mockResolvedValue({
      user: { uid: 'test-user', email: 'test@example.com', name: 'Test User' },
      error: null,
      mode: 'production'
    })
    
    // Default mock setup - valid body
    mockValidateBody.mockImplementation(async (request, schema) => {
      const body = await request.json()
      return { data: body, error: null }
    })
    
    // Reset environment
    delete process.env.OPENAI_API_KEY
    delete process.env.GOOGLE_AI_API_KEY
  })

  describe('POST /api/ai/categorize', () => {
    it('should categorize thoughts with mock provider by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Buy groceries\nCall dentist\nMaybe start a blog'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories).toBeDefined()
      expect(data.suggestedCategories).toBeDefined()
      expect(data.suggestions).toBeDefined()
      
      // Mock provider should categorize based on keywords
      const taskCategory = data.categories.find((c: any) => c.name === 'Tasks')
      expect(taskCategory).toBeDefined()
      expect(taskCategory.thoughts.length).toBeGreaterThan(0)
    })

    it('should detect parent-child task relationships', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Prepare for trip:\n- Pack clothes\n- Book hotel\n- Arrange pet care'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Should have categories with hierarchical structure
      const hasParentWithChildren = data.categories.some((cat: any) => 
        cat.thoughts.some((thought: any) => 
          thought.nodeData.children && thought.nodeData.children.length > 0
        )
      )
      expect(hasParentWithChildren).toBe(true)
    })

    it('should use OpenAI provider when API key is available', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key'
      
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              categories: [{
                name: 'Tasks',
                thoughts: [{
                  text: 'Research new framework',
                  nodeData: {
                    type: 'task',
                    title: 'Research new framework',
                    description: 'Research new framework for the project',
                    tags: ['research', 'framework'],
                    urgency: 5,
                    importance: 7
                  }
                }],
                confidence: 0.9,
                reasoning: 'Research task identified'
              }],
              suggestedCategories: ['Tasks', 'Research', 'Development'],
              suggestions: ['Consider setting a deadline for this research']
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIResponse
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Research new framework',
          provider: 'openai'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories[0].name).toBe('Tasks')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key'
          })
        })
      )
    })

    it('should use Google AI provider when specified', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-google-key'
      
      const mockGoogleResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                categories: [{
                  name: 'Notes',
                  thoughts: [{
                    text: 'Meeting notes from standup',
                    nodeData: {
                      type: 'note',
                      title: 'Standup meeting notes',
                      description: 'Meeting notes from standup',
                      tags: ['meeting', 'standup'],
                      urgency: 2,
                      importance: 5
                    }
                  }],
                  confidence: 0.95,
                  reasoning: 'Meeting notes captured'
                }],
                suggestedCategories: ['Notes', 'Meetings', 'Work'],
                suggestions: ['Consider creating action items from the meeting']
              })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGoogleResponse
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Meeting notes from standup',
          provider: 'google'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories[0].name).toBe('Notes')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.any(Object)
      )
    })

    it('should reject unauthenticated requests', async () => {
      mockVerifyAuth.mockResolvedValue({
        user: null,
        error: 'No auth token',
        mode: 'production'
      })

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ text: 'Some text' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle validation errors', async () => {
      mockValidateBody.mockResolvedValue({
        data: null,
        error: new Response(JSON.stringify({ error: 'Text is required' }), { status: 400 })
      })

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      
      // The validation error response is returned directly
      expect(response.status).toBe(400)
    })

    it('should handle OpenAI API errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key'
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Some text to categorize',
          provider: 'openai'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // Returns 200 with fallback categorization
      expect(data.categories[0].name).toBe('Uncategorized')
      expect(data.error).toContain('OpenAI API error')
    })

    it('should fallback when provider API key not available', async () => {
      // No API key set, requesting OpenAI should use mock
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Buy milk and eggs',
          provider: 'openai' // Request OpenAI without API key
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // Returns 200 with error fallback
      expect(data.categories[0].name).toBe('Uncategorized')
      expect(data.error).toContain('OpenAI API key not configured')
    })

    it('should handle questions category', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'What should I focus on today?\nHow can I improve my productivity?'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const questionsCategory = data.categories.find((c: any) => c.name === 'Questions')
      expect(questionsCategory).toBeDefined()
      expect(questionsCategory.thoughts.length).toBeGreaterThan(0)
    })

    it('should handle ideas category', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Maybe I should start a podcast\nWhat if we tried a new approach'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const ideasCategory = data.categories.find((c: any) => c.name === 'Ideas')
      expect(ideasCategory).toBeDefined()
      expect(ideasCategory.thoughts.length).toBeGreaterThan(0)
    })

    it('should provide suggested categories', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          text: 'Random thought for testing'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.suggestedCategories).toBeDefined()
      expect(Array.isArray(data.suggestedCategories)).toBe(true)
      expect(data.suggestedCategories.length).toBeGreaterThan(0)
      expect(data.suggestedCategories).toContain('Tasks')
      expect(data.suggestedCategories).toContain('Ideas')
    })
  })
})