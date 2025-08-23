import { create } from 'zustand'
import type { NodesStore } from './types'
import { createNodesCrudSlice } from './crud'
import { createNodesUpdateSlice } from './updates'
import { createNodesRelationshipSlice } from './relationships'
import { createNodesSnoozeSlice } from './snooze'
import { createNodesUtilitySlice } from './utilities'

// Main nodes store that composes all domain slices
export const useNodesStore = create<NodesStore>((set, get) => ({
  // Initial state
  nodes: [],
  isLoading: false,
  error: null,
  selectedNodeId: null,

  // Compose all domain slices
  ...createNodesCrudSlice(set, get),
  ...createNodesUpdateSlice(set, get),
  ...createNodesRelationshipSlice(set, get),
  ...createNodesSnoozeSlice(set, get),
  ...createNodesUtilitySlice(set, get),
}))

// Export types for external use
export type { NodesStore } from './types'

// Re-export individual slices for testing purposes
export {
  createNodesCrudSlice,
  createNodesUpdateSlice,
  createNodesRelationshipSlice,
  createNodesSnoozeSlice,
  createNodesUtilitySlice,
}