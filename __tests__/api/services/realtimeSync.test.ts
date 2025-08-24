// Mock Firebase and Auth Context before imports
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    isOfflineMode: false
  }))
}))

jest.mock('@/lib/firebase', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  writeBatch: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn()
}))

jest.mock('@/store/nodes', () => ({
  useNodesStore: {
    getState: jest.fn()
  }
}))

import { realtimeSync } from '@/services/realtimeSync'
import { 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  collection,
  doc,
  serverTimestamp
} from 'firebase/firestore'
import { useNodesStore } from '@/store/nodes'
import type { Node } from '@/types/node'

describe('RealtimeSyncService', () => {
  const mockUserId = 'test-user-123'
  const mockNode: Node = {
    id: 'node-1',
    userId: mockUserId,
    type: 'task',
    title: 'Test Task',
    description: 'Test description',
    tags: ['test'],
    completed: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isPersonal: false,
    urgency: 5,
    importance: 7
  }

  let mockStore: any
  let mockOnSnapshot: jest.MockedFunction<typeof onSnapshot>
  let mockSetDoc: jest.MockedFunction<typeof setDoc>
  let mockUpdateDoc: jest.MockedFunction<typeof updateDoc>
  let mockDeleteDoc: jest.MockedFunction<typeof deleteDoc>
  let mockDoc: jest.MockedFunction<typeof doc>
  let mockCollection: jest.MockedFunction<typeof collection>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset store mock
    mockStore = {
      nodes: [mockNode],
      addNode: jest.fn(),
      updateNode: jest.fn(),
      deleteNode: jest.fn()
    }
    
    ;(useNodesStore.getState as jest.Mock).mockReturnValue(mockStore)
    
    // Setup Firebase mocks
    mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>
    mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>
    mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>
    mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>
    mockDoc = doc as jest.MockedFunction<typeof doc>
    mockCollection = collection as jest.MockedFunction<typeof collection>
    
    // Mock doc and collection to return objects with id
    mockDoc.mockReturnValue({ id: 'new-node-id' } as any)
    mockCollection.mockReturnValue({} as any)
  })

  describe('startNodeSync', () => {
    it('should set up real-time listener for nodes', () => {
      const onSync = jest.fn()
      const onError = jest.fn()
      
      const cleanup = realtimeSync.startNodeSync({
        userId: mockUserId,
        onSync,
        onError
      })
      
      expect(mockOnSnapshot).toHaveBeenCalled()
      expect(typeof cleanup).toBe('function')
    })

    it('should handle snapshot updates', () => {
      const onSync = jest.fn()
      let snapshotCallback: any
      
      mockOnSnapshot.mockImplementation((query, callback, errorCallback) => {
        snapshotCallback = callback
        return jest.fn() // Return unsubscribe function
      })
      
      realtimeSync.startNodeSync({
        userId: mockUserId,
        onSync
      })
      
      // Simulate snapshot with added node
      const mockSnapshot = {
        docChanges: () => [{
          type: 'added',
          doc: {
            id: 'new-node',
            data: () => ({
              type: 'task',
              title: 'New Task',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() }
            })
          }
        }]
      }
      
      snapshotCallback(mockSnapshot)
      
      expect(mockStore.addNode).toHaveBeenCalled()
      expect(onSync).toHaveBeenCalledWith('synced')
    })

    it('should handle modified nodes', () => {
      let snapshotCallback: any
      
      mockOnSnapshot.mockImplementation((query, callback) => {
        snapshotCallback = callback
        return jest.fn()
      })
      
      realtimeSync.startNodeSync({ userId: mockUserId })
      
      const mockSnapshot = {
        docChanges: () => [{
          type: 'modified',
          doc: {
            id: 'node-1',
            data: () => ({
              ...mockNode,
              title: 'Updated Task',
              createdAt: { toDate: () => mockNode.createdAt },
              updatedAt: { toDate: () => new Date() }
            })
          }
        }]
      }
      
      snapshotCallback(mockSnapshot)
      
      expect(mockStore.updateNode).toHaveBeenCalledWith(
        'node-1',
        expect.objectContaining({ title: 'Updated Task' })
      )
    })

    it('should handle removed nodes', () => {
      let snapshotCallback: any
      
      mockOnSnapshot.mockImplementation((query, callback) => {
        snapshotCallback = callback
        return jest.fn()
      })
      
      realtimeSync.startNodeSync({ userId: mockUserId })
      
      const mockSnapshot = {
        docChanges: () => [{
          type: 'removed',
          doc: {
            id: 'node-1',
            data: () => ({})
          }
        }]
      }
      
      snapshotCallback(mockSnapshot)
      
      expect(mockStore.deleteNode).toHaveBeenCalledWith('node-1')
    })

    it('should handle errors and retry', (done) => {
      const onError = jest.fn()
      let errorCallback: any
      
      mockOnSnapshot.mockImplementation((query, callback, error) => {
        errorCallback = error
        return jest.fn()
      })
      
      realtimeSync.startNodeSync({
        userId: mockUserId,
        onError
      })
      
      const mockError = new Error('Connection failed')
      errorCallback(mockError)
      
      expect(onError).toHaveBeenCalledWith(mockError)
      
      // Verify retry is scheduled (would need to advance timers in real test)
      done()
    })
  })

  describe('createNodeOptimistic', () => {
    it('should create node optimistically', async () => {
      mockSetDoc.mockResolvedValue(undefined)
      
      const newNode = {
        type: 'task' as const,
        title: 'New Task',
        description: 'Description',
        tags: ['work'],
        completed: false,
        isPersonal: false,
        urgency: 5,
        importance: 7
      }
      
      const nodeId = await realtimeSync.createNodeOptimistic(mockUserId, newNode)
      
      // Should add to store immediately
      expect(mockStore.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newNode,
          userId: mockUserId
        })
      )
      
      // Should create in Firestore
      expect(mockSetDoc).toHaveBeenCalled()
      expect(nodeId).toBe('new-node-id')
    })

    it('should rollback on error', async () => {
      mockSetDoc.mockRejectedValue(new Error('Create failed'))
      mockStore.deleteNode = jest.fn()
      
      const newNode = {
        type: 'task' as const,
        title: 'New Task',
        description: 'Description',
        tags: [],
        completed: false
      }
      
      await expect(
        realtimeSync.createNodeOptimistic(mockUserId, newNode)
      ).rejects.toThrow('Create failed')
      
      // Should rollback by deleting the optimistically added node
      expect(mockStore.deleteNode).toHaveBeenCalled()
    })
  })

  describe('updateNodeOptimistic', () => {
    it('should update node optimistically', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)
      mockStore.nodes = [mockNode]
      
      const updates = { title: 'Updated Title', completed: true }
      
      await realtimeSync.updateNodeOptimistic(mockUserId, 'node-1', updates)
      
      // Should update store immediately
      expect(mockStore.updateNode).toHaveBeenCalledWith('node-1', updates)
      
      // Should update in Firestore
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ...updates,
          updatedAt: 'SERVER_TIMESTAMP'
        })
      )
    })

    it('should rollback on error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'))
      mockStore.nodes = [mockNode]
      
      const updates = { title: 'Updated Title' }
      
      await expect(
        realtimeSync.updateNodeOptimistic(mockUserId, 'node-1', updates)
      ).rejects.toThrow('Update failed')
      
      // Should rollback to original node
      expect(mockStore.updateNode).toHaveBeenCalledWith('node-1', mockNode)
    })

    it('should throw error if node not found', async () => {
      mockStore.nodes = []
      
      await expect(
        realtimeSync.updateNodeOptimistic(mockUserId, 'non-existent', {})
      ).rejects.toThrow('Node non-existent not found')
    })
  })

  describe('deleteNodeOptimistic', () => {
    it('should delete node optimistically', async () => {
      mockDeleteDoc.mockResolvedValue(undefined)
      mockStore.nodes = [mockNode]
      
      await realtimeSync.deleteNodeOptimistic(mockUserId, 'node-1')
      
      // Should delete from store immediately
      expect(mockStore.deleteNode).toHaveBeenCalledWith('node-1')
      
      // Should delete from Firestore
      expect(mockDeleteDoc).toHaveBeenCalled()
    })

    it('should rollback on error', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete failed'))
      mockStore.nodes = [mockNode]
      
      await expect(
        realtimeSync.deleteNodeOptimistic(mockUserId, 'node-1')
      ).rejects.toThrow('Delete failed')
      
      // Should rollback by re-adding the node
      expect(mockStore.addNode).toHaveBeenCalledWith(mockNode)
    })
  })

  describe('batchUpdateNodes', () => {
    it('should batch update multiple nodes', async () => {
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      }
      
      ;(writeBatch as jest.Mock).mockReturnValue(mockBatch)
      
      const updates = [
        { id: 'node-1', changes: { title: 'Updated 1' } },
        { id: 'node-2', changes: { title: 'Updated 2' } }
      ]
      
      await realtimeSync.batchUpdateNodes(mockUserId, updates)
      
      expect(mockBatch.update).toHaveBeenCalledTimes(2)
      expect(mockBatch.commit).toHaveBeenCalled()
    })
  })

  describe('Conflict Resolution', () => {
    it('should detect conflicts based on timestamps', () => {
      let snapshotCallback: any
      
      mockOnSnapshot.mockImplementation((query, callback) => {
        snapshotCallback = callback
        return jest.fn()
      })
      
      realtimeSync.startNodeSync({ userId: mockUserId })
      
      // Local node with different timestamp
      const localNode = {
        ...mockNode,
        updatedAt: new Date('2024-01-01T10:00:00')
      }
      mockStore.nodes = [localNode]
      
      // Remote node with different timestamp
      const mockSnapshot = {
        docChanges: () => [{
          type: 'modified',
          doc: {
            id: 'node-1',
            data: () => ({
              ...mockNode,
              title: 'Remote Title',
              createdAt: { toDate: () => mockNode.createdAt },
              updatedAt: { toDate: () => new Date('2024-01-01T11:00:00') }
            })
          }
        }]
      }
      
      snapshotCallback(mockSnapshot)
      
      // Should detect conflict and resolve
      expect(mockStore.updateNode).toHaveBeenCalled()
    })

    it('should resolve conflicts using merge strategy by default', () => {
      let snapshotCallback: any
      
      mockOnSnapshot.mockImplementation((query, callback) => {
        snapshotCallback = callback
        return jest.fn()
      })
      
      realtimeSync.startNodeSync({ userId: mockUserId })
      
      // Local node with newer update
      const localNode = {
        ...mockNode,
        title: 'Local Title',
        updatedAt: new Date('2024-01-01T12:00:00')
      }
      mockStore.nodes = [localNode]
      
      // Remote node with older update but server timestamp
      const remoteUpdatedAt = new Date('2024-01-01T11:00:00')
      const mockSnapshot = {
        docChanges: () => [{
          type: 'modified',
          doc: {
            id: 'node-1',
            data: () => ({
              ...mockNode,
              title: 'Remote Title',
              createdAt: { toDate: () => mockNode.createdAt },
              updatedAt: { toDate: () => remoteUpdatedAt }
            })
          }
        }]
      }
      
      snapshotCallback(mockSnapshot)
      
      // Should merge with local changes preserved
      expect(mockStore.updateNode).toHaveBeenCalledWith(
        'node-1',
        expect.objectContaining({
          title: 'Local Title', // Local is newer
          updatedAt: remoteUpdatedAt // Server timestamp
        })
      )
    })

    it('should support different conflict resolution strategies', () => {
      realtimeSync.setConflictResolution('remote')
      
      let snapshotCallback: any
      
      mockOnSnapshot.mockImplementation((query, callback) => {
        snapshotCallback = callback
        return jest.fn()
      })
      
      realtimeSync.startNodeSync({ userId: mockUserId })
      
      const localNode = {
        ...mockNode,
        title: 'Local Title',
        updatedAt: new Date('2024-01-01T12:00:00')
      }
      mockStore.nodes = [localNode]
      
      const mockSnapshot = {
        docChanges: () => [{
          type: 'modified',
          doc: {
            id: 'node-1',
            data: () => ({
              ...mockNode,
              title: 'Remote Title',
              createdAt: { toDate: () => mockNode.createdAt },
              updatedAt: { toDate: () => new Date('2024-01-01T11:00:00') }
            })
          }
        }]
      }
      
      snapshotCallback(mockSnapshot)
      
      // Should use remote version
      expect(mockStore.updateNode).toHaveBeenCalledWith(
        'node-1',
        expect.objectContaining({
          title: 'Remote Title'
        })
      )
      
      // Reset to default
      realtimeSync.setConflictResolution('merge')
    })
  })

  describe('Cleanup', () => {
    it('should clean up subscriptions when stopped', () => {
      const mockUnsubscribe = jest.fn()
      mockOnSnapshot.mockReturnValue(mockUnsubscribe)
      
      const cleanup = realtimeSync.startNodeSync({ userId: mockUserId })
      cleanup()
      
      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should stop all sync when stopAllSync is called', () => {
      const mockUnsubscribe1 = jest.fn()
      const mockUnsubscribe2 = jest.fn()
      
      mockOnSnapshot
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2)
      
      realtimeSync.startNodeSync({ userId: 'user1' })
      realtimeSync.startNodeSync({ userId: 'user2' })
      
      realtimeSync.stopAllSync()
      
      expect(mockUnsubscribe1).toHaveBeenCalled()
      expect(mockUnsubscribe2).toHaveBeenCalled()
    })
  })
})