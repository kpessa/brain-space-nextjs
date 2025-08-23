import type { Node, NodeType } from '@/types/node'
import type { NodesStore, NodesUtilityActions, CreateStoreSlice } from './types'

// Utility functions slice for node operations
export const createNodesUtilitySlice: CreateStoreSlice<NodesStore, keyof NodesUtilityActions> = (
  set,
  get
) => ({
  // Get a node by its ID
  getNodeById: (nodeId: string) => {
    return get().nodes.find(node => node.id === nodeId)
  },

  // Get nodes filtered by type
  getNodesByType: (type: NodeType) => {
    return get().nodes.filter(node => node.type === type)
  },

  // Get nodes filtered by tag
  getNodesByTag: (tag: string) => {
    return get().nodes.filter(node => node.tags?.includes(tag))
  },

  // Select a node for UI state
  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId })
  },

  // Get all children of a node
  getNodeChildren: (nodeId: string) => {
    const node = get().getNodeById(nodeId)
    if (!node || !node.children) return []
    
    return node.children
      .map(childId => get().getNodeById(childId))
      .filter((child): child is Node => child !== undefined)
  },

  // Get the parent of a node
  getNodeParent: (nodeId: string) => {
    const node = get().getNodeById(nodeId)
    if (!node || !node.parent) return undefined
    
    return get().getNodeById(node.parent)
  },

  // Get all ancestors of a node (walking up the parent chain)
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

  // Get all descendants of a node (walking down the children tree)
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
  
  // Toggle the pin status of a node
  toggleNodePin: async (nodeId: string) => {
    const node = get().getNodeById(nodeId)
    if (!node) {
      set({ error: 'Node not found' })
      return
    }
    
    await get().updateNode(nodeId, { isPinned: !node.isPinned })
  },

  // Clear all nodes and reset state
  clearNodes: () => {
    set({
      nodes: [],
      isLoading: false,
      error: null,
      selectedNodeId: null,
    })
  },
})