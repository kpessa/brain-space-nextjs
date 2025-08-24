import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  orderBy,
  DocumentData,
  Unsubscribe,
  FieldValue,
  QuerySnapshot,
  DocumentSnapshot,
  FirestoreError
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Node } from '@/types/node'
import { useNodesStore } from '@/store/nodes'

export interface SyncOptions {
  userId: string
  onError?: (error: FirestoreError) => void
  onSync?: (status: 'syncing' | 'synced' | 'error') => void
}

export interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  timestamp: number
  rollback: () => void
}

class RealtimeSyncService {
  private subscriptions = new Map<string, Unsubscribe>()
  private pendingUpdates = new Map<string, OptimisticUpdate<any>>()
  private syncStatus: 'idle' | 'syncing' | 'synced' | 'error' = 'idle'
  private retryTimeouts = new Map<string, NodeJS.Timeout>()
  private conflictResolution: 'local' | 'remote' | 'merge' = 'merge'

  /**
   * Start real-time synchronization for user nodes
   */
  startNodeSync(options: SyncOptions): () => void {
    const { userId, onError, onSync } = options
    const collectionPath = `users/${userId}/nodes`

    // Create query for user's nodes
    const nodesQuery = query(
      collection(db, collectionPath),
      orderBy('updatedAt', 'desc')
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      nodesQuery,
      (snapshot) => {
        this.handleNodesSnapshot(snapshot, userId)
        onSync?.('synced')
      },
      (error) => {
        console.error('Node sync error:', error)
        this.syncStatus = 'error'
        onError?.(error)
        onSync?.('error')
        
        // Retry connection after delay
        this.scheduleRetry(() => this.startNodeSync(options), 'nodes')
      }
    )

    // Store subscription
    this.subscriptions.set(`nodes-${userId}`, unsubscribe)

    // Return cleanup function
    return () => {
      this.stopNodeSync(userId)
    }
  }

