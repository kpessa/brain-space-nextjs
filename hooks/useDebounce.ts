import { useEffect, useState, useRef, useCallback } from 'react'

/**
 * Debounce a value
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounce a callback function
 * @param callback - The callback to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Debounced Firebase save hook
 * Batches multiple save operations and executes them after a delay
 */
export function useDebouncedFirebaseSave<T>(
  saveFunction: (data: T) => Promise<void>,
  delay: number = 1000
) {
  const pendingDataRef = useRef<T | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const executeSave = useCallback(async () => {
    if (!pendingDataRef.current) return

    const dataToSave = pendingDataRef.current
    pendingDataRef.current = null

    setIsSaving(true)
    setError(null)

    try {
      await saveFunction(dataToSave)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Save failed'))
      console.error('Firebase save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [saveFunction])

  const debouncedSave = useCallback(
    (data: T) => {
      // Update pending data
      pendingDataRef.current = data

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        executeSave()
      }, delay)
    },
    [delay, executeSave]
  )

  // Force save immediately (useful for onUnmount or critical saves)
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    return executeSave()
  }, [executeSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        // Save any pending data on unmount
        if (pendingDataRef.current) {
          executeSave()
        }
      }
    }
  }, [executeSave])

  return {
    save: debouncedSave,
    saveNow,
    isSaving,
    error
  }
}