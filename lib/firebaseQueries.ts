import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface PaginationOptions {
  pageSize?: number
  orderByField?: string
  orderDirection?: 'asc' | 'desc'
  filters?: Array<{ field: string; operator: any; value: any }>
}

export interface PaginatedResult<T> {
  data: T[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  totalFetched: number
}

/**
 * Generic paginated query helper
 */
export async function paginatedQuery<T>(
  collectionPath: string,
  options: PaginationOptions,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<T>> {
  const {
    pageSize = 20,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    filters = [],
  } = options

  // Build query constraints
  const constraints: QueryConstraint[] = []

  // Add filters
  filters.forEach(filter => {
    constraints.push(where(filter.field, filter.operator, filter.value))
  })

  // Add ordering
  constraints.push(orderBy(orderByField, orderDirection))

  // Add pagination
  if (lastDoc) {
    constraints.push(startAfter(lastDoc))
  }
  constraints.push(limit(pageSize + 1)) // Fetch one extra to check if there are more

  // Execute query
  const q = query(collection(db, collectionPath), ...constraints)
  const snapshot = await getDocs(q)

  // Process results
  const data: T[] = []
  let hasMore = false

  snapshot.docs.forEach((doc, index) => {
    if (index < pageSize) {
      data.push({
        id: doc.id,
        ...doc.data(),
      } as T)
    } else {
      hasMore = true
    }
  })

  const newLastDoc = snapshot.docs[Math.min(snapshot.docs.length - 1, pageSize - 1)] || null

  return {
    data,
    lastDoc: newLastDoc,
    hasMore,
    totalFetched: data.length,
  }
}

/**
 * Paginated nodes query
 */
export async function getNodesPaginated(
  userId: string,
  options: PaginationOptions & { nodeType?: string },
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<any>> {
  const filters = options.filters || []
  
  if (options.nodeType) {
    filters.push({ field: 'type', operator: '==', value: options.nodeType })
  }

  return paginatedQuery(
    `users/${userId}/nodes`,
    { ...options, filters },
    lastDoc
  )
}

/**
 * Batch fetch documents by IDs
 */
export async function batchGetDocuments<T>(
  collectionPath: string,
  ids: string[]
): Promise<Map<string, T>> {
  const results = new Map<string, T>()
  
  // Firestore has a limit of 10 for 'in' queries, so we need to batch
  const chunks = []
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10))
  }

  const promises = chunks.map(async chunk => {
    const q = query(
      collection(db, collectionPath),
      where('__name__', 'in', chunk)
    )
    const snapshot = await getDocs(q)
    snapshot.docs.forEach(doc => {
      results.set(doc.id, {
        id: doc.id,
        ...doc.data(),
      } as T)
    })
  })

  await Promise.all(promises)
  return results
}

/**
 * Cursor-based pagination for real-time updates
 */
export class CursorPagination<T> {
  private cache = new Map<number, T[]>()
  private cursors = new Map<number, DocumentSnapshot>()
  private pageSize: number
  private collectionPath: string
  private baseConstraints: QueryConstraint[]

  constructor(
    collectionPath: string,
    pageSize: number = 20,
    baseConstraints: QueryConstraint[] = []
  ) {
    this.collectionPath = collectionPath
    this.pageSize = pageSize
    this.baseConstraints = baseConstraints
  }

  async getPage(pageNumber: number): Promise<T[]> {
    // Check cache
    if (this.cache.has(pageNumber)) {
      return this.cache.get(pageNumber)!
    }

    // Get cursor for previous page
    const previousCursor = pageNumber > 0 ? this.cursors.get(pageNumber - 1) : null

    // Build query
    const constraints = [...this.baseConstraints]
    if (previousCursor) {
      constraints.push(startAfter(previousCursor))
    }
    constraints.push(limit(this.pageSize))

    // Execute query
    const q = query(collection(db, this.collectionPath), ...constraints)
    const snapshot = await getDocs(q)

    // Process results
    const data: T[] = []
    snapshot.docs.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data(),
      } as T)
    })

    // Cache results and cursor
    this.cache.set(pageNumber, data)
    if (snapshot.docs.length > 0) {
      this.cursors.set(pageNumber, snapshot.docs[snapshot.docs.length - 1])
    }

    return data
  }

  clearCache() {
    this.cache.clear()
    this.cursors.clear()
  }

  invalidatePage(pageNumber: number) {
    this.cache.delete(pageNumber)
    // Also invalidate subsequent pages as they may have shifted
    for (let i = pageNumber + 1; this.cache.has(i); i++) {
      this.cache.delete(i)
      this.cursors.delete(i)
    }
  }
}

/**
 * Infinite scroll hook helper
 */
export interface InfiniteScrollData<T> {
  items: T[]
  loadMore: () => Promise<void>
  hasMore: boolean
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

import { useState, useCallback, useEffect } from 'react'

export function useInfiniteFirestoreQuery<T>(
  collectionPath: string,
  options: PaginationOptions
): InfiniteScrollData<T> {
  const [items, setItems] = useState<T[]>([])
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await paginatedQuery<T>(
        collectionPath,
        options,
        lastDoc
      )

      setItems(prev => [...prev, ...result.data])
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
    } finally {
      setIsLoading(false)
    }
  }, [collectionPath, options, lastDoc, isLoading, hasMore])

  const refresh = useCallback(async () => {
    setItems([])
    setLastDoc(null)
    setHasMore(true)
    setError(null)
    
    setIsLoading(true)
    try {
      const result = await paginatedQuery<T>(
        collectionPath,
        options,
        null
      )

      setItems(result.data)
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
    } finally {
      setIsLoading(false)
    }
  }, [collectionPath, options])

  // Load initial data
  useEffect(() => {
    refresh()
  }, []) // Only run once on mount

  return {
    items,
    loadMore,
    hasMore,
    isLoading,
    error,
    refresh,
  }
}