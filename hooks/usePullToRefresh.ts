'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { triggerHaptic } from '@/lib/haptic'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  resistance?: number
  maxPull?: number
  enabled?: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  maxPull = 150,
  enabled = true
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  
  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Check if we're at the top of the scrollable element
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false
    return containerRef.current.scrollTop <= 0
  }, [])
  
  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return
    
    const touch = e.touches[0]
    startY.current = touch.clientY
    currentY.current = touch.clientY
    
    if (isAtTop()) {
      setIsPulling(true)
    }
  }, [enabled, isRefreshing, isAtTop])
  
  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing || !enabled) return
    
    const touch = e.touches[0]
    currentY.current = touch.clientY
    
    const diff = currentY.current - startY.current
    
    // Only handle pull-to-refresh if we're pulling down AND at the top
    if (diff > 0 && isAtTop()) {
      // Apply resistance factor
      const adjustedDiff = Math.min(diff / resistance, maxPull)
      setPullDistance(adjustedDiff)
      
      // Trigger haptic feedback at threshold
      if (adjustedDiff >= threshold && diff - 1 < threshold * resistance) {
        triggerHaptic('medium')
      }
      
      // Only prevent default when actively pulling at the top
      // Be highly selective to avoid blocking normal touch interactions
      const shouldPreventDefault = (
        adjustedDiff > 20 && 
        adjustedDiff < maxPull * 0.8 && 
        containerRef.current?.scrollTop === 0 && 
        isAtTop() && 
        isPulling
      )
      
      if (shouldPreventDefault) {
        e.preventDefault() // Only prevent when actively pulling at top
      }
    } else if (diff < 0) {
      // If pulling up (scrolling down), stop the pull-to-refresh
      setIsPulling(false)
      setPullDistance(0)
    }
  }, [isPulling, isRefreshing, enabled, isAtTop, resistance, maxPull, threshold])
  
  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshing || !enabled) return
    
    setIsPulling(false)
    
    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true)
      triggerHaptic('success')
      
      try {
        await onRefresh()
      } catch (error) {
        // Pull to refresh error
        triggerHaptic('error')
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Reset if threshold not met
      setPullDistance(0)
    }
  }, [isPulling, isRefreshing, enabled, pullDistance, threshold, onRefresh])
  
  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return
    
    // Use passive listeners for better performance
    // Only touchmove needs to be non-passive since we might preventDefault
    const touchMoveOptions = { passive: false, capture: false }
    const passiveOptions = { passive: true, capture: false }
    
    container.addEventListener('touchstart', handleTouchStart, passiveOptions)
    container.addEventListener('touchmove', handleTouchMove, touchMoveOptions)
    container.addEventListener('touchend', handleTouchEnd, passiveOptions)
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])
  
  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1)
  }
}