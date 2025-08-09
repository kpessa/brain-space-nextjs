import { useEffect, useCallback, useState } from 'react'

interface UseKeyboardNavigationProps {
  items: any[]
  onSelect: (item: any) => void
  onMove?: (item: any, direction: 'up' | 'down' | 'left' | 'right') => void
  onActivate?: (item: any) => void
  enabled?: boolean
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onMove,
  onActivate,
  enabled = true
}: UseKeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || items.length === 0) return

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (selectedItem && onMove) {
          onMove(selectedItem, 'up')
        } else {
          setFocusedIndex(prev => {
            const next = prev <= 0 ? items.length - 1 : prev - 1
            return next
          })
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (selectedItem && onMove) {
          onMove(selectedItem, 'down')
        } else {
          setFocusedIndex(prev => {
            const next = prev >= items.length - 1 ? 0 : prev + 1
            return next
          })
        }
        break

      case 'ArrowLeft':
        e.preventDefault()
        if (selectedItem && onMove) {
          onMove(selectedItem, 'left')
        }
        break

      case 'ArrowRight':
        e.preventDefault()
        if (selectedItem && onMove) {
          onMove(selectedItem, 'right')
        }
        break

      case ' ':
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          const item = items[focusedIndex]
          if (selectedItem === item) {
            // Deselect if already selected
            setSelectedItem(null)
            onSelect(null)
          } else {
            // Select the item
            setSelectedItem(item)
            onSelect(item)
          }
        }
        break

      case 'Escape':
        e.preventDefault()
        setSelectedItem(null)
        setFocusedIndex(-1)
        onSelect(null)
        break

      case 'x':
      case 'Delete':
        if (selectedItem && onActivate) {
          e.preventDefault()
          onActivate(selectedItem)
        }
        break

      case 'Tab':
        // Allow normal tab navigation but update focused index
        const direction = e.shiftKey ? -1 : 1
        setFocusedIndex(prev => {
          const next = prev + direction
          if (next < 0 || next >= items.length) {
            return -1 // Exit the list
          }
          return next
        })
        break
    }
  }, [enabled, items, focusedIndex, selectedItem, onSelect, onMove, onActivate])

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  // Reset focused index when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length - 1)
    }
  }, [items.length, focusedIndex])

  return {
    focusedIndex,
    selectedItem,
    setFocusedIndex,
    clearSelection: () => {
      setSelectedItem(null)
      setFocusedIndex(-1)
    }
  }
}