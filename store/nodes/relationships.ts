import type { Node } from '@/types/node'
import type { NodesStore, NodesRelationshipActions, CreateStoreSlice } from './types'

// Relationship management slice for parent/child node linking
export const createNodesRelationshipSlice: CreateStoreSlice<NodesStore, keyof NodesRelationshipActions> = (
  set,
  get
) => ({
  // Link a node as a child to a parent
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

  // Link a node as a parent to a child (reverse of linkAsChild)
  linkAsParent: async (childId: string, parentId: string) => {
    await get().linkAsChild(parentId, childId)
  },

  // Unlink two related nodes
  unlinkNodes: async (nodeId1: string, nodeId2: string) => {
    const node1 = get().getNodeById(nodeId1)
    const node2 = get().getNodeById(nodeId2)
    
    if (!node1 || !node2) {
      throw new Error('One or both nodes not found')
    }

    try {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { writeBatch, doc, serverTimestamp } = await import('firebase/firestore')
      
      // Use a batch for atomic updates
      const batch = writeBatch(db)
      let actionsPerformed = []

      // Case 1: node1 is parent of node2 (most common case)
      if (node2.parent === nodeId1) {
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
          // Still update parent to ensure consistency
          batch.update(doc(db, 'users', node1.userId, 'nodes', nodeId1), {
            children: node1.children || [],
            updatedAt: serverTimestamp()
          })
        }
      }
      
      // Case 2: node2 is parent of node1 (when called in reverse)
      else if (node1.parent === nodeId2) {
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
        throw new Error('No parent-child relationship found between these nodes')
      }
      
      // Commit the batch
      await batch.commit()

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
      set({ error: (error as Error).message })
      throw error
    }
  },

  // Create a new child node for a parent
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

  // Create a new parent node for a child
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
})