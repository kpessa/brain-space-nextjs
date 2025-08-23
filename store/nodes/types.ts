import type { Node, NodeType, NodeUpdate } from '@/types/node'
import type { RecurringCompletion } from '@/types/recurrence'

// Base store state interface
export interface NodesStoreState {
  nodes: Node[]
  isLoading: boolean
  error: string | null
  selectedNodeId: string | null
}

// CRUD operations interface
export interface NodesCrudActions {
  loadNodes: (userId: string) => Promise<void>
  createNode: (node: Partial<Node>) => Promise<string | null>
  updateNode: (nodeId: string, updates: Partial<Node>) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  completeRecurringTask: (nodeId: string, date: string) => Promise<void>
  bulkUpdateNodes: (updates: Array<{ nodeId: string; updates: Partial<Node> }>) => Promise<void>
}

// Update operations interface
export interface NodesUpdateActions {
  addNodeUpdate: (nodeId: string, update: Partial<NodeUpdate>) => Promise<void>
  deleteNodeUpdate: (nodeId: string, updateId: string) => Promise<void>
}

// Relationship operations interface
export interface NodesRelationshipActions {
  linkAsChild: (parentId: string, childId: string) => Promise<void>
  linkAsParent: (childId: string, parentId: string) => Promise<void>
  unlinkNodes: (nodeId1: string, nodeId2: string) => Promise<void>
  createChildNode: (parentId: string, childData: Partial<Node>) => Promise<string | null>
  createParentNode: (childId: string, parentData: Partial<Node>) => Promise<string | null>
}

// Snooze operations interface
export interface NodesSnoozeActions {
  snoozeNode: (nodeId: string, until: Date) => Promise<void>
  unsnoozeNode: (nodeId: string) => Promise<void>
  getSnoozedNodes: () => Node[]
  getActiveSnoozedCount: () => number
  clearExpiredSnoozes: () => Promise<void>
}

// Utility operations interface
export interface NodesUtilityActions {
  getNodeById: (nodeId: string) => Node | undefined
  getNodesByType: (type: NodeType) => Node[]
  getNodesByTag: (tag: string) => Node[]
  getNodeChildren: (nodeId: string) => Node[]
  getNodeParent: (nodeId: string) => Node | undefined
  getNodeAncestors: (nodeId: string) => Node[]
  getNodeDescendants: (nodeId: string) => Node[]
  selectNode: (nodeId: string | null) => void
  toggleNodePin: (nodeId: string) => Promise<void>
  clearNodes: () => void
}

// Complete store interface combining all actions
export interface NodesStore extends 
  NodesStoreState,
  NodesCrudActions,
  NodesUpdateActions,
  NodesRelationshipActions,
  NodesSnoozeActions,
  NodesUtilityActions {}

// Store API for accessing get/set functions
export type StoreAPI<T> = {
  (): T
  <U>(selector: (state: T) => U): U
} & {
  setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void
  getState: () => T
}

// Helper type for store creation functions
export type CreateStoreSlice<T, U extends keyof T> = (
  set: StoreAPI<T>['setState'],
  get: StoreAPI<T>['getState']
) => Pick<T, U>
