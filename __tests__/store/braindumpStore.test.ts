import { act, renderHook } from '@testing-library/react'
import { useBrainDumpStore } from '@/store/braindumpStore'
import type { BrainDumpEntry, BrainDumpNode, BrainDumpEdge } from '@/store/braindumpStore'

// Mock Firebase functions
const mockFirestore = {
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}

// Mock Firebase to avoid actual Firebase calls in tests
jest.mock('@/lib/firebase', () => ({
  db: {},
}))

jest.mock('firebase/firestore', () => mockFirestore)

// Mock the dynamic imports that the store uses
const originalImport = global.import || jest.fn()
global.import = jest.fn().mockImplementation((specifier) => {
  if (specifier === '@/lib/firebase') {
    return Promise.resolve({ db: {} })
  }
  if (specifier === 'firebase/firestore') {
    return Promise.resolve(mockFirestore)
  }
  return originalImport(specifier)
})

describe('BrainDumpStore', () => {
  const mockUserId = 'test-user-id'
  const mockDate = '2024-01-01T12:00:00.000Z'
  
  beforeEach(() => {
    // Reset store state before each test
    useBrainDumpStore.setState({
      entries: [],
      currentEntry: null,
      isLoading: false,
      error: null,
    })
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockFirestore.collection.mockReturnValue({})
    mockFirestore.query.mockReturnValue({})
    mockFirestore.orderBy.mockReturnValue({})
    mockFirestore.getDocs.mockResolvedValue({
      forEach: jest.fn()
    })
    mockFirestore.doc.mockReturnValue({})
    mockFirestore.setDoc.mockResolvedValue(undefined)
    mockFirestore.updateDoc.mockResolvedValue(undefined)
    mockFirestore.deleteDoc.mockResolvedValue(undefined)
    
    // Mock Date.now for consistent test results
    jest.spyOn(Date, 'now').mockReturnValue(new Date(mockDate).getTime())
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate)
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      expect(result.current.entries).toEqual([])
      expect(result.current.currentEntry).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Load Entries', () => {
    it('loads entries successfully', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const mockEntries = [
        {
          id: 'entry-1',
          title: 'First Entry',
          rawText: 'This is my first brain dump',
          nodes: [],
          edges: [],
          userId: mockUserId,
          createdAt: { toDate: () => new Date('2024-01-01') },
          updatedAt: { toDate: () => new Date('2024-01-01') },
        },
        {
          id: 'entry-2',
          title: 'Second Entry',
          rawText: 'Another brain dump',
          nodes: [],
          edges: [],
          userId: mockUserId,
          createdAt: { toDate: () => new Date('2024-01-02') },
          updatedAt: { toDate: () => new Date('2024-01-02') },
        }
      ]
      
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockEntries.forEach((entryData) => {
            callback({
              id: entryData.id,
              data: () => entryData
            })
          })
        }
      })
      
      await act(async () => {
        await result.current.loadEntries(mockUserId)
      })
      
      expect(result.current.entries).toHaveLength(2)
      expect(result.current.entries[0].id).toBe('entry-1')
      expect(result.current.entries[1].id).toBe('entry-2')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('handles load error', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      mockFirestore.getDocs.mockRejectedValue(new Error('Firebase error'))
      
      await act(async () => {
        await result.current.loadEntries(mockUserId)
      })
      
      expect(result.current.entries).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Firebase error')
    })

    it('handles missing user id', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      await act(async () => {
        await result.current.loadEntries('')
      })
      
      expect(result.current.error).toBe('User not authenticated')
      expect(result.current.isLoading).toBe(false)
    })

    it('sets loading state during load', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockFirestore.getDocs.mockReturnValue(promise)
      
      // Start loading and check state synchronously
      act(() => {
        result.current.loadEntries(mockUserId)
      })
      
      // Should be loading
      expect(result.current.isLoading).toBe(true)
      
      // Complete the promise
      resolvePromise!({ forEach: jest.fn() })
      
      await act(async () => {
        await promise
      })
      
      expect(result.current.isLoading).toBe(false)
    })

    it('handles entries with different timestamp formats', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const mockEntries = [
        {
          id: 'entry-1',
          title: 'Entry with Firestore timestamp',
          rawText: 'Text',
          nodes: [],
          edges: [],
          createdAt: { toDate: () => new Date('2024-01-01T00:00:00.000Z') },
          updatedAt: { toDate: () => new Date('2024-01-01T00:00:00.000Z') },
        },
        {
          id: 'entry-2',
          title: 'Entry with ISO string',
          rawText: 'Text',
          nodes: [],
          edges: [],
          createdAt: '2024-01-02T12:00:00.000Z',
          updatedAt: '2024-01-02T12:00:00.000Z',
        }
      ]
      
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockEntries.forEach((entryData) => {
            callback({
              id: entryData.id,
              data: () => entryData
            })
          })
        }
      })
      
      await act(async () => {
        await result.current.loadEntries(mockUserId)
      })
      
      expect(result.current.entries).toHaveLength(2)
      // Check that timestamps are converted to strings (exact format may vary)
      expect(typeof result.current.entries[0].createdAt).toBe('string')
      expect(typeof result.current.entries[1].createdAt).toBe('string')
      expect(result.current.entries[0].createdAt).toContain('2024-01-01')
      expect(result.current.entries[1].createdAt).toBe('2024-01-02T12:00:00.000Z')
    })
  })

  describe('Create Entry', () => {
    it('creates entry successfully', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const title = 'New Brain Dump'
      const rawText = 'This is a test brain dump with some thoughts'
      
      let createdEntry: BrainDumpEntry
      
      await act(async () => {
        createdEntry = await result.current.createEntry(title, rawText, mockUserId)
      })
      
      expect(createdEntry!).toBeDefined()
      expect(createdEntry!.title).toBe(title)
      expect(createdEntry!.rawText).toBe(rawText)
      expect(createdEntry!.userId).toBe(mockUserId)
      expect(createdEntry!.nodes).toEqual([])
      expect(createdEntry!.edges).toEqual([])
      expect(createdEntry!.id).toBe(`bd-${new Date(mockDate).getTime()}`)
      expect(createdEntry!.createdAt).toBe(mockDate)
      expect(createdEntry!.updatedAt).toBe(mockDate)
      
      // Should be added to store
      expect(result.current.entries).toHaveLength(1)
      expect(result.current.currentEntry).toEqual(createdEntry!)
      expect(result.current.error).toBeNull()
    })

    it('handles create error and rolls back', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      mockFirestore.setDoc.mockRejectedValue(new Error('Create failed'))
      
      let thrownError: Error | null = null
      
      await act(async () => {
        try {
          await result.current.createEntry('Test', 'Text', mockUserId)
        } catch (error) {
          thrownError = error as Error
        }
      })
      
      expect(thrownError).toBeInstanceOf(Error)
      expect(thrownError!.message).toBe('Create failed')
      expect(result.current.entries).toHaveLength(0) // Rolled back
      expect(result.current.currentEntry).toBeNull()
      expect(result.current.error).toBe('Create failed')
    })

    it('creates entry with empty title and text', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      let createdEntry: BrainDumpEntry
      
      await act(async () => {
        createdEntry = await result.current.createEntry('', '', mockUserId)
      })
      
      expect(createdEntry!.title).toBe('')
      expect(createdEntry!.rawText).toBe('')
      expect(result.current.entries).toHaveLength(1)
    })

    it('creates entry with special characters', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const specialTitle = 'Title with émojis 🧠 and <special> chars'
      const specialText = 'Text with\nnewlines\tand\"quotes'
      
      let createdEntry: BrainDumpEntry
      
      await act(async () => {
        createdEntry = await result.current.createEntry(specialTitle, specialText, mockUserId)
      })
      
      expect(createdEntry!.title).toBe(specialTitle)
      expect(createdEntry!.rawText).toBe(specialText)
    })
  })

  describe('Update Entry', () => {
    let testEntry: BrainDumpEntry
    
    beforeEach(() => {
      testEntry = {
        id: 'test-entry-1',
        title: 'Original Title',
        rawText: 'Original text',
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        useBrainDumpStore.setState({ 
          entries: [testEntry],
          currentEntry: testEntry 
        })
      })
    })

    it('updates entry successfully', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const updates = {
        title: 'Updated Title',
        rawText: 'Updated text content',
        type: 'topic-focused' as const,
        topicFocus: 'AI Development'
      }
      
      await act(async () => {
        await result.current.updateEntry('test-entry-1', updates)
      })
      
      const updatedEntry = result.current.entries[0]
      expect(updatedEntry.title).toBe('Updated Title')
      expect(updatedEntry.rawText).toBe('Updated text content')
      expect(updatedEntry.type).toBe('topic-focused')
      expect(updatedEntry.topicFocus).toBe('AI Development')
      expect(updatedEntry.updatedAt).toBe(mockDate)
      
      // Current entry should also be updated
      expect(result.current.currentEntry!.title).toBe('Updated Title')
      expect(result.current.error).toBeNull()
    })

    it('handles update error with rollback', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      mockFirestore.updateDoc.mockRejectedValue(new Error('Update failed'))
      
      const originalTitle = result.current.entries[0].title
      
      await act(async () => {
        await result.current.updateEntry('test-entry-1', { title: 'Failed Update' })
      })
      
      // Should maintain original state
      const entryAfterFailure = result.current.entries[0]
      expect(entryAfterFailure.title).toBe(originalTitle)
      expect(result.current.error).toBe('Update failed')
    })

    it('handles non-existent entry', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      await act(async () => {
        await result.current.updateEntry('non-existent', { title: 'Update' })
      })
      
      expect(result.current.error).toBe('Entry not found')
    })

    it('handles entry without userId', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      // Create entry without userId
      const entryWithoutUserId = { ...testEntry, userId: undefined }
      
      act(() => {
        useBrainDumpStore.setState({ entries: [entryWithoutUserId] })
      })
      
      await act(async () => {
        await result.current.updateEntry('test-entry-1', { title: 'Update' })
      })
      
      expect(result.current.error).toBe('Entry not found')
    })

    it('handles entry that exists only in currentEntry (not in entries list)', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      // Set current entry that's not in entries list
      const isolatedEntry = { ...testEntry, id: 'isolated-entry', userId: mockUserId }
      
      act(() => {
        useBrainDumpStore.setState({ 
          entries: [testEntry], // Different entry
          currentEntry: isolatedEntry 
        })
      })
      
      await act(async () => {
        await result.current.updateEntry('isolated-entry', { title: 'Updated Isolated' })
      })
      
      // Should fail with entry not found since it's not in entries list
      expect(result.current.error).toBe('Entry not found')
      // Current entry should remain unchanged
      expect(result.current.currentEntry!.title).toBe('Original Title')
      // Entries list should remain unchanged
      expect(result.current.entries[0].title).toBe('Original Title')
    })
  })

  describe('Delete Entry', () => {
    let testEntries: BrainDumpEntry[]
    
    beforeEach(() => {
      testEntries = [
        {
          id: 'entry-1',
          title: 'Entry 1',
          rawText: 'Text 1',
          nodes: [],
          edges: [],
          userId: mockUserId,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
        {
          id: 'entry-2',
          title: 'Entry 2',
          rawText: 'Text 2',
          nodes: [],
          edges: [],
          userId: mockUserId,
          createdAt: mockDate,
          updatedAt: mockDate,
        }
      ]
      
      act(() => {
        useBrainDumpStore.setState({ 
          entries: testEntries,
          currentEntry: testEntries[0]
        })
      })
    })

    it('deletes entry successfully', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      await act(async () => {
        await result.current.deleteEntry('entry-1')
      })
      
      expect(result.current.entries).toHaveLength(1)
      expect(result.current.entries[0].id).toBe('entry-2')
      expect(result.current.error).toBeNull()
    })

    it('clears current entry if it was deleted', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      await act(async () => {
        await result.current.deleteEntry('entry-1')
      })
      
      expect(result.current.currentEntry).toBeNull()
    })

    it('preserves current entry if different entry was deleted', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      await act(async () => {
        await result.current.deleteEntry('entry-2')
      })
      
      expect(result.current.currentEntry!.id).toBe('entry-1')
    })

    it('handles delete error', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      mockFirestore.deleteDoc.mockRejectedValue(new Error('Delete failed'))
      
      await act(async () => {
        await result.current.deleteEntry('entry-1')
      })
      
      // Should maintain original state
      expect(result.current.entries).toHaveLength(2)
      expect(result.current.error).toBe('Delete failed')
    })

    it('handles non-existent entry', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      await act(async () => {
        await result.current.deleteEntry('non-existent')
      })
      
      expect(result.current.error).toBe('Entry not found')
    })

    it('handles entry without userId', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const entryWithoutUserId = { ...testEntries[0], userId: undefined }
      
      act(() => {
        useBrainDumpStore.setState({ entries: [entryWithoutUserId] })
      })
      
      await act(async () => {
        await result.current.deleteEntry('entry-1')
      })
      
      expect(result.current.error).toBe('Entry not found')
    })
  })

  describe('Set Current Entry', () => {
    it('sets current entry', () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const testEntry: BrainDumpEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        result.current.setCurrentEntry(testEntry)
      })
      
      expect(result.current.currentEntry).toEqual(testEntry)
    })

    it('clears current entry when set to null', () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const testEntry: BrainDumpEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        result.current.setCurrentEntry(testEntry)
      })
      
      expect(result.current.currentEntry).toEqual(testEntry)
      
      act(() => {
        result.current.setCurrentEntry(null)
      })
      
      expect(result.current.currentEntry).toBeNull()
    })
  })

  describe('Node Operations', () => {
    let testEntry: BrainDumpEntry
    let testNode: BrainDumpNode
    
    beforeEach(() => {
      testNode = {
        id: 'node-1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: {
          label: 'Test Node',
          type: 'task',
          category: 'work',
          description: 'Test description',
          tags: ['test', 'node'],
          urgency: 7,
          importance: 8,
          confidence: 0.9,
          keywords: ['test', 'keyword'],
          sourceText: 'Original text snippet',
          textPosition: {
            line: 1,
            start: 0,
            end: 21
          }
        }
      }
      
      testEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [testNode],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        useBrainDumpStore.setState({ 
          entries: [testEntry],
          currentEntry: testEntry 
        })
      })
    })

    describe('Add Node', () => {
      it('adds node to current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        const newNode: BrainDumpNode = {
          id: 'node-2',
          type: 'default',
          position: { x: 200, y: 200 },
          data: {
            label: 'New Node',
            type: 'goal',
            urgency: 5,
            importance: 6
          }
        }
        
        await act(async () => {
          result.current.addNode(newNode)
        })
        
        expect(result.current.currentEntry!.nodes).toHaveLength(2)
        expect(result.current.currentEntry!.nodes[1]).toEqual(newNode)
        expect(mockFirestore.updateDoc).toHaveBeenCalled()
      })

      it('does nothing when no current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        act(() => {
          useBrainDumpStore.setState({ currentEntry: null })
        })
        
        const newNode: BrainDumpNode = {
          id: 'node-2',
          type: 'default',
          position: { x: 200, y: 200 },
          data: { label: 'New Node' }
        }
        
        await act(async () => {
          result.current.addNode(newNode)
        })
        
        expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
      })
    })

    describe('Update Node', () => {
      it('updates node successfully', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        const updates: Partial<BrainDumpNode> = {
          data: {
            ...testNode.data,
            label: 'Updated Node',
            urgency: 9,
            isCollapsed: true
          }
        }
        
        await act(async () => {
          result.current.updateNode('node-1', updates)
        })
        
        const updatedNode = result.current.currentEntry!.nodes[0]
        expect(updatedNode.data.label).toBe('Updated Node')
        expect(updatedNode.data.urgency).toBe(9)
        expect(updatedNode.data.isCollapsed).toBe(true)
        expect(mockFirestore.updateDoc).toHaveBeenCalled()
      })

      it('does nothing when no current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        act(() => {
          useBrainDumpStore.setState({ currentEntry: null })
        })
        
        await act(async () => {
          result.current.updateNode('node-1', { data: { label: 'Updated' } })
        })
        
        expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
      })

      it('does nothing when node not found', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        await act(async () => {
          result.current.updateNode('non-existent', { data: { label: 'Updated' } })
        })
        
        // Should still call updateDoc but with original nodes
        expect(result.current.currentEntry!.nodes[0].data.label).toBe('Test Node')
      })
    })

    describe('Delete Node', () => {
      it('deletes node and related edges', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        // Add edges connected to the node
        const testEdge: BrainDumpEdge = {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          data: { type: 'relates_to', confidence: 0.8 }
        }
        
        act(() => {
          const updatedEntry = {
            ...result.current.currentEntry!,
            edges: [testEdge]
          }
          useBrainDumpStore.setState({ currentEntry: updatedEntry })
        })
        
        await act(async () => {
          result.current.deleteNode('node-1')
        })
        
        expect(result.current.currentEntry!.nodes).toHaveLength(0)
        expect(result.current.currentEntry!.edges).toHaveLength(0)
        expect(mockFirestore.updateDoc).toHaveBeenCalled()
      })

      it('does nothing when no current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        act(() => {
          useBrainDumpStore.setState({ currentEntry: null })
        })
        
        await act(async () => {
          result.current.deleteNode('node-1')
        })
        
        expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
      })
    })

    describe('Toggle Node Collapse', () => {
      it('toggles node collapse state', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        // Initially not collapsed
        expect(result.current.currentEntry!.nodes[0].data.isCollapsed).toBeUndefined()
        
        await act(async () => {
          result.current.toggleNodeCollapse('node-1')
        })
        
        expect(result.current.currentEntry!.nodes[0].data.isCollapsed).toBe(true)
        
        await act(async () => {
          result.current.toggleNodeCollapse('node-1')
        })
        
        expect(result.current.currentEntry!.nodes[0].data.isCollapsed).toBe(false)
      })

      it('does nothing when no current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        act(() => {
          useBrainDumpStore.setState({ currentEntry: null })
        })
        
        await act(async () => {
          result.current.toggleNodeCollapse('node-1')
        })
        
        expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
      })
    })
  })

  describe('Edge Operations', () => {
    let testEntry: BrainDumpEntry
    let testEdge: BrainDumpEdge
    
    beforeEach(() => {
      testEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        data: {
          type: 'relates_to',
          confidence: 0.8
        }
      }
      
      testEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [],
        edges: [testEdge],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        useBrainDumpStore.setState({ 
          entries: [testEntry],
          currentEntry: testEntry 
        })
      })
    })

    describe('Add Edge', () => {
      it('adds edge to current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        const newEdge: BrainDumpEdge = {
          id: 'edge-2',
          source: 'node-2',
          target: 'node-3',
          data: {
            type: 'depends_on',
            confidence: 0.9
          }
        }
        
        await act(async () => {
          result.current.addEdge(newEdge)
        })
        
        expect(result.current.currentEntry!.edges).toHaveLength(2)
        expect(result.current.currentEntry!.edges[1]).toEqual(newEdge)
        expect(mockFirestore.updateDoc).toHaveBeenCalled()
      })

      it('does nothing when no current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        act(() => {
          useBrainDumpStore.setState({ currentEntry: null })
        })
        
        const newEdge: BrainDumpEdge = {
          id: 'edge-2',
          source: 'node-1',
          target: 'node-2'
        }
        
        await act(async () => {
          result.current.addEdge(newEdge)
        })
        
        expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
      })
    })

    describe('Update Edge', () => {
      it('updates edge successfully', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        const updates: Partial<BrainDumpEdge> = {
          data: {
            type: 'contradicts',
            confidence: 0.6
          }
        }
        
        await act(async () => {
          result.current.updateEdge('edge-1', updates)
        })
        
        const updatedEdge = result.current.currentEntry!.edges[0]
        expect(updatedEdge.data!.type).toBe('contradicts')
        expect(updatedEdge.data!.confidence).toBe(0.6)
        expect(mockFirestore.updateDoc).toHaveBeenCalled()
      })

      it('does nothing when no current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        act(() => {
          useBrainDumpStore.setState({ currentEntry: null })
        })
        
        await act(async () => {
          result.current.updateEdge('edge-1', { data: { type: 'elaborates' } })
        })
        
        expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
      })

      it('does nothing when edge not found', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        await act(async () => {
          result.current.updateEdge('non-existent', { data: { type: 'elaborates' } })
        })
        
        // Should still call updateDoc but with original edges
        expect(result.current.currentEntry!.edges[0].data!.type).toBe('relates_to')
      })
    })

    describe('Delete Edge', () => {
      it('deletes edge successfully', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        await act(async () => {
          result.current.deleteEdge('edge-1')
        })
        
        expect(result.current.currentEntry!.edges).toHaveLength(0)
        expect(mockFirestore.updateDoc).toHaveBeenCalled()
      })

      it('does nothing when no current entry', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        act(() => {
          useBrainDumpStore.setState({ currentEntry: null })
        })
        
        await act(async () => {
          result.current.deleteEdge('edge-1')
        })
        
        expect(mockFirestore.updateDoc).not.toHaveBeenCalled()
      })

      it('does nothing when edge not found', async () => {
        const { result } = renderHook(() => useBrainDumpStore())
        
        await act(async () => {
          result.current.deleteEdge('non-existent')
        })
        
        // Should still call updateDoc but with original edges
        expect(result.current.currentEntry!.edges).toHaveLength(1)
      })
    })
  })

  describe('State Persistence', () => {
    it('maintains state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useBrainDumpStore())
      const { result: result2 } = renderHook(() => useBrainDumpStore())
      
      const testEntry: BrainDumpEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        result1.current.setCurrentEntry(testEntry)
      })
      
      // Both hooks should see the same state
      expect(result1.current.currentEntry).toEqual(testEntry)
      expect(result2.current.currentEntry).toEqual(testEntry)
    })

    it('synchronizes state changes across hook instances', () => {
      const { result: result1 } = renderHook(() => useBrainDumpStore())
      const { result: result2 } = renderHook(() => useBrainDumpStore())
      
      const testEntry: BrainDumpEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        useBrainDumpStore.setState({ entries: [testEntry] })
      })
      
      expect(result1.current.entries).toEqual([testEntry])
      expect(result2.current.entries).toEqual([testEntry])
      
      act(() => {
        result2.current.setCurrentEntry(testEntry)
      })
      
      expect(result1.current.currentEntry).toEqual(testEntry)
      expect(result2.current.currentEntry).toEqual(testEntry)
    })
  })

  describe('Error Handling', () => {
    it('handles malformed Firebase data gracefully', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const malformedEntries = [
        {
          id: 'malformed-1',
          // Missing required fields
        },
        {
          id: 'malformed-2',
          title: 'Good Entry',
          rawText: 'Good text',
          nodes: 'invalid nodes', // Should be array
          edges: null, // Should be array
          createdAt: 'invalid date',
        }
      ]
      
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          malformedEntries.forEach((entryData) => {
            callback({
              id: entryData.id,
              data: () => entryData
            })
          })
        }
      })
      
      await act(async () => {
        await result.current.loadEntries(mockUserId)
      })
      
      // Should still load without crashing
      expect(result.current.entries).toHaveLength(2)
      expect(result.current.isLoading).toBe(false)
    })

    it('handles network timeout errors', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const timeoutError = new Error('Network timeout')
      timeoutError.name = 'TimeoutError'
      
      mockFirestore.getDocs.mockRejectedValue(timeoutError)
      
      await act(async () => {
        await result.current.loadEntries(mockUserId)
      })
      
      expect(result.current.error).toBe('Network timeout')
      expect(result.current.isLoading).toBe(false)
    })

    it('handles concurrent operations gracefully', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      // Start multiple operations simultaneously
      const promises = [
        result.current.loadEntries(mockUserId),
        result.current.createEntry('Entry 1', 'Text 1', mockUserId),
        result.current.createEntry('Entry 2', 'Text 2', mockUserId),
      ]
      
      await act(async () => {
        await Promise.allSettled(promises)
      })
      
      // Should handle concurrent operations without corruption
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles very large entry content', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const largeText = 'A'.repeat(100000) // 100KB of text
      const longTitle = 'B'.repeat(1000) // 1KB title
      
      let createdEntry: BrainDumpEntry
      
      await act(async () => {
        createdEntry = await result.current.createEntry(longTitle, largeText, mockUserId)
      })
      
      expect(createdEntry!.title).toBe(longTitle)
      expect(createdEntry!.rawText).toBe(largeText)
      expect(result.current.entries).toHaveLength(1)
    })

    it('handles entries with many nodes and edges', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      // Create entry with many nodes
      const manyNodes: BrainDumpNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'default',
        position: { x: i * 10, y: i * 10 },
        data: {
          label: `Node ${i}`,
          type: 'task'
        }
      }))
      
      // Create entry with many edges
      const manyEdges: BrainDumpEdge[] = Array.from({ length: 200 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i % 50}`,
        target: `node-${(i + 1) % 50}`,
        data: { type: 'relates_to' }
      }))
      
      const complexEntry: BrainDumpEntry = {
        id: 'complex-entry',
        title: 'Complex Entry',
        rawText: 'Complex text',
        nodes: manyNodes,
        edges: manyEdges,
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        useBrainDumpStore.setState({ 
          entries: [complexEntry],
          currentEntry: complexEntry 
        })
      })
      
      // Should handle large datasets
      expect(result.current.currentEntry!.nodes).toHaveLength(100)
      expect(result.current.currentEntry!.edges).toHaveLength(200)
      
      // Test operations on complex entry
      await act(async () => {
        result.current.deleteNode('node-0')
      })
      
      expect(result.current.currentEntry!.nodes).toHaveLength(99)
      // Edges connected to deleted node should be removed
      const edgesWithNode0 = result.current.currentEntry!.edges.filter(
        edge => edge.source === 'node-0' || edge.target === 'node-0'
      )
      expect(edgesWithNode0).toHaveLength(0)
    })

    it('handles unicode and emoji content', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const unicodeTitle = '🧠💭 Brain Dump with émojis and 中文 and العربية'
      const unicodeText = 'Text with various unicode: 🚀 ★ ♥ ☀️ 🌈 ñáéíóú çãõ αβγδε قطة كلب'
      
      let createdEntry: BrainDumpEntry
      
      await act(async () => {
        createdEntry = await result.current.createEntry(unicodeTitle, unicodeText, mockUserId)
      })
      
      expect(createdEntry!.title).toBe(unicodeTitle)
      expect(createdEntry!.rawText).toBe(unicodeText)
    })

    it('handles null and undefined values in node data', async () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const nodeWithNulls: BrainDumpNode = {
        id: 'null-node',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: 'Node with nulls',
          type: undefined,
          category: null,
          description: undefined,
          tags: null,
          urgency: undefined,
          importance: null,
          dueDate: undefined,
          confidence: null,
          keywords: undefined,
          isCollapsed: null,
          sourceText: undefined,
          textPosition: null
        } as any
      }
      
      const testEntry: BrainDumpEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      // Set both entries list and currentEntry so addNode can work
      act(() => {
        useBrainDumpStore.setState({ 
          entries: [testEntry],
          currentEntry: testEntry 
        })
      })
      
      await act(async () => {
        result.current.addNode(nodeWithNulls)
      })
      
      expect(result.current.currentEntry!.nodes).toHaveLength(1)
      expect(result.current.currentEntry!.nodes[0].data.label).toBe('Node with nulls')
    })
  })

  describe('Performance', () => {
    it('does not trigger unnecessary re-renders for same values', () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const testEntry: BrainDumpEntry = {
        id: 'test-entry',
        title: 'Test Entry',
        rawText: 'Test text',
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }
      
      act(() => {
        result.current.setCurrentEntry(testEntry)
      })
      
      const firstEntry = result.current.currentEntry
      
      // Setting the same entry again
      act(() => {
        result.current.setCurrentEntry(testEntry)
      })
      
      // Zustand should handle this efficiently
      expect(result.current.currentEntry).toEqual(firstEntry)
    })

    it('handles rapid state updates efficiently', () => {
      const { result } = renderHook(() => useBrainDumpStore())
      
      const entries: BrainDumpEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `entry-${i}`,
        title: `Entry ${i}`,
        rawText: `Text ${i}`,
        nodes: [],
        edges: [],
        userId: mockUserId,
        createdAt: mockDate,
        updatedAt: mockDate,
      }))
      
      // Perform many rapid updates
      act(() => {
        for (let i = 0; i < 50; i++) {
          useBrainDumpStore.setState({ entries: entries.slice(0, i + 1) })
        }
      })
      
      expect(result.current.entries).toHaveLength(50)
    })
  })
})
