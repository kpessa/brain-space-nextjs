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
    
    if (diff > 0 && isAtTop()) {
      // Apply resistance factor
      const adjustedDiff = Math.min(diff / resistance, maxPull)
      setPullDistance(adjustedDiff)
      
      // Trigger haptic feedback at threshold
      if (adjustedDiff >= threshold && diff - 1 < threshold * resistance) {
        triggerHaptic('medium')
      }
      
      // Prevent default scrolling when pulling
      if (adjustedDiff > 5) {
        e.preventDefault()
      }
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
        console.error('Pull to refresh error:', error)
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
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    
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