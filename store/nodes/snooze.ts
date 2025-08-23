import type { Node } from '@/types/node'
import type { NodesStore, NodesSnoozeActions, CreateStoreSlice } from './types'

// Snooze functionality slice
export const createNodesSnoozeSlice: CreateStoreSlice<NodesStore, keyof NodesSnoozeActions> = (
  set,
  get
) => ({
  // Snooze a node until a specific date
  snoozeNode: async (nodeId: string, until: Date) => {
    const node = get().getNodeById(nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }
    
    await get().updateNode(nodeId, { snoozedUntil: until.toISOString() })
  },
  
  // Remove snooze from a node
  unsnoozeNode: async (nodeId: string) => {
    const node = get().getNodeById(nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }
    
    await get().updateNode(nodeId, { snoozedUntil: undefined })
  },
  
  // Get all currently snoozed nodes
  getSnoozedNodes: () => {
    const now = new Date()
    return get().nodes.filter(node => 
      node.snoozedUntil && new Date(node.snoozedUntil) > now
    )
  },
  
  // Get count of actively snoozed nodes
  getActiveSnoozedCount: () => {
    const now = new Date()
    return get().nodes.filter(node => 
      node.snoozedUntil && new Date(node.snoozedUntil) > now
    ).length
  },
  
  // Clear expired snoozes
  clearExpiredSnoozes: async () => {
    const now = new Date()
    const expiredNodes = get().nodes.filter(node => 
      node.snoozedUntil && new Date(node.snoozedUntil) <= now
    )
    
    // Batch update to clear expired snoozes
    for (const node of expiredNodes) {
      await get().updateNode(node.id, { snoozedUntil: undefined })
    }
  },
})