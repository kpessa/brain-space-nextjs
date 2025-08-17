'use client'

import { ReactNode, useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  showHandle?: boolean
  showCloseButton?: boolean
  height?: 'auto' | 'full' | 'half' | 'three-quarters'
  className?: string
  preventSwipeClose?: boolean
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  showHandle = true,
  showCloseButton = true,
  height = 'auto',
  className,
  preventSwipeClose = false
}: BottomSheetProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const startTime = useRef(0)

  // Height classes for the sheet
  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    'three-quarters': 'h-[75vh]',
    full: 'h-[calc(100vh-env(safe-area-inset-top))]'
  }

  // Handle closing animation
  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
      setDragOffset(0)
    }, 300)
  }, [onClose])

  // Touch handlers for swipe to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (preventSwipeClose) return
    startY.current = e.touches[0].clientY
    startTime.current = Date.now()
    setIsDragging(true)
  }, [preventSwipeClose])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || preventSwipeClose) return
    
    const currentY = e.touches[0].clientY
    const deltaY = currentY - startY.current
    
    // Only allow dragging down
    if (deltaY > 0) {
      setDragOffset(deltaY)
      
      // Add resistance when dragging
      const resistance = 0.5
      const resistedOffset = deltaY * resistance
      
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${resistedOffset}px)`
      }
    }
  }, [isDragging, preventSwipeClose])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || preventSwipeClose) return
    
    const timeDiff = Date.now() - startTime.current
    const velocity = dragOffset / timeDiff
    
    // Close if dragged more than 100px or with sufficient velocity
    if (dragOffset > 100 || velocity > 0.5) {
      handleClose()
    } else {
      // Snap back to position
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.3s ease-out'
        sheetRef.current.style.transform = 'translateY(0)'
      }
      setDragOffset(0)
    }
    
    setIsDragging(false)
  }, [isDragging, dragOffset, preventSwipeClose, handleClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden'
      
      // Add padding to account for scrollbar removal (desktop)
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen, handleClose])

  // Reset drag state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0)
      setIsDragging(false)
      if (sheetRef.current) {
        sheetRef.current.style.transform = ''
        sheetRef.current.style.transition = ''
      }
    }
  }, [isOpen])

  if (!isOpen && !isClosing) return null

  const sheetContent = (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-end",
        isClosing && "pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen && !isClosing ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "relative bg-card rounded-t-2xl shadow-xl w-full",
          "transition-transform duration-300 ease-out",
          "pb-safe", // Safe area padding for iPhone home indicator
          isOpen && !isClosing ? "translate-y-0" : "translate-y-full",
          heightClasses[height],
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        {showHandle && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b">
            {title && (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground 
                         transition-colors rounded-full hover:bg-accent/10"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className={cn(
          "overflow-y-auto overscroll-contain",
          "px-6 py-4",
          // Add momentum scrolling for iOS
          "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
          "-webkit-overflow-scrolling-touch"
        )}>
          {children}
        </div>
      </div>
    </div>
  )

  // Only render on client side
  if (typeof document === 'undefined') return null
  
  return createPortal(sheetContent, document.body)
}