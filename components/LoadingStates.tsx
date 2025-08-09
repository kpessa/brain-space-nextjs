'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Spinner = memo(function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-t-transparent',
        sizeClasses[size],
        className || 'border-blue-600'
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
})

interface LoadingOverlayProps {
  show: boolean
  message?: string
  fullScreen?: boolean
}

export const LoadingOverlay = memo(function LoadingOverlay({ 
  show, 
  message, 
  fullScreen = false 
}: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0 rounded-lg'
      )}
    >
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      )}
    </div>
  )
})

interface SkeletonProps {
  className?: string
  animate?: boolean
}

export const Skeleton = memo(function Skeleton({ 
  className, 
  animate = true 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded',
        animate && 'animate-pulse',
        className
      )}
    />
  )
})

interface LoadingCardProps {
  title?: string
  lines?: number
}

export const LoadingCard = memo(function LoadingCard({ 
  title = 'Loading...', 
  lines = 3 
}: LoadingCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              'h-4',
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  )
})

interface LoadingGridProps {
  columns?: number
  rows?: number
  className?: string
}

export const LoadingGrid = memo(function LoadingGrid({ 
  columns = 3, 
  rows = 2, 
  className 
}: LoadingGridProps) {
  const items = columns * rows

  return (
    <div className={cn(
      'grid gap-4',
      `grid-cols-${columns}`,
      className
    )}>
      {Array.from({ length: items }).map((_, i) => (
        <LoadingCard key={i} lines={2} />
      ))}
    </div>
  )
})

interface LoadingStateProps {
  isLoading: boolean
  error?: Error | null
  isEmpty?: boolean
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  minLoadingTime?: number
}

export const LoadingState = memo(function LoadingState({
  isLoading,
  error,
  isEmpty,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  minLoadingTime = 0
}: LoadingStateProps) {
  // Handle error state
  if (error) {
    if (errorComponent) return <>{errorComponent}</>
    
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-red-500 mb-4">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <p className="text-gray-600 mb-4">An error occurred</p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    )
  }

  // Handle loading state
  if (isLoading) {
    if (loadingComponent) return <>{loadingComponent}</>
    
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    )
  }

  // Handle empty state
  if (isEmpty) {
    if (emptyComponent) return <>{emptyComponent}</>
    
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <p>No data available</p>
      </div>
    )
  }

  // Render children
  return <>{children}</>
})

// Import needed for error display
import { AlertTriangle } from 'lucide-react'