'use client'

import { useEffect } from 'react'
import { X } from '@/lib/icons'
import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmButtonVariant = {
    danger: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
    warning: 'bg-warning hover:bg-warning/90 text-warning-foreground',
    info: 'bg-info hover:bg-info/90 text-info-foreground',
  }[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 px-safe py-safe">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={onCancel} 
      />

      {/* Dialog */}
      <div className="relative bg-card rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 border">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold mb-2 text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground mb-6">
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <button
            onClick={() => {
              onConfirm()
              onCancel() // Close dialog after confirm
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${confirmButtonVariant}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}