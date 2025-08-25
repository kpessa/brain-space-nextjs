'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNodesStore } from '@/store/nodes'
import { RealtimeSyncService } from '@/services/realtimeSync'

interface UseRealtimeSyncOptions {
  enabled?: boolean
  conflictStrategy?: 'local' | 'remote' | 'merge'
  enableOptimistic?: boolean
  batchUpdates?: boolean
}

/**
 * Hook to enable real-time synchronization for nodes
 * Provides automatic multi-device sync with conflict resolution
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { user } = useAuth()
  const syncServiceRef = useRef<RealtimeSyncService | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  
  const {
    enabled = true,
    conflictStrategy = 'merge',
    enableOptimistic = true,
    batchUpdates = true
  } = options

  useEffect(() => {
    if (!user?.uid || !enabled) {
      return
    }

    // Initialize sync service if not already created
    if (!syncServiceRef.current) {
      syncServiceRef.current = new RealtimeSyncService()
      
      // Configure sync service
      if (conflictStrategy) {
        syncServiceRef.current.setConflictResolution(conflictStrategy)
      }
      if (enableOptimistic !== undefined) {
        syncServiceRef.current.setOptimisticUpdates(enableOptimistic)
      }
      if (batchUpdates !== undefined) {
        syncServiceRef.current.setBatchUpdates(batchUpdates)
      }
    }

    // Start real-time synchronization
    cleanupRef.current = syncServiceRef.current.startNodeSync({
      userId: user.uid,
      onError: (error) => {
        console.error('Real-time sync error:', error)
        // Could trigger a toast notification here
      },
      onSync: (status) => {
        // Update UI to show sync status
        if (status === 'syncing') {
          // Show syncing indicator
        } else if (status === 'synced') {
          // Show synced indicator
        } else if (status === 'error') {
          // Show error state
        }
      }
    })

    // Cleanup on unmount or user change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [user?.uid, enabled, conflictStrategy, enableOptimistic, batchUpdates])

  // Return sync service methods for manual control
  return {
    syncService: syncServiceRef.current,
    forceSync: () => syncServiceRef.current?.forceSync(),
    pauseSync: () => syncServiceRef.current?.pauseSync(),
    resumeSync: () => syncServiceRef.current?.resumeSync(),
    getSyncStatus: () => syncServiceRef.current?.getSyncStatus() || 'idle',
    getPendingUpdates: () => syncServiceRef.current?.getPendingUpdates() || [],
    clearPendingUpdates: () => syncServiceRef.current?.clearPendingUpdates()
  }
}