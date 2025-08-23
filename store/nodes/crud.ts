import type { Node, NodeUpdate } from '@/types/node'
import type { RecurringCompletion } from '@/types/recurrence'
import type { NodesStore, NodesCrudActions, CreateStoreSlice } from './types'

// CRUD operations slice for the nodes store
export const createNodesCrudSlice: CreateStoreSlice<NodesStore, keyof NodesCrudActions> = (
  set,
  get
) => ({
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
        
        // Debug: Only log nodes with relationships
        if (data.parent || (data.children && data.children.length > 0)) {
          // Debug logging removed as per project standards
        }
        
        const nodeData = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          // Explicitly include fields that might be undefined
          taskType: data.taskType || undefined,
          recurrence: data.recurrence || undefined,
          recurringCompletions: data.recurringCompletions || undefined,
          currentStreak: data.currentStreak || undefined,
          longestStreak: data.longestStreak || undefined,
          lastRecurringCompletionDate: data.lastRecurringCompletionDate || undefined,
        } as Node
        
        nodes.push(nodeData)
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

  // Create a new node with optimistic updates
  createNode: async (nodeData: Partial<Node>) => {
    if (!nodeData.userId) {
      set({ error: 'User not authenticated' })
      return null
    }

    // Generate unique ID using crypto.randomUUID() - security improvement
    const nodeId = crypto.randomUUID()
    
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
      isOptimistic: true, // Flag for UI feedback
    }

    // Only add optional fields if they're defined
    if (nodeData.description !== undefined) newNode.description = nodeData.description
    if (nodeData.urgency !== undefined) newNode.urgency = nodeData.urgency
    if (nodeData.importance !== undefined) newNode.importance = nodeData.importance
    if (nodeData.dueDate !== undefined) newNode.dueDate = nodeData.dueDate
    if (nodeData.parent !== undefined) newNode.parent = nodeData.parent
    if (nodeData.children !== undefined) newNode.children = nodeData.children
    if (nodeData.isPersonal !== undefined) newNode.isPersonal = nodeData.isPersonal

    // 1. OPTIMISTIC UPDATE: Add to UI immediately
    const optimisticNodes = [...get().nodes, newNode]
    set({ nodes: optimisticNodes })

    try {
      // 2. PERSISTENCE: Save to Firestore
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      // Create a clean object for Firestore (no undefined values)
      const firestoreData = Object.entries(newNode).reduce((acc, [key, value]) => {
        if (value !== undefined && key !== 'isOptimistic') {
          acc[key] = value
        }
        return acc
      }, {} as any)

      await setDoc(doc(db, 'users', nodeData.userId, 'nodes', nodeId), {
        ...firestoreData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 3. SUCCESS: Remove optimistic flag
      const successNodes = get().nodes.map(n => 
        n.id === nodeId 
          ? { ...n, isOptimistic: undefined }
          : n
      )
      set({ nodes: successNodes, error: null })

      return nodeId
    } catch (error) {
      // 4. ROLLBACK: Remove failed node from UI
      const rollbackNodes = get().nodes.filter(n => n.id !== nodeId)
      set({ 
        nodes: rollbackNodes, 
        error: `Failed to create node: ${(error as Error).message}`
      })
      
      // Clear error after 5 seconds
      setTimeout(() => {
        set({ error: null })
      }, 5000)
      
      return null
    }
  },

  // Update an existing node with optimistic updates
  updateNode: async (nodeId: string, updates: Partial<Node>) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }

    // Store the original node for rollback
    const originalNode = { ...node }

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    const optimisticNodes = get().nodes.map(n => 
      n.id === nodeId 
        ? { ...n, ...updates, updatedAt: new Date().toISOString() } 
        : n
    )
    set({ nodes: optimisticNodes })

    try {
      // 2. PERSISTENCE: Save to Firestore
      const { db } = await import('@/lib/firebase')
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      
      const firestoreUpdate = {
        ...updates,
        updatedAt: serverTimestamp(),
      }

      await updateDoc(doc(db, 'users', node.userId, 'nodes', nodeId), firestoreUpdate)

      // 3. SUCCESS: Update with server timestamp
      const successNodes = get().nodes.map(n => 
        n.id === nodeId 
          ? { ...n, ...updates, updatedAt: new Date().toISOString() } 
          : n
      )
      set({ nodes: successNodes, error: null })
    } catch (error) {
      // 4. ROLLBACK: Restore original state on failure
      const rollbackNodes = get().nodes.map(n => 
        n.id === nodeId ? originalNode : n
      )
      set({ 
        nodes: rollbackNodes, 
        error: `Failed to update node: ${(error as Error).message}`
      })
      
      // Clear error after 5 seconds
      setTimeout(() => {
        set({ error: null })
      }, 5000)
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
})