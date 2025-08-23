import type { NodeUpdate } from '@/types/node'
import type { NodesStore, NodesUpdateActions, CreateStoreSlice } from './types'

// Node updates operations slice
export const createNodesUpdateSlice: CreateStoreSlice<NodesStore, keyof NodesUpdateActions> = (
  set,
  get
) => ({
  // Add an update to a node
  addNodeUpdate: async (nodeId: string, update: Partial<NodeUpdate>) => {
    const node = get().nodes.find(n => n.id === nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }
    
    try {
      // Generate unique ID using crypto.randomUUID() - security improvement
      const updateId = crypto.randomUUID()
      
      // Build the update object without undefined values
      const newUpdate: NodeUpdate = {
        id: updateId,
        content: update.content || '',
        timestamp: update.timestamp || new Date().toISOString(),
        userId: update.userId || node.userId,
        type: update.type || 'note',
      }
      
      // Only add optional fields if they have values
      const authorName = update.author || update.userName || 'User'
      if (authorName) {
        newUpdate.author = authorName
        newUpdate.userName = authorName
      }
      
      if (update.isPinned !== undefined) {
        newUpdate.isPinned = update.isPinned
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
})