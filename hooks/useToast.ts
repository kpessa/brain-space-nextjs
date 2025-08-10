/**
 * Simple toast notification system for user feedback
 * Provides success, error, and loading notifications
 */

import { useState, useCallback } from 'react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'loading' | 'info'
  title: string
  message?: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  showSuccess: (title: string, message?: string) => string
  showError: (title: string, message?: string) => string
  showLoading: (title: string, message?: string) => string
  showInfo: (title: string, message?: string) => string
}

const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function useToast(): ToastState {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId()
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove toast after duration (default 5 seconds)
    if (toast.type !== 'loading') {
      const duration = toast.duration || 5000
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((title: string, message?: string) => {
    return addToast({ type: 'success', title, message })
  }, [addToast])

  const showError = useCallback((title: string, message?: string) => {
    return addToast({ type: 'error', title, message, duration: 7000 })
  }, [addToast])

  const showLoading = useCallback((title: string, message?: string) => {
    return addToast({ type: 'loading', title, message })
  }, [addToast])

  const showInfo = useCallback((title: string, message?: string) => {
    return addToast({ type: 'info', title, message })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showLoading,
    showInfo,
  }
}

// Global toast context for app-wide notifications
import { createContext, useContext } from 'react'

const ToastContext = createContext<ToastState | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast()
  
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </ToastContext.Provider>
  )
}

export function useGlobalToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useGlobalToast must be used within a ToastProvider')
  }
  return context
}

// Toast container component
import { CheckCircle, XCircle, AlertCircle, Loader2, X } from 'lucide-react'

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            p-4 rounded-lg shadow-lg border flex items-start gap-3 
            transform transition-all duration-300 ease-in-out
            ${toast.type === 'success' ? 'bg-green-50 border-green-200' : ''}
            ${toast.type === 'error' ? 'bg-red-50 border-red-200' : ''}
            ${toast.type === 'loading' ? 'bg-blue-50 border-blue-200' : ''}
            ${toast.type === 'info' ? 'bg-gray-50 border-gray-200' : ''}
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
            {toast.type === 'loading' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-gray-600" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm ${
              toast.type === 'success' ? 'text-green-900' : 
              toast.type === 'error' ? 'text-red-900' : 
              toast.type === 'loading' ? 'text-blue-900' : 'text-gray-900'
            }`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className={`text-xs mt-1 ${
                toast.type === 'success' ? 'text-green-700' : 
                toast.type === 'error' ? 'text-red-700' : 
                toast.type === 'loading' ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {toast.message}
              </p>
            )}
          </div>
          
          <button
            onClick={() => removeToast(toast.id)}
            className={`flex-shrink-0 p-1 rounded-md hover:bg-opacity-20 ${
              toast.type === 'success' ? 'hover:bg-green-600 text-green-600' : 
              toast.type === 'error' ? 'hover:bg-red-600 text-red-600' : 
              toast.type === 'loading' ? 'hover:bg-blue-600 text-blue-600' : 'hover:bg-gray-600 text-gray-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
