import { create } from 'zustand'
import type { Node, NodeType } from '@/types/node'
import type { RecurringCompletion, TaskType } from '@/types/recurrence'
import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'

interface NodesStore {
  // State
  nodes: Node[]
  isLoading: boolean
  error: string | null
  selectedNodeId: string | null

  // Actions
  loadNodes: (userId: string) => Promise<void>
  createNode: (node: Partial<Node>) => Promise<string | null>
  updateNode: (nodeId: string, updates: Partial<Node>) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  completeRecurringTask: (nodeId: string, date: string) => Promise<void>

  // Relationship Actions
  linkAsChild: (parentId: string, childId: string) => Promise<void>
  linkAsParent: (childId: string, parentId: string) => Promise<void>
  unlinkNodes: (nodeId1: string, nodeId2: string) => Promise<void>
  createChildNode: (parentId: string, childData: Partial<Node>) => Promise<string | null>
  createParentNode: (childId: string, parentData: Partial<Node>) => Promise<string | null>

  // Utilities
  getNodeById: (nodeId: string) => Node | undefined
  getNodesByType: (type: NodeType) => Node[]
  getNodesByTag: (tag: string) => Node[]
  getNodeChildren: (nodeId: string) => Node[]
  getNodeParent: (nodeId: string) => Node | undefined
  getNodeAncestors: (nodeId: string) => Node[]
  getNodeDescendants: (nodeId: string) => Node[]
  selectNode: (nodeId: string | null) => void

  // Clear state
  clearNodes: () => void
}

