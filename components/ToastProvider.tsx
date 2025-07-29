'use client'

import { ToastContainer } from '@/components/ui/Toast'
import { useToastStore } from '@/hooks/useToast'

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore()
  
  return <ToastContainer toasts={toasts} onRemove={removeToast} />
}