  /**
   * Handle snapshot updates from Firestore
   */
  private handleNodesSnapshot(snapshot: QuerySnapshot<DocumentData>, userId: string) {
    const store = useNodesStore.getState()
    const changes = {
      added: [] as Node[],
      modified: [] as Node[],
      removed: [] as string[]
    }

    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data()
      const node: Node = {
        id: change.doc.id,
        userId,
        type: data.type || 'note',
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        completed: data.completed || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isPersonal: data.isPersonal,
        urgency: data.urgency,
        importance: data.importance,
        parentId: data.parentId,
        childIds: data.childIds || [],
        pinned: data.pinned,
        snoozedUntil: data.snoozedUntil?.toDate(),
        updates: data.updates || []
      }

      switch (change.type) {
        case 'added':
          // Check if this is truly new or just initial load
          if (!store.nodes.find(n => n.id === node.id)) {
            changes.added.push(node)
          }
          break
        case 'modified':
          changes.modified.push(node)
          break
        case 'removed':
          changes.removed.push(change.doc.id)
          break
      }
    })

    // Apply changes to store
    if (changes.added.length > 0) {
      changes.added.forEach(node => store.addNode(node))
    }
    if (changes.modified.length > 0) {
      changes.modified.forEach(node => {
        // Handle conflict resolution
        const localNode = store.nodes.find(n => n.id === node.id)
        if (localNode && this.hasConflict(localNode, node)) {
          const resolved = this.resolveConflict(localNode, node)
          store.updateNode(node.id, resolved)
        } else {
          store.updateNode(node.id, node)
        }
      })
    }
    if (changes.removed.length > 0) {
      changes.removed.forEach(id => store.deleteNode(id))
    }
  }

  /**
   * Create a node with optimistic update
   */
  async createNodeOptimistic(userId: string, node: Omit<Node, 'id' | 'userId'>): Promise<string> {
    const store = useNodesStore.getState()
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    // Optimistic update
    const optimisticNode: Node = {
      ...node,
      id: tempId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    store.addNode(optimisticNode)
    
    // Store rollback function
    this.pendingUpdates.set(tempId, {
      id: tempId,
      type: 'create',
      data: optimisticNode,
      timestamp: Date.now(),
      rollback: () => store.deleteNode(tempId)
    })

    try {
      // Create in Firestore
      const docRef = doc(collection(db, `users/${userId}/nodes`))
      await setDoc(docRef, {
        ...node,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Update local store with real ID
      store.updateNode(tempId, { id: docRef.id })
      this.pendingUpdates.delete(tempId)
      
      return docRef.id
    } catch (error) {
      // Rollback on error
      this.rollbackOptimisticUpdate(tempId)
      throw error
    }
  }

  /**
   * Update a node with optimistic update
   */
  async updateNodeOptimistic(
    userId: string, 
    nodeId: string, 
    updates: Partial<Node>
  ): Promise<void> {
    const store = useNodesStore.getState()
    const originalNode = store.nodes.find(n => n.id === nodeId)
    
    if (!originalNode) {
      throw new Error(`Node ${nodeId} not found`)
    }

    // Optimistic update
    store.updateNode(nodeId, updates)
    
    // Store rollback function
    this.pendingUpdates.set(nodeId, {
      id: nodeId,
      type: 'update',
      data: originalNode,
      timestamp: Date.now(),
      rollback: () => store.updateNode(nodeId, originalNode)
    })

    try {
      // Update in Firestore
      const docRef = doc(db, `users/${userId}/nodes`, nodeId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      
      this.pendingUpdates.delete(nodeId)
    } catch (error) {
      // Rollback on error
      this.rollbackOptimisticUpdate(nodeId)
      throw error
    }
  }

  /**
   * Delete a node with optimistic update
   */
  async deleteNodeOptimistic(userId: string, nodeId: string): Promise<void> {
    const store = useNodesStore.getState()
    const originalNode = store.nodes.find(n => n.id === nodeId)
    
    if (!originalNode) {
      throw new Error(`Node ${nodeId} not found`)
    }

    // Optimistic update
    store.deleteNode(nodeId)
    
    // Store rollback function
    this.pendingUpdates.set(nodeId, {
      id: nodeId,
      type: 'delete',
      data: originalNode,
      timestamp: Date.now(),
      rollback: () => store.addNode(originalNode)
    })

    try {
      // Delete from Firestore
      const docRef = doc(db, `users/${userId}/nodes`, nodeId)
      await deleteDoc(docRef)
      
      this.pendingUpdates.delete(nodeId)
    } catch (error) {
      // Rollback on error
      this.rollbackOptimisticUpdate(nodeId)
      throw error
    }
  }

  /**
   * Batch update multiple nodes
   */
  async batchUpdateNodes(
    userId: string,
    updates: Array<{ id: string; changes: Partial<Node> }>
  ): Promise<void> {
    const batch = writeBatch(db)
    
    updates.forEach(({ id, changes }) => {
      const docRef = doc(db, `users/${userId}/nodes`, id)
      batch.update(docRef, {
        ...changes,
        updatedAt: serverTimestamp()
      })
    })

    await batch.commit()
  }

  /**
   * Rollback an optimistic update
   */
  private rollbackOptimisticUpdate(id: string) {
    const update = this.pendingUpdates.get(id)
    if (update) {
      update.rollback()
      this.pendingUpdates.delete(id)
    }
  }

  /**
   * Check if there's a conflict between local and remote versions
   */
  private hasConflict(local: Node, remote: Node): boolean {
    // Simple timestamp-based conflict detection
    // In production, you might want more sophisticated detection
    return local.updatedAt.getTime() !== remote.updatedAt.getTime()
  }

  /**
   * Resolve conflicts between local and remote versions
   */
  private resolveConflict(local: Node, remote: Node): Partial<Node> {
    switch (this.conflictResolution) {
      case 'local':
        // Keep local changes
        return { ...local, updatedAt: remote.updatedAt }
      
      case 'remote':
        // Use remote changes
        return remote
      
      case 'merge':
      default:
        // Merge strategy: combine both versions
        // This is a simple example - you might want more sophisticated merging
        return {
          ...remote,
          // Preserve local changes if they're newer
          title: local.updatedAt > remote.updatedAt ? local.title : remote.title,
          description: local.updatedAt > remote.updatedAt ? local.description : remote.description,
          // Always use latest updated timestamp
          updatedAt: remote.updatedAt
        }
    }
  }

  /**
   * Schedule a retry for failed operations
   */
  private scheduleRetry(operation: () => void, key: string, delay: number = 5000) {
    // Clear existing timeout if any
    const existingTimeout = this.retryTimeouts.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule new retry
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(key)
      operation()
    }, delay)

    this.retryTimeouts.set(key, timeout)
  }

  /**
   * Stop node synchronization
   */
  stopNodeSync(userId: string) {
    const key = `nodes-${userId}`
    const unsubscribe = this.subscriptions.get(key)
    
    if (unsubscribe) {
      unsubscribe()
      this.subscriptions.delete(key)
    }

    // Clear any pending retries
    const retryTimeout = this.retryTimeouts.get(key)
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      this.retryTimeouts.delete(key)
    }
  }

  /**
   * Stop all synchronization
   */
  stopAllSync() {
    // Unsubscribe from all listeners
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions.clear()

    // Clear all pending updates
    this.pendingUpdates.clear()

    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()

    this.syncStatus = 'idle'
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): string {
    return this.syncStatus
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolution(strategy: 'local' | 'remote' | 'merge') {
    this.conflictResolution = strategy
  }
}

// Export singleton instance
export const realtimeSync = new RealtimeSyncService()

// Export hook for React components
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export function useRealtimeSync() {
  const { user } = useAuth()
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const [syncError, setSyncError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user?.uid) return

    setSyncStatus('syncing')
    
    const cleanup = realtimeSync.startNodeSync({
      userId: user.uid,
      onSync: setSyncStatus,
      onError: (error) => {
        setSyncError(new Error(error.message))
        setSyncStatus('error')
      }
    })

    return () => {
      cleanup()
      setSyncStatus('idle')
    }
  }, [user?.uid])

  return {
    syncStatus,
    syncError,
    createNode: (node: Omit<Node, 'id' | 'userId'>) => 
      realtimeSync.createNodeOptimistic(user!.uid, node),
    updateNode: (nodeId: string, updates: Partial<Node>) =>
      realtimeSync.updateNodeOptimistic(user!.uid, nodeId, updates),
    deleteNode: (nodeId: string) =>
      realtimeSync.deleteNodeOptimistic(user!.uid, nodeId),
    batchUpdate: (updates: Array<{ id: string; changes: Partial<Node> }>) =>
      realtimeSync.batchUpdateNodes(user!.uid, updates),
    setConflictResolution: realtimeSync.setConflictResolution.bind(realtimeSync)
  }
}