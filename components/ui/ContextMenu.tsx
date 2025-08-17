'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  children: ReactNode
  className?: string
}

export function ContextMenu({ 
  isOpen, 
  position, 
  onClose, 
  children,
  className = ''
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Add slight delay to prevent immediate close on right-click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Adjust position to keep menu within viewport
  const adjustedPosition = { ...position }
  if (typeof window !== 'undefined') {
    const menuWidth = 320 // Approximate width
    const menuHeight = 400 // Approximate height
    
    if (position.x + menuWidth > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - menuWidth - 20
    }
    
    if (position.y + menuHeight > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - menuHeight - 20
    }
  }

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 
        min-w-[280px] max-w-[320px] animate-in fade-in duration-200 ${className}`}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 p-1 rounded-md hover:bg-gray-100 
            transition-colors z-10"
          aria-label="Close menu"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        {children}
      </div>
    </div>
  )
}