import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce, useDebouncedCallback, useDebouncedFirebaseSave } from '@/hooks/useDebounce'

describe('useDebounce hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('useDebounce', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500))
      expect(result.current).toBe('initial')
    })

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      expect(result.current).toBe('initial')

      // Change value
      rerender({ value: 'updated', delay: 500 })
      
      // Should still be initial value
      expect(result.current).toBe('initial')

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Now should be updated
      expect(result.current).toBe('updated')
    })

    it('should cancel previous timer on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      // Rapid changes
      rerender({ value: 'first', delay: 500 })
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      rerender({ value: 'second', delay: 500 })
      act(() => {
        jest.advanceTimersByTime(200)
      })
      
      rerender({ value: 'third', delay: 500 })
      
      // Still initial after 400ms total
      expect(result.current).toBe('initial')

      // Advance remaining time
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Should be the last value
      expect(result.current).toBe('third')
    })

    it('should handle delay changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      rerender({ value: 'updated', delay: 200 })

      act(() => {
        jest.advanceTimersByTime(200)
      })

      expect(result.current).toBe('updated')
    })

    it('should handle complex objects', () => {
      const initialObj = { id: 1, name: 'test' }
      const updatedObj = { id: 2, name: 'updated' }

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: initialObj, delay: 300 } }
      )

      expect(result.current).toEqual(initialObj)

      rerender({ value: updatedObj, delay: 300 })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(result.current).toEqual(updatedObj)
    })
  })

  describe('useDebouncedCallback', () => {
    it('should debounce callback execution', () => {
      const callback = jest.fn()
      const { result } = renderHook(() => useDebouncedCallback(callback, 500))

      // Call the debounced function multiple times
      act(() => {
        result.current('first')
        result.current('second')
        result.current('third')
      })

      // Callback should not be called yet
      expect(callback).not.toHaveBeenCalled()

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Should be called once with last arguments
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith('third')
    })

    it('should handle multiple arguments', () => {
      const callback = jest.fn()
      const { result } = renderHook(() => useDebouncedCallback(callback, 300))

      act(() => {
        result.current('arg1', 'arg2', { key: 'value' })
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' })
    })

    it('should cancel on unmount', () => {
      const callback = jest.fn()
      const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500))

      act(() => {
        result.current('test')
      })

      // Unmount before timeout
      unmount()

      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle callback updates', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      const { result, rerender } = renderHook(
        ({ cb, delay }) => useDebouncedCallback(cb, delay),
        { initialProps: { cb: callback1, delay: 500 } }
      )

      act(() => {
        result.current('test')
      })

      // Update callback before timeout
      rerender({ cb: callback2, delay: 500 })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      // New callback should be called
      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalledWith('test')
    })

    it('should reset timer on each call', () => {
      const callback = jest.fn()
      const { result } = renderHook(() => useDebouncedCallback(callback, 500))

      act(() => {
        result.current('first')
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      act(() => {
        result.current('second')
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      // Still not called after 800ms total (but only 400ms since last call)
      expect(callback).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(100)
      })

      // Now called after 500ms from last call
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith('second')
    })
  })

  describe('useDebouncedFirebaseSave', () => {
    it('should debounce save operations', async () => {
      const saveFunction = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => 
        useDebouncedFirebaseSave(saveFunction, 500)
      )

      // Initial state
      expect(result.current.isSaving).toBe(false)
      expect(result.current.error).toBe(null)

      // Trigger multiple saves
      act(() => {
        result.current.save({ data: 'first' })
        result.current.save({ data: 'second' })
        result.current.save({ data: 'third' })
      })

      // Should not save yet
      expect(saveFunction).not.toHaveBeenCalled()

      // Advance timers
      await act(async () => {
        jest.advanceTimersByTime(500)
      })

      // Should save once with last data
      await waitFor(() => {
        expect(saveFunction).toHaveBeenCalledTimes(1)
        expect(saveFunction).toHaveBeenCalledWith({ data: 'third' })
      })
    })

    it('should handle saveNow for immediate saves', async () => {
      const saveFunction = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => 
        useDebouncedFirebaseSave(saveFunction, 1000)
      )

      // Queue a save
      act(() => {
        result.current.save({ data: 'pending' })
      })

      // Save immediately
      await act(async () => {
        await result.current.saveNow()
      })

      expect(saveFunction).toHaveBeenCalledTimes(1)
      expect(saveFunction).toHaveBeenCalledWith({ data: 'pending' })
    })

    it('should handle save errors', async () => {
      const error = new Error('Firebase error')
      const saveFunction = jest.fn().mockRejectedValue(error)
      
      const { result } = renderHook(() => 
        useDebouncedFirebaseSave(saveFunction, 300)
      )

      act(() => {
        result.current.save({ data: 'error test' })
      })

      await act(async () => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.error).toEqual(error)
        expect(result.current.isSaving).toBe(false)
      })
    })

    it('should set isSaving state correctly', async () => {
      let resolveSave: () => void
      const saveFunction = jest.fn(() => new Promise<void>(resolve => {
        resolveSave = resolve
      }))
      
      const { result } = renderHook(() => 
        useDebouncedFirebaseSave(saveFunction, 200)
      )

      act(() => {
        result.current.save({ data: 'test' })
      })

      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true)
      })

      // Resolve the save
      await act(async () => {
        resolveSave!()
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
      })
    })

    it('should save pending data on unmount', async () => {
      const saveFunction = jest.fn().mockResolvedValue(undefined)
      const { result, unmount } = renderHook(() => 
        useDebouncedFirebaseSave(saveFunction, 1000)
      )

      act(() => {
        result.current.save({ data: 'unmount test' })
      })

      // Unmount before timeout
      unmount()

      // executeSave is called synchronously on unmount
      // but the actual save is async, so we need to wait
      await waitFor(() => {
        expect(saveFunction).toHaveBeenCalledWith({ data: 'unmount test' })
      })
    })

    it('should batch multiple rapid saves', async () => {
      const saveFunction = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => 
        useDebouncedFirebaseSave(saveFunction, 500)
      )

      // Rapid saves
      act(() => {
        result.current.save({ id: 1, value: 'a' })
      })

      act(() => {
        jest.advanceTimersByTime(200)
      })

      act(() => {
        result.current.save({ id: 1, value: 'b' })
      })

      act(() => {
        jest.advanceTimersByTime(200)
      })

      act(() => {
        result.current.save({ id: 1, value: 'c' })
      })

      // Should not have saved yet
      expect(saveFunction).not.toHaveBeenCalled()

      await act(async () => {
        jest.advanceTimersByTime(500)
      })

      // Should save once with final value
      await waitFor(() => {
        expect(saveFunction).toHaveBeenCalledTimes(1)
        expect(saveFunction).toHaveBeenCalledWith({ id: 1, value: 'c' })
      })
    })

    it('should handle non-Error objects in catch', async () => {
      const saveFunction = jest.fn().mockRejectedValue('String error')
      
      const { result } = renderHook(() => 
        useDebouncedFirebaseSave(saveFunction, 200)
      )

      act(() => {
        result.current.save({ data: 'test' })
      })

      await act(async () => {
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        expect(result.current.error).toEqual(new Error('Save failed'))
      })
    })
  })
})