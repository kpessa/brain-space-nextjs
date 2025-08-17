'use client'

import { ReactNode } from 'react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  enabled?: boolean
  threshold?: number
  showIndicator?: boolean
  indicatorHeight?: number
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  enabled = true,
  threshold = 80,
  showIndicator = true,
  indicatorHeight = 60
}: PullToRefreshProps) {
  const {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress
  } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled
  })
  
  // Calculate indicator styles
  const indicatorTranslateY = Math.min(pullDistance - indicatorHeight, 0)
  const indicatorOpacity = pullProgress
  const indicatorScale = 0.5 + (pullProgress * 0.5)
  const indicatorRotation = pullProgress * 360
  
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      {showIndicator && (isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-10"
          style={{
            height: `${indicatorHeight}px`,
            transform: `translateY(${indicatorTranslateY}px)`,
            opacity: indicatorOpacity
          }}
        >
          <div
            className={cn(
              'rounded-full bg-white dark:bg-gray-800 shadow-lg p-3',
              'flex items-center justify-center',
              isRefreshing && 'animate-pulse'
            )}
            style={{
              transform: `scale(${indicatorScale})`
            }}
          >
            <RefreshCw
              className={cn(
                'w-6 h-6',
                pullProgress >= 1 ? 'text-primary' : 'text-muted-foreground',
                isRefreshing && 'animate-spin'
              )}
              style={{
                transform: !isRefreshing ? `rotate(${indicatorRotation}deg)` : undefined
              }}
            />
          </div>
        </div>
      )}
      
      {/* Scrollable content */}
      <div
        ref={containerRef}
        className={cn(
          'h-full overflow-y-auto scrollbar-hide',
          'transition-transform duration-200 ease-out'
        )}
        style={{
          transform: isPulling || isRefreshing
            ? `translateY(${pullDistance}px)`
            : 'translateY(0)'
        }}
      >
        {children}
      </div>
    </div>
  )
}