export const useNodesStore = create<NodesStore>((set, get) => ({
  // Initial state
  nodes: [],
  isLoading: false,
  error: null,
  selectedNodeId: null,

  // Load all nodes for the current user
  loadNodes: async (userId: string) => {
    if (!userId) {
      set({ error: 'User not authenticated', isLoading: false })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const nodesQuery = query(
        collection(db, 'users', userId, 'nodes'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(nodesQuery)
      
      const nodes: Node[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        nodes.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as Node)
      })

      set({
        nodes,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      })
    }
  },

  // Create a new node
  createNode: async (nodeData: Partial<Node>) => {
    if (!nodeData.userId) {
      set({ error: 'User not authenticated' })
      return null
    }

    try {
      const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Build the node object, excluding undefined fields
      const newNode: any = {
        id: nodeId,
        userId: nodeData.userId,
        title: nodeData.title || 'Untitled',
        type: nodeData.type || 'thought',
        tags: nodeData.tags || ['misc'],
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Only add optional fields if they're defined
      if (nodeData.description !== undefined) newNode.description = nodeData.description
      if (nodeData.urgency !== undefined) newNode.urgency = nodeData.urgency
      if (nodeData.importance !== undefined) newNode.importance = nodeData.importance
      if (nodeData.dueDate !== undefined) newNode.dueDate = nodeData.dueDate
      if (nodeData.parent !== undefined) newNode.parent = nodeData.parent
      if (nodeData.children !== undefined) newNode.children = nodeData.children

      // Saving node to Firestore
      
      // Create a clean object for Firestore (no undefined values)
      const firestoreData = Object.entries(newNode).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value
        }
        return acc
      }, {} as any)

      // Save to Firestore with server timestamps
      await setDoc(doc(db, 'users', nodeData.userId, 'nodes', nodeId), {
        ...firestoreData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Node saved to Firestore successfully

      // Update local state
      const nodes = [...get().nodes, newNode]
      set({ nodes })

      return nodeId
    } catch (error) {
      // Error in createNode
      set({ error: (error as Error).message })
      return null
    }
  },

  // Update an existing node
  updateNode: async (nodeId: string, updates: Partial<Node>) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }

    try {
      // Update in Firestore
      await updateDoc(doc(db, 'users', node.userId, 'nodes', nodeId), {
        ...updates,
        updatedAt: serverTimestamp(),
      })

      // Update local state optimistically
      const nodes = get().nodes.map(n => 
        n.id === nodeId 
          ? { ...n, ...updates, updatedAt: new Date().toISOString() } 
          : n
      )

      set({ nodes })
    } catch (error) {
      set({ error: (error as Error).message })
      // Reload to ensure consistency
      await get().loadNodes(node.userId)
    }
  },

  // Complete a recurring task for a specific date
  completeRecurringTask: async (nodeId: string, date: string) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node || !node.recurringCompletions) {
      return
    }

    const completion: RecurringCompletion = {
      date,
      completedAt: new Date().toISOString(),
      status: 'completed',
    }

    const existingCompletions = node.recurringCompletions || []
    const updatedCompletions = existingCompletions.filter(c => c.date !== date)
    updatedCompletions.push(completion)

    await get().updateNode(nodeId, {
      recurringCompletions: updatedCompletions,
      lastRecurringCompletionDate: date,
    })
  },

  // Delete a node
  deleteNode: async (nodeId: string) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', node.userId, 'nodes', nodeId))

      // Update local state
      const nodes = get().nodes.filter(n => n.id !== nodeId)
      set({ nodes })

      // Clear selection if deleted node was selected
      if (get().selectedNodeId === nodeId) {
        set({ selectedNodeId: null })
      }
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  // Utility functions
  getNodeById: (nodeId: string) => {
    return get().nodes.find(node => node.id === nodeId)
  },

  getNodesByType: (type: NodeType) => {
    return get().nodes.filter(node => node.type === type)
  },

  getNodesByTag: (tag: string) => {
    return get().nodes.filter(node => node.tags?.includes(tag))
  },

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId })
  },

  // Relationship Actions
  linkAsChild: async (parentId: string, childId: string) => {
    const parent = get().getNodeById(parentId)
    const child = get().getNodeById(childId)
    
    if (!parent || !child) {
      set({ error: 'Parent or child node not found' })
      return
    }

    // Prevent circular dependencies
    const ancestors = get().getNodeAncestors(parentId)
    if (ancestors.some(a => a.id === childId)) {
      set({ error: 'Cannot create circular dependency' })
      return
    }

    try {
      // Update parent node
      const parentChildren = parent.children || []
      if (!parentChildren.includes(childId)) {
        await get().updateNode(parentId, {
          children: [...parentChildren, childId]
        })
      }

      // Update child node
      await get().updateNode(childId, { parent: parentId })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  linkAsParent: async (childId: string, parentId: string) => {
    // This is just the reverse of linkAsChild
    await get().linkAsChild(parentId, childId)
  },

  unlinkNodes: async (nodeId1: string, nodeId2: string) => {
    const node1 = get().getNodeById(nodeId1)
    const node2 = get().getNodeById(nodeId2)
    
    if (!node1 || !node2) return

    try {
      // Check if node1 is parent of node2
      if (node1.children?.includes(nodeId2)) {
        await get().updateNode(nodeId1, {
          children: node1.children.filter(id => id !== nodeId2)
        })
        await get().updateNode(nodeId2, { parent: undefined })
      }
      
      // Check if node2 is parent of node1
      if (node2.children?.includes(nodeId1)) {
        await get().updateNode(nodeId2, {
          children: node2.children.filter(id => id !== nodeId1)
        })
        await get().updateNode(nodeId1, { parent: undefined })
      }
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  createChildNode: async (parentId: string, childData: Partial<Node>) => {
    const parent = get().getNodeById(parentId)
    if (!parent) {
      set({ error: 'Parent node not found' })
      return null
    }

    try {
      // Create the child node with parent reference
      const childId = await get().createNode({
        ...childData,
        parent: parentId,
        userId: parent.userId,
      })

      if (childId) {
        // Update parent's children array
        await get().updateNode(parentId, {
          children: [...(parent.children || []), childId]
        })
      }

      return childId
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  createParentNode: async (childId: string, parentData: Partial<Node>) => {
    const child = get().getNodeById(childId)
    if (!child) {
      set({ error: 'Child node not found' })
      return null
    }

    try {
      // Create the parent node with child reference
      const parentId = await get().createNode({
        ...parentData,
        children: [childId],
        userId: child.userId,
      })

      if (parentId) {
        // Update child's parent reference
        await get().updateNode(childId, { parent: parentId })
      }

      return parentId
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  // Additional utility methods for relationships
  getNodeChildren: (nodeId: string) => {
    const node = get().getNodeById(nodeId)
    if (!node || !node.children) return []
    
    return node.children
      .map(childId => get().getNodeById(childId))
      .filter((child): child is Node => child !== undefined)
  },

  getNodeParent: (nodeId: string) => {
    const node = get().getNodeById(nodeId)
    if (!node || !node.parent) return undefined
    
    return get().getNodeById(node.parent)
  },

  getNodeAncestors: (nodeId: string) => {
    const ancestors: Node[] = []
    let currentNode = get().getNodeById(nodeId)
    
    while (currentNode?.parent) {
      const parent = get().getNodeById(currentNode.parent)
      if (!parent || ancestors.some(a => a.id === parent.id)) break
      ancestors.push(parent)
      currentNode = parent
    }
    
    return ancestors
  },

  getNodeDescendants: (nodeId: string) => {
    const descendants: Node[] = []
    const toProcess = [nodeId]
    const processed = new Set<string>()
    
    while (toProcess.length > 0) {
      const currentId = toProcess.pop()!
      if (processed.has(currentId)) continue
      processed.add(currentId)
      
      const node = get().getNodeById(currentId)
      if (node && node.children) {
        node.children.forEach(childId => {
          const child = get().getNodeById(childId)
          if (child) {
            descendants.push(child)
            toProcess.push(childId)
          }
        })
      }
    }
    
    return descendants
  },

  clearNodes: () => {
    set({
      nodes: [],
      isLoading: false,
      error: null,
      selectedNodeId: null,
    })
  },
}))