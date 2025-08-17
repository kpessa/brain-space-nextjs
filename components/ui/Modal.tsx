'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useFocusTrapWithRef } from '@/hooks/useFocusTrap'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  size = 'md',
  showCloseButton = true 
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  
  // Apply focus trap to the modal
  useFocusTrapWithRef(modalRef, isOpen)
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 px-safe py-safe">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={cn(
          'relative bg-card rounded-lg shadow-xl w-full border flex flex-col max-h-[90vh]',
          sizeClasses[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
                data-close-button
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}