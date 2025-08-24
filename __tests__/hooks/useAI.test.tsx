import { renderHook, act, waitFor } from '@testing-library/react'
import { useAI } from '@/hooks/useAI'
import { createAIService } from '@/services/ai'

// Mock the AI service module
jest.mock('@/services/ai', () => ({
  createAIService: jest.fn()
}))

describe('useAI', () => {
  const mockEnhanceNode = jest.fn()
  const mockCategorizeThoughts = jest.fn()
  const mockAIService = {
    enhanceNode: mockEnhanceNode,
    categorizeThoughts: mockCategorizeThoughts
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createAIService as jest.Mock).mockReturnValue(mockAIService)
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAI())
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.enhanceNode).toBe('function')
      expect(typeof result.current.categorizeThoughts).toBe('function')
    })

    it('should create AI service with provided provider', () => {
      renderHook(() => useAI('openai'))
      
      expect(createAIService).toHaveBeenCalledWith('openai')
    })

    it('should create AI service with default provider when none provided', () => {
      renderHook(() => useAI())
      
      expect(createAIService).toHaveBeenCalledWith(undefined)
    })
  })

  describe('enhanceNode', () => {
    const mockEnhanceResult = {
      nodeData: {
        type: 'task',
        title: 'Enhanced Task',
        description: 'Enhanced description',
        tags: ['urgent', 'work'],
        urgency: 8,
        importance: 7,
        dueDate: { date: '2024-01-15' },
        isPersonal: false
      }
    }

    it('should enhance node successfully', async () => {
      mockEnhanceNode.mockResolvedValueOnce(mockEnhanceResult)
      
      const { result } = renderHook(() => useAI())
      
      let enhanceResult: any
      await act(async () => {
        enhanceResult = await result.current.enhanceNode('Test text')
      })
      
      expect(mockEnhanceNode).toHaveBeenCalledWith('Test text')
      expect(enhanceResult).toEqual(mockEnhanceResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should set loading state during enhancement', async () => {
      let resolvePromise: (value: any) => void
      mockEnhanceNode.mockImplementation(() => 
        new Promise(resolve => {
          resolvePromise = resolve
        })
      )
      
      const { result } = renderHook(() => useAI())
      
      // Start enhancement without awaiting
      act(() => {
        result.current.enhanceNode('Test text').catch(() => {})
      })
      
      // Check loading state immediately
      expect(result.current.loading).toBe(true)
      
      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockEnhanceResult)
        // Wait a tick for state to update
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(false)
    })

    it('should handle enhancement errors', async () => {
      const error = new Error('Enhancement failed')
      mockEnhanceNode.mockRejectedValueOnce(error)
      
      const { result } = renderHook(() => useAI())
      
      await act(async () => {
        try {
          await result.current.enhanceNode('Test text')
        } catch (err) {
          expect(err).toEqual(error)
        }
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Enhancement failed')
    })

    it('should handle non-Error objects in enhancement', async () => {
      mockEnhanceNode.mockRejectedValueOnce('String error')
      
      const { result } = renderHook(() => useAI())
      
      await act(async () => {
        try {
          await result.current.enhanceNode('Test text')
        } catch (err) {
          expect(err).toBe('String error')
        }
      })
      
      expect(result.current.error).toBe('Failed to enhance node')
    })

    it('should reset error on new enhancement attempt', async () => {
      // First fail
      mockEnhanceNode.mockRejectedValueOnce(new Error('First error'))
      
      const { result } = renderHook(() => useAI())
      
      await act(async () => {
        try {
          await result.current.enhanceNode('Test text')
        } catch {}
      })
      
      expect(result.current.error).toBe('First error')
      
      // Then succeed
      mockEnhanceNode.mockResolvedValueOnce(mockEnhanceResult)
      
      await act(async () => {
        await result.current.enhanceNode('Test text 2')
      })
      
      expect(result.current.error).toBe(null)
    })
  })

  describe('categorizeThoughts', () => {
    const mockCategorizeResult = {
      categories: [
        {
          name: 'Work',
          thoughts: [
            {
              text: 'Complete project',
              nodeData: { type: 'task', title: 'Complete project' }
            }
          ],
          confidence: 0.9,
          reasoning: 'Work-related task'
        },
        {
          name: 'Personal',
          thoughts: [
            {
              text: 'Call mom',
              nodeData: { type: 'task', title: 'Call mom' }
            }
          ],
          confidence: 0.85,
          reasoning: 'Personal task'
        }
      ],
      suggestions: ['Consider breaking down the project']
    }

    it('should categorize thoughts successfully', async () => {
      mockCategorizeThoughts.mockResolvedValueOnce(mockCategorizeResult)
      
      const { result } = renderHook(() => useAI())
      
      let categorizeResult: any
      await act(async () => {
        categorizeResult = await result.current.categorizeThoughts('Complete project. Call mom.')
      })
      
      expect(mockCategorizeThoughts).toHaveBeenCalledWith('Complete project. Call mom.')
      expect(categorizeResult).toEqual(mockCategorizeResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should set loading state during categorization', async () => {
      let resolvePromise: (value: any) => void
      mockCategorizeThoughts.mockImplementation(() => 
        new Promise(resolve => {
          resolvePromise = resolve
        })
      )
      
      const { result } = renderHook(() => useAI())
      
      // Start categorization without awaiting
      act(() => {
        result.current.categorizeThoughts('Test thoughts').catch(() => {})
      })
      
      // Check loading state immediately
      expect(result.current.loading).toBe(true)
      
      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockCategorizeResult)
        // Wait a tick for state to update
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(false)
    })

    it('should handle categorization errors', async () => {
      const error = new Error('Categorization failed')
      mockCategorizeThoughts.mockRejectedValueOnce(error)
      
      const { result } = renderHook(() => useAI())
      
      await act(async () => {
        try {
          await result.current.categorizeThoughts('Test thoughts')
        } catch (err) {
          expect(err).toEqual(error)
        }
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Categorization failed')
    })

    it('should handle non-Error objects in categorization', async () => {
      mockCategorizeThoughts.mockRejectedValueOnce({ message: 'Object error' })
      
      const { result } = renderHook(() => useAI())
      
      await act(async () => {
        try {
          await result.current.categorizeThoughts('Test thoughts')
        } catch (err) {
          expect(err).toEqual({ message: 'Object error' })
        }
      })
      
      expect(result.current.error).toBe('Failed to categorize thoughts')
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent operations', async () => {
      const enhanceResult = { nodeData: { type: 'task', title: 'Enhanced' } }
      const categorizeResult = { categories: [], suggestions: [] }
      
      mockEnhanceNode.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(enhanceResult), 50))
      )
      mockCategorizeThoughts.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(categorizeResult), 50))
      )
      
      const { result } = renderHook(() => useAI())
      
      // Start both operations
      const [enhance, categorize] = await act(async () => {
        return Promise.all([
          result.current.enhanceNode('Test 1'),
          result.current.categorizeThoughts('Test 2')
        ])
      })
      
      expect(enhance).toEqual(enhanceResult)
      expect(categorize).toEqual(categorizeResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should maintain separate error states for different operations', async () => {
      mockEnhanceNode.mockRejectedValueOnce(new Error('Enhance error'))
      mockCategorizeThoughts.mockResolvedValueOnce({ categories: [], suggestions: [] })
      
      const { result } = renderHook(() => useAI())
      
      // Run enhance (will fail)
      await act(async () => {
        try {
          await result.current.enhanceNode('Test')
        } catch {}
      })
      
      expect(result.current.error).toBe('Enhance error')
      
      // Run categorize (will succeed and clear error)
      await act(async () => {
        await result.current.categorizeThoughts('Test')
      })
      
      expect(result.current.error).toBe(null)
    })
  })

  describe('Provider Changes', () => {
    it('should create new service when provider changes', () => {
      const { rerender } = renderHook(
        ({ provider }) => useAI(provider),
        { initialProps: { provider: 'openai' } }
      )
      
      expect(createAIService).toHaveBeenCalledWith('openai')
      
      rerender({ provider: 'google' })
      
      expect(createAIService).toHaveBeenCalledWith('google')
      expect(createAIService).toHaveBeenCalledTimes(2)
    })
  })

  describe('Cleanup', () => {
    it('should handle component unmounting during operation', async () => {
      mockEnhanceNode.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ nodeData: {} }), 1000))
      )
      
      const { result, unmount } = renderHook(() => useAI())
      
      // Start operation but don't wait
      act(() => {
        result.current.enhanceNode('Test').catch(() => {})
      })
      
      // Unmount while operation is in progress
      unmount()
      
      // Should not throw errors
      await waitFor(() => {
        expect(mockEnhanceNode).toHaveBeenCalled()
      })
    })
  })
})