'use client'

import { ReactNode, KeyboardEvent, FocusEvent, useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AccessibleDragDropProps {
  children: ReactNode
  draggable?: boolean
  droppable?: boolean
  onDragStart?: (data: any) => void
  onDragEnd?: () => void
  onDrop?: (data: any) => void
  onDragOver?: () => void
  onDragLeave?: () => void
  onKeyboardMove?: (direction: 'up' | 'down' | 'left' | 'right') => void
  onKeyboardActivate?: () => void
  className?: string
  role?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  tabIndex?: number
  data?: any
}

export function AccessibleDragDrop({
  children,
  draggable = false,
  droppable = false,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDragLeave,
  onKeyboardMove,
  onKeyboardActivate,
  className,
  role = 'button',
  ariaLabel,
  ariaDescribedBy,
  tabIndex = 0,
  data
}: AccessibleDragDropProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const elementRef = useRef<HTMLDivElement>(null)

  // Handle keyboard interactions
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!draggable && !droppable) return

    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault()
        if (draggable && !isDragging) {
          // Start drag with keyboard
          setIsDragging(true)
          onDragStart?.(data)
          setAnnouncement(`Started dragging ${ariaLabel || 'item'}. Use arrow keys to move.`)
        } else if (isDragging) {
          // Drop with keyboard
          setIsDragging(false)
          onDragEnd?.()
          onKeyboardActivate?.()
          setAnnouncement(`Dropped ${ariaLabel || 'item'}.`)
        } else if (droppable) {
          // Activate drop zone
          onKeyboardActivate?.()
          setAnnouncement(`Activated drop zone.`)
        }
        break

      case 'Escape':
        e.preventDefault()
        if (isDragging) {
          setIsDragging(false)
          onDragEnd?.()
          setAnnouncement(`Cancelled dragging ${ariaLabel || 'item'}.`)
        }
        break

      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (isDragging) {
          e.preventDefault()
          const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right'
          onKeyboardMove?.(direction)
          setAnnouncement(`Moving ${direction}.`)
        }
        break
    }
  }

  // Handle focus events
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    setIsFocused(true)
    if (draggable) {
      setAnnouncement(`${ariaLabel || 'Item'} focused. Press Space or Enter to start dragging.`)
    } else if (droppable) {
      setAnnouncement(`Drop zone focused. ${isDragging ? 'Press Space or Enter to drop here.' : ''}`)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  // Handle mouse drag events
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    if (data) {
      e.dataTransfer.setData('application/json', JSON.stringify(data))
    }
    onDragStart?.(data)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragEnd?.()
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!droppable) return
    e.preventDefault()
    setIsDropTarget(true)
    onDragOver?.()
  }

  const handleDragLeave = () => {
    setIsDropTarget(false)
    onDragLeave?.()
  }

  const handleDrop = (e: React.DragEvent) => {
    if (!droppable) return
    e.preventDefault()
    setIsDropTarget(false)
    
    try {
      const droppedData = e.dataTransfer.getData('application/json')
      if (droppedData) {
        const parsed = JSON.parse(droppedData)
        onDrop?.(parsed)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  return (
    <>
      <div
        ref={elementRef}
        role={role}
        tabIndex={tabIndex}
        draggable={draggable}
        className={cn(
          className,
          isDragging && 'opacity-50',
          isDropTarget && 'ring-2 ring-blue-500',
          isFocused && 'outline-none ring-2 ring-offset-2 ring-blue-500'
        )}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-grabbed={isDragging}
        aria-dropeffect={droppable ? 'move' : undefined}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {children}
      </div>
      
      {/* Screen reader announcements */}
      <div 
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  )
}