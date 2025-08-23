import { act, renderHook } from '@testing-library/react'
import { useNodesStore } from '@/store/nodes'
import type { Node, NodeType, NodeUpdate } from '@/types/node'
import type { RecurringCompletion } from '@/types/recurrence'

// Mock Firebase to avoid actual Firebase calls in tests
jest.mock('@/lib/firebase', () => ({
  db: {},
}))

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
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}

jest.mock('firebase/firestore', () => mockFirestore)

describe('NodeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNodesStore.setState({
      nodes: [],
      isLoading: false,
      error: null,
      selectedNodeId: null,
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
    mockFirestore.writeBatch.mockReturnValue({
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useNodesStore())
      
      expect(result.current.nodes).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('Load Nodes', () => {
    it('loads nodes successfully', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const mockNodes = [
        {
          id: 'node-1',
          title: 'Test Node 1',
          type: 'task',
          createdAt: { toDate: () => new Date('2024-01-01') },
          updatedAt: { toDate: () => new Date('2024-01-01') },
        },
        {
          id: 'node-2', 
          title: 'Test Node 2',
          type: 'goal',
          createdAt: { toDate: () => new Date('2024-01-02') },
          updatedAt: { toDate: () => new Date('2024-01-02') },
        }
      ]
      
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockNodes.forEach((nodeData, index) => {
            callback({
              id: nodeData.id,
              data: () => nodeData
            })
          })
        }
      })
      
      await act(async () => {
        await result.current.loadNodes('test-user-id')
      })
      
      expect(result.current.nodes).toHaveLength(2)
      expect(result.current.nodes[0].id).toBe('node-1')
      expect(result.current.nodes[1].id).toBe('node-2')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('handles load error', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      mockFirestore.getDocs.mockRejectedValue(new Error('Firebase error'))
      
      await act(async () => {
        await result.current.loadNodes('test-user-id')
      })
      
      expect(result.current.nodes).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Firebase error')
    })

    it('handles missing user id', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      await act(async () => {
        await result.current.loadNodes('')
      })
      
      expect(result.current.error).toBe('User not authenticated')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Create Node', () => {
    it('creates node successfully', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const nodeData = {
        userId: 'test-user-id',
        title: 'New Node',
        type: 'task' as NodeType,
        description: 'Test description',
        urgency: 8,
        importance: 7,
        tags: ['work', 'urgent'],
      }
      
      let nodeId: string | null = null
      
      await act(async () => {
        nodeId = await result.current.createNode(nodeData)
      })
      
      expect(nodeId).toBeTruthy()
      expect(result.current.nodes).toHaveLength(1)
      
      const createdNode = result.current.nodes[0]
      expect(createdNode.title).toBe('New Node')
      expect(createdNode.type).toBe('task')
      expect(createdNode.description).toBe('Test description')
      expect(createdNode.urgency).toBe(8)
      expect(createdNode.importance).toBe(7)
      expect(createdNode.tags).toEqual(['work', 'urgent'])
      expect(createdNode.userId).toBe('test-user-id')
      expect(createdNode.completed).toBe(false)
    })

    it('creates node with minimal data', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const nodeData = {
        userId: 'test-user-id'
      }
      
      let nodeId: string | null = null
      
      await act(async () => {
        nodeId = await result.current.createNode(nodeData)
      })
      
      expect(nodeId).toBeTruthy()
      expect(result.current.nodes).toHaveLength(1)
      
      const createdNode = result.current.nodes[0]
      expect(createdNode.title).toBe('Untitled')
      expect(createdNode.type).toBe('thought')
      expect(createdNode.tags).toEqual(['misc'])
      expect(createdNode.completed).toBe(false)
    })

    it('handles create error with rollback', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      mockFirestore.setDoc.mockRejectedValue(new Error('Create failed'))
      
      const nodeData = {
        userId: 'test-user-id',
        title: 'Failed Node'
      }
      
      let nodeId: string | null = null
      
      await act(async () => {
        nodeId = await result.current.createNode(nodeData)
      })
      
      expect(nodeId).toBeNull()
      expect(result.current.nodes).toHaveLength(0) // Rolled back
      expect(result.current.error).toContain('Failed to create node')
    })

    it('requires user authentication', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const nodeData = {
        title: 'Node without user'
      }
      
      let nodeId: string | null = null
      
      await act(async () => {
        nodeId = await result.current.createNode(nodeData)
      })
      
      expect(nodeId).toBeNull()
      expect(result.current.error).toBe('User not authenticated')
    })
  })

  describe('Update Node', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useNodesStore())
      
      // Add a test node to the store
      const testNode: Node = {
        id: 'test-node-1',
        userId: 'test-user-id',
        title: 'Original Title',
        type: 'task',
        urgency: 5,
        importance: 5,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        useNodesStore.setState({ nodes: [testNode] })
      })
    })

    it('updates node successfully', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const updates = {
        title: 'Updated Title',
        urgency: 8,
        completed: true
      }
      
      await act(async () => {
        await result.current.updateNode('test-node-1', updates)
      })
      
      const updatedNode = result.current.nodes[0]
      expect(updatedNode.title).toBe('Updated Title')
      expect(updatedNode.urgency).toBe(8)
      expect(updatedNode.completed).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('handles update error with rollback', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      mockFirestore.updateDoc.mockRejectedValue(new Error('Update failed'))
      
      const originalNode = result.current.nodes[0]
      
      await act(async () => {
        await result.current.updateNode('test-node-1', { title: 'Failed Update' })
      })
      
      // Should rollback to original state
      const nodeAfterFailure = result.current.nodes[0]
      expect(nodeAfterFailure.title).toBe(originalNode.title)
      expect(result.current.error).toContain('Failed to update node')
    })

    it('handles non-existent node', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      await act(async () => {
        await result.current.updateNode('non-existent', { title: 'Update' })
      })
      
      expect(result.current.error).toBe('Node not found')
    })
  })

  describe('Delete Node', () => {
    beforeEach(async () => {
      // Setup test nodes with relationships
      const testNodes: Node[] = [
        {
          id: 'parent-node',
          userId: 'test-user-id',
          title: 'Parent Node',
          type: 'project',
          children: ['child-node-1', 'child-node-2'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'child-node-1',
          userId: 'test-user-id',
          title: 'Child Node 1',
          type: 'task',
          parent: 'parent-node',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'child-node-2',
          userId: 'test-user-id',
          title: 'Child Node 2',
          type: 'task',
          parent: 'parent-node',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
      
      act(() => {
        useNodesStore.setState({ nodes: testNodes })
      })
    })

    it('deletes node and cleans up relationships', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      await act(async () => {
        await result.current.deleteNode('parent-node')
      })
      
      // Parent node should be deleted
      expect(result.current.nodes).toHaveLength(2)
      expect(result.current.nodes.find(n => n.id === 'parent-node')).toBeUndefined()
      
      // Children should have parent reference removed
      const child1 = result.current.nodes.find(n => n.id === 'child-node-1')
      const child2 = result.current.nodes.find(n => n.id === 'child-node-2')
      expect(child1?.parent).toBeNull()
      expect(child2?.parent).toBeNull()
    })

    it('deletes child node and updates parent', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      await act(async () => {
        await result.current.deleteNode('child-node-1')
      })
      
      // Child node should be deleted
      expect(result.current.nodes).toHaveLength(2)
      expect(result.current.nodes.find(n => n.id === 'child-node-1')).toBeUndefined()
      
      // Parent should have child removed from children array
      const parent = result.current.nodes.find(n => n.id === 'parent-node')
      expect(parent?.children).toEqual(['child-node-2'])
    })

    it('clears selected node if deleted', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      act(() => {
        result.current.selectNode('child-node-1')
      })
      
      expect(result.current.selectedNodeId).toBe('child-node-1')
      
      await act(async () => {
        await result.current.deleteNode('child-node-1')
      })
      
      expect(result.current.selectedNodeId).toBeNull()
    })

    it('handles non-existent node', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      await act(async () => {
        await result.current.deleteNode('non-existent')
      })
      
      expect(result.current.error).toBe('Node not found')
    })
  })

  describe('Node Relationships', () => {
    beforeEach(() => {
      const testNodes: Node[] = [
        {
          id: 'node-1',
          userId: 'test-user-id',
          title: 'Node 1',
          type: 'project',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-2',
          userId: 'test-user-id',
          title: 'Node 2',
          type: 'task',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
      
      act(() => {
        useNodesStore.setState({ nodes: testNodes })
      })
    })

    it('links child to parent', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      await act(async () => {
        await result.current.linkAsChild('node-1', 'node-2')
      })
      
      const parent = result.current.nodes.find(n => n.id === 'node-1')
      const child = result.current.nodes.find(n => n.id === 'node-2')
      
      expect(parent?.children).toContain('node-2')
      expect(child?.parent).toBe('node-1')
    })

    it('prevents circular dependencies', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      // First link node-2 as child of node-1
      await act(async () => {
        await result.current.linkAsChild('node-1', 'node-2')
      })
      
      // Try to link node-1 as child of node-2 (would create circular dependency)
      await act(async () => {
        await result.current.linkAsChild('node-2', 'node-1')
      })
      
      expect(result.current.error).toBe('Cannot create circular dependency')
    })

    it('creates child node with relationship', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const childData = {
        title: 'New Child',
        type: 'task' as NodeType
      }
      
      let childId: string | null = null
      
      await act(async () => {
        childId = await result.current.createChildNode('node-1', childData)
      })
      
      expect(childId).toBeTruthy()
      
      const parent = result.current.nodes.find(n => n.id === 'node-1')
      const child = result.current.nodes.find(n => n.id === childId)
      
      expect(parent?.children).toContain(childId)
      expect(child?.parent).toBe('node-1')
      expect(child?.title).toBe('New Child')
    })

    it('creates parent node with relationship', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const parentData = {
        title: 'New Parent',
        type: 'project' as NodeType
      }
      
      let parentId: string | null = null
      
      await act(async () => {
        parentId = await result.current.createParentNode('node-2', parentData)
      })
      
      expect(parentId).toBeTruthy()
      
      const parent = result.current.nodes.find(n => n.id === parentId)
      const child = result.current.nodes.find(n => n.id === 'node-2')
      
      expect(parent?.children).toContain('node-2')
      expect(child?.parent).toBe(parentId)
      expect(parent?.title).toBe('New Parent')
    })
  })

  describe('Utility Functions', () => {
    beforeEach(() => {
      const testNodes: Node[] = [
        {
          id: 'node-1',
          userId: 'test-user-id',
          title: 'Task Node',
          type: 'task',
          tags: ['work', 'urgent'],
          children: ['node-3'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-2',
          userId: 'test-user-id',
          title: 'Goal Node',
          type: 'goal',
          tags: ['personal'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-3',
          userId: 'test-user-id',
          title: 'Child Task',
          type: 'task',
          parent: 'node-1',
          tags: ['work'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
      
      act(() => {
        useNodesStore.setState({ nodes: testNodes })
      })
    })

    it('gets node by id', () => {
      const { result } = renderHook(() => useNodesStore())
      
      const node = result.current.getNodeById('node-1')
      expect(node?.title).toBe('Task Node')
      
      const nonExistent = result.current.getNodeById('non-existent')
      expect(nonExistent).toBeUndefined()
    })

    it('gets nodes by type', () => {
      const { result } = renderHook(() => useNodesStore())
      
      const taskNodes = result.current.getNodesByType('task')
      expect(taskNodes).toHaveLength(2)
      expect(taskNodes.every(n => n.type === 'task')).toBe(true)
      
      const goalNodes = result.current.getNodesByType('goal')
      expect(goalNodes).toHaveLength(1)
      expect(goalNodes[0].title).toBe('Goal Node')
    })

    it('gets nodes by tag', () => {
      const { result } = renderHook(() => useNodesStore())
      
      const workNodes = result.current.getNodesByTag('work')
      expect(workNodes).toHaveLength(2)
      expect(workNodes.every(n => n.tags?.includes('work'))).toBe(true)
      
      const urgentNodes = result.current.getNodesByTag('urgent')
      expect(urgentNodes).toHaveLength(1)
      expect(urgentNodes[0].title).toBe('Task Node')
    })

    it('gets node children', () => {
      const { result } = renderHook(() => useNodesStore())
      
      const children = result.current.getNodeChildren('node-1')
      expect(children).toHaveLength(1)
      expect(children[0].id).toBe('node-3')
      
      const noChildren = result.current.getNodeChildren('node-2')
      expect(noChildren).toHaveLength(0)
    })

    it('gets node parent', () => {
      const { result } = renderHook(() => useNodesStore())
      
      const parent = result.current.getNodeParent('node-3')
      expect(parent?.id).toBe('node-1')
      
      const noParent = result.current.getNodeParent('node-1')
      expect(noParent).toBeUndefined()
    })

    it('gets node ancestors', () => {
      const { result } = renderHook(() => useNodesStore())
      
      // Add a grandparent
      const grandparent: Node = {
        id: 'grandparent',
        userId: 'test-user-id',
        title: 'Grandparent',
        type: 'project',
        children: ['node-1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        const nodes = result.current.nodes
        nodes[0].parent = 'grandparent' // node-1 parent
        useNodesStore.setState({ nodes: [...nodes, grandparent] })
      })
      
      const ancestors = result.current.getNodeAncestors('node-3')
      expect(ancestors).toHaveLength(2)
      expect(ancestors[0].id).toBe('node-1') // Direct parent
      expect(ancestors[1].id).toBe('grandparent') // Grandparent
    })

    it('gets node descendants', () => {
      const { result } = renderHook(() => useNodesStore())
      
      // Add a grandchild
      const grandchild: Node = {
        id: 'grandchild',
        userId: 'test-user-id',
        title: 'Grandchild',
        type: 'task',
        parent: 'node-3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        const nodes = result.current.nodes
        nodes[2].children = ['grandchild'] // node-3 children
        useNodesStore.setState({ nodes: [...nodes, grandchild] })
      })
      
      const descendants = result.current.getNodeDescendants('node-1')
      expect(descendants).toHaveLength(2)
      expect(descendants.some(d => d.id === 'node-3')).toBe(true)
      expect(descendants.some(d => d.id === 'grandchild')).toBe(true)
    })
  })

  describe('Node Selection', () => {
    it('selects and deselects nodes', () => {
      const { result } = renderHook(() => useNodesStore())
      
      expect(result.current.selectedNodeId).toBeNull()
      
      act(() => {
        result.current.selectNode('node-1')
      })
      
      expect(result.current.selectedNodeId).toBe('node-1')
      
      act(() => {
        result.current.selectNode(null)
      })
      
      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('Node Updates', () => {
    beforeEach(() => {
      const testNode: Node = {
        id: 'test-node',
        userId: 'test-user-id',
        title: 'Test Node',
        type: 'task',
        updates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        useNodesStore.setState({ nodes: [testNode] })
      })
    })

    it('adds node update', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const update = {
        content: 'Progress update',
        userId: 'test-user-id',
        userName: 'Test User',
        type: 'progress' as const
      }
      
      await act(async () => {
        await result.current.addNodeUpdate('test-node', update)
      })
      
      const node = result.current.nodes[0]
      expect(node.updates).toHaveLength(1)
      expect(node.updates?.[0].content).toBe('Progress update')
      expect(node.updates?.[0].type).toBe('progress')
      expect(node.updates?.[0].userName).toBe('Test User')
    })

    it('deletes node update', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      // First add an update
      const update = {
        content: 'Update to delete',
        userId: 'test-user-id'
      }
      
      await act(async () => {
        await result.current.addNodeUpdate('test-node', update)
      })
      
      const updateId = result.current.nodes[0].updates?.[0].id
      expect(updateId).toBeTruthy()
      
      // Then delete it
      await act(async () => {
        await result.current.deleteNodeUpdate('test-node', updateId!)
      })
      
      const node = result.current.nodes[0]
      expect(node.updates).toHaveLength(0)
    })
  })

  describe('Recurring Tasks', () => {
    beforeEach(() => {
      const recurringNode: Node = {
        id: 'recurring-task',
        userId: 'test-user-id',
        title: 'Daily Exercise',
        type: 'task',
        taskType: 'recurring',
        recurringCompletions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        useNodesStore.setState({ nodes: [recurringNode] })
      })
    })

    it('completes recurring task', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const completionDate = '2024-01-15'
      
      await act(async () => {
        await result.current.completeRecurringTask('recurring-task', completionDate)
      })
      
      const node = result.current.nodes[0]
      expect(node.recurringCompletions).toHaveLength(1)
      expect(node.recurringCompletions?.[0].date).toBe(completionDate)
      expect(node.recurringCompletions?.[0].status).toBe('completed')
      expect(node.lastRecurringCompletionDate).toBe(completionDate)
    })

    it('updates existing completion for same date', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const completionDate = '2024-01-15'
      
      // Complete the task
      await act(async () => {
        await result.current.completeRecurringTask('recurring-task', completionDate)
      })
      
      // Complete again on same date
      await act(async () => {
        await result.current.completeRecurringTask('recurring-task', completionDate)
      })
      
      const node = result.current.nodes[0]
      expect(node.recurringCompletions).toHaveLength(1) // Should still be 1
    })
  })

  describe('Bulk Operations', () => {
    beforeEach(() => {
      const testNodes: Node[] = [
        {
          id: 'bulk-1',
          userId: 'test-user-id',
          title: 'Bulk Node 1',
          type: 'task',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'bulk-2',
          userId: 'test-user-id',
          title: 'Bulk Node 2',
          type: 'task',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
      
      act(() => {
        useNodesStore.setState({ nodes: testNodes })
      })
    })

    it('bulk updates multiple nodes', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      const updates = [
        {
          nodeId: 'bulk-1',
          updates: { completed: true, title: 'Updated Bulk 1' }
        },
        {
          nodeId: 'bulk-2', 
          updates: { completed: true, urgency: 8 }
        }
      ]
      
      await act(async () => {
        await result.current.bulkUpdateNodes(updates)
      })
      
      const node1 = result.current.nodes.find(n => n.id === 'bulk-1')
      const node2 = result.current.nodes.find(n => n.id === 'bulk-2')
      
      expect(node1?.completed).toBe(true)
      expect(node1?.title).toBe('Updated Bulk 1')
      expect(node2?.completed).toBe(true)
      expect(node2?.urgency).toBe(8)
    })
  })

  describe('Node Pinning', () => {
    beforeEach(() => {
      const testNode: Node = {
        id: 'pin-test',
        userId: 'test-user-id',
        title: 'Pin Test Node',
        type: 'task',
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        useNodesStore.setState({ nodes: [testNode] })
      })
    })

    it('toggles node pin status', async () => {
      const { result } = renderHook(() => useNodesStore())
      
      // Pin the node
      await act(async () => {
        await result.current.toggleNodePin('pin-test')
      })
      
      let node = result.current.nodes[0]
      expect(node.isPinned).toBe(true)
      
      // Unpin the node
      await act(async () => {
        await result.current.toggleNodePin('pin-test')
      })
      
      node = result.current.nodes[0]
      expect(node.isPinned).toBe(false)
    })
  })

  describe('Clear Nodes', () => {
    it('clears all nodes and resets state', () => {
      const { result } = renderHook(() => useNodesStore())
      
      // Set some state
      act(() => {
        useNodesStore.setState({
          nodes: [{ id: 'test' } as Node],
          isLoading: true,
          error: 'Some error',
          selectedNodeId: 'test'
        })
      })
      
      // Clear nodes
      act(() => {
        result.current.clearNodes()
      })
      
      expect(result.current.nodes).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined/null children arrays', () => {
      const { result } = renderHook(() => useNodesStore())
      
      const nodeWithoutChildren: Node = {
        id: 'no-children',
        userId: 'test-user-id',
        title: 'No Children',
        type: 'task',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        useNodesStore.setState({ nodes: [nodeWithoutChildren] })
      })
      
      const children = result.current.getNodeChildren('no-children')
      expect(children).toEqual([])
    })

    it('handles non-existent parent references', () => {
      const { result } = renderHook(() => useNodesStore())
      
      const orphanNode: Node = {
        id: 'orphan',
        userId: 'test-user-id',
        title: 'Orphan Node',
        type: 'task',
        parent: 'non-existent-parent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      act(() => {
        useNodesStore.setState({ nodes: [orphanNode] })
      })
      
      const parent = result.current.getNodeParent('orphan')
      expect(parent).toBeUndefined()
    })

    it('prevents infinite loops in ancestor traversal', () => {
      const { result } = renderHook(() => useNodesStore())
      
      // Create nodes with circular reference (shouldn't happen in practice)
      const circularNodes: Node[] = [
        {
          id: 'circular-1',
          userId: 'test-user-id',
          title: 'Circular 1',
          type: 'task',
          parent: 'circular-2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'circular-2',
          userId: 'test-user-id',
          title: 'Circular 2',
          type: 'task', 
          parent: 'circular-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
      
      act(() => {
        useNodesStore.setState({ nodes: circularNodes })
      })
      
      // This should not cause infinite loop
      const ancestors = result.current.getNodeAncestors('circular-1')
      expect(ancestors.length).toBeLessThanOrEqual(2)
    })
  })
})