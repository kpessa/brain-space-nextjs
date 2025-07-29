import { create } from 'zustand'
import type { Node, NodeType, NodeUpdate } from '@/types/node'
import type { RecurringCompletion, TaskType } from '@/types/recurrence'

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
  
  // Update Actions
  addNodeUpdate: (nodeId: string, update: Partial<NodeUpdate>) => Promise<void>
  deleteNodeUpdate: (nodeId: string, updateId: string) => Promise<void>
  
  // Bulk Actions
  bulkUpdateNodes: (updates: Array<{ nodeId: string; updates: Partial<Node> }>) => Promise<void>

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
      // Dynamically import Firebase to avoid SSR issues
      const { db } = await import('@/lib/firebase')
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore')
      
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
      console.error('Error loading nodes:', error)
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

      // Dynamically import Firebase to avoid SSR issues
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
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
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      
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
  
  // Add an update to a node
  addNodeUpdate: async (nodeId: string, update: Partial<NodeUpdate>) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }
    
    try {
      const updateId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newUpdate: NodeUpdate = {
        id: updateId,
        content: update.content || '',
        timestamp: new Date().toISOString(),
        userId: update.userId || node.userId,
        userName: update.userName,
        type: update.type || 'note',
        isPinned: update.isPinned || false,
      }
      
      const existingUpdates = node.updates || []
      const updatedUpdates = [...existingUpdates, newUpdate]
      
      await get().updateNode(nodeId, { updates: updatedUpdates })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  
  // Delete an update from a node
  deleteNodeUpdate: async (nodeId: string, updateId: string) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node || !node.updates) {
      set({ error: 'Node or update not found' })
      return
    }
    
    try {
      const updatedUpdates = node.updates.filter(u => u.id !== updateId)
      await get().updateNode(nodeId, { updates: updatedUpdates })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  // Delete a node
  deleteNode: async (nodeId: string) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }

    try {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { doc, deleteDoc, writeBatch, serverTimestamp } = await import('firebase/firestore')
      
      // Create a batch for all updates
      const batch = writeBatch(db)
      
      // Delete the node itself
      batch.delete(doc(db, 'users', node.userId, 'nodes', nodeId))
      
      // Clean up parent reference: If node has a parent, remove this node from parent's children array
      if (node.parent) {
        const parentNode = get().nodes.find(n => n.id === node.parent)
        if (parentNode && parentNode.children) {
          const updatedChildren = parentNode.children.filter(childId => childId !== nodeId)
          batch.update(doc(db, 'users', node.userId, 'nodes', node.parent), {
            children: updatedChildren,
            updatedAt: serverTimestamp()
          })
        }
      }
      
      // Clean up children references: Remove parent reference from all children
      if (node.children && node.children.length > 0) {
        node.children.forEach(childId => {
          const childNode = get().nodes.find(n => n.id === childId)
          if (childNode) {
            batch.update(doc(db, 'users', node.userId, 'nodes', childId), {
              parent: null,
              updatedAt: serverTimestamp()
            })
          }
        })
      }
      
      // Commit all changes
      await batch.commit()

      // Update local state
      const updatedNodes = get().nodes.map(n => {
        // Remove deleted node from parent's children array
        if (n.id === node.parent && n.children) {
          return {
            ...n,
            children: n.children.filter(childId => childId !== nodeId),
            updatedAt: new Date().toISOString()
          }
        }
        // Clear parent reference from children
        if (node.children?.includes(n.id)) {
          return {
            ...n,
            parent: null,
            updatedAt: new Date().toISOString()
          }
        }
        return n
      }).filter(n => n.id !== nodeId)
      
      set({ nodes: updatedNodes })

      // Clear selection if deleted node was selected
      if (get().selectedNodeId === nodeId) {
        set({ selectedNodeId: null })
      }
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  
  // Bulk update multiple nodes
  bulkUpdateNodes: async (updates: Array<{ nodeId: string; updates: Partial<Node> }>) => {
    try {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { writeBatch, doc, serverTimestamp } = await import('firebase/firestore')
      
      // Create a batch
      const batch = writeBatch(db)
      
      // Add each update to the batch
      updates.forEach(({ nodeId, updates: nodeUpdates }) => {
        const node = get().nodes.find(n => n.id === nodeId)
        if (node) {
          const nodeRef = doc(db, 'users', node.userId, 'nodes', nodeId)
          batch.update(nodeRef, {
            ...nodeUpdates,
            updatedAt: serverTimestamp(),
          })
        }
      })
      
      // Commit the batch
      await batch.commit()
      
      // Update local state optimistically
      const updatedNodes = get().nodes.map(node => {
        const update = updates.find(u => u.nodeId === node.id)
        if (update) {
          return { ...node, ...update.updates, updatedAt: new Date().toISOString() }
        }
        return node
      })
      
      set({ nodes: updatedNodes })
    } catch (error) {
      set({ error: (error as Error).message })
      // Reload to ensure consistency
      const userId = get().nodes[0]?.userId
      if (userId) {
        await get().loadNodes(userId)
      }
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
    
    if (!node1 || !node2) {
      console.error('unlinkNodes: One or both nodes not found', { nodeId1, nodeId2 })
      throw new Error('One or both nodes not found')
    }

    console.log('unlinkNodes: Starting unlink operation', {
      node1: { id: node1.id, title: node1.title, children: node1.children },
      node2: { id: node2.id, title: node2.title, parent: node2.parent }
    })

    try {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { writeBatch, doc, serverTimestamp } = await import('firebase/firestore')
      
      // Use a batch for atomic updates
      const batch = writeBatch(db)
      let actionsPerformed = []

      // Case 1: node1 is parent of node2 (most common case)
      if (node2.parent === nodeId1) {
        console.log('Unlinking: node2 has node1 as parent')
        
        // Remove parent reference from child
        batch.update(doc(db, 'users', node2.userId, 'nodes', nodeId2), {
          parent: null,
          updatedAt: serverTimestamp()
        })
        actionsPerformed.push(`Removed parent reference from "${node2.title}"`)
        
        // Remove child from parent's children array (if it exists)
        if (node1.children?.includes(nodeId2)) {
          const updatedChildren = node1.children.filter(id => id !== nodeId2)
          batch.update(doc(db, 'users', node1.userId, 'nodes', nodeId1), {
            children: updatedChildren,
            updatedAt: serverTimestamp()
          })
          actionsPerformed.push(`Removed "${node2.title}" from "${node1.title}"'s children`)
        } else {
          console.warn('Data inconsistency: Child has parent reference but parent doesn\'t have child in array')
          // Still update parent to ensure consistency
          batch.update(doc(db, 'users', node1.userId, 'nodes', nodeId1), {
            children: node1.children || [],
            updatedAt: serverTimestamp()
          })
        }
      }
      
      // Case 2: node2 is parent of node1 (when called in reverse)
      else if (node1.parent === nodeId2) {
        console.log('Unlinking: node1 has node2 as parent')
        
        // Remove parent reference from child
        batch.update(doc(db, 'users', node1.userId, 'nodes', nodeId1), {
          parent: null,
          updatedAt: serverTimestamp()
        })
        actionsPerformed.push(`Removed parent reference from "${node1.title}"`)
        
        // Remove child from parent's children array (if it exists)
        if (node2.children?.includes(nodeId1)) {
          const updatedChildren = node2.children.filter(id => id !== nodeId1)
          batch.update(doc(db, 'users', node2.userId, 'nodes', nodeId2), {
            children: updatedChildren,
            updatedAt: serverTimestamp()
          })
          actionsPerformed.push(`Removed "${node1.title}" from "${node2.title}"'s children`)
        }
      }
      
      // Case 3: Check for any parent-child relationship and fix it
      else {
        console.log('Checking for any parent-child relationships to fix')
        
        // Check if node1 has node2 in children (inconsistent state)
        if (node1.children?.includes(nodeId2)) {
          const updatedChildren = node1.children.filter(id => id !== nodeId2)
          batch.update(doc(db, 'users', node1.userId, 'nodes', nodeId1), {
            children: updatedChildren,
            updatedAt: serverTimestamp()
          })
          actionsPerformed.push(`Removed orphaned child reference to "${node2.title}" from "${node1.title}"`)
        }
        
        // Check if node2 has node1 in children (inconsistent state)
        if (node2.children?.includes(nodeId1)) {
          const updatedChildren = node2.children.filter(id => id !== nodeId1)
          batch.update(doc(db, 'users', node2.userId, 'nodes', nodeId2), {
            children: updatedChildren,
            updatedAt: serverTimestamp()
          })
          actionsPerformed.push(`Removed orphaned child reference to "${node1.title}" from "${node2.title}"`)
        }
      }
      
      if (actionsPerformed.length === 0) {
        console.log('No parent-child relationship found between these nodes')
        throw new Error('No parent-child relationship found between these nodes')
      }
      
      // Commit the batch
      await batch.commit()
      console.log('Unlink operation completed:', actionsPerformed)
      
      // Update local state optimistically
      const nodes = get().nodes.map(n => {
        if (n.id === nodeId1) {
          return {
            ...n,
            parent: n.parent === nodeId2 ? null : n.parent,
            children: n.children?.filter(id => id !== nodeId2) || [],
            updatedAt: new Date().toISOString()
          }
        }
        if (n.id === nodeId2) {
          return {
            ...n,
            parent: n.parent === nodeId1 ? null : n.parent,
            children: n.children?.filter(id => id !== nodeId1) || [],
            updatedAt: new Date().toISOString()
          }
        }
        return n
      })
      
      set({ nodes })
      
      return { success: true, actions: actionsPerformed }
    } catch (error) {
      console.error('Error in unlinkNodes:', error)
      set({ error: (error as Error).message })
      throw error
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