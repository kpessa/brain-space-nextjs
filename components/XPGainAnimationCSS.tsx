'use client'

import { useEffect, useState } from 'react'
import { useXPStore } from '@/store/xpStore'

interface AnimationItem {
  id: string
  amount: number
  x: number
  y: number
}

export function XPGainAnimation() {
  const { xpAnimations } = useXPStore()
  const [visibleAnimations, setVisibleAnimations] = useState<AnimationItem[]>([])
  
  useEffect(() => {
    // Add new animations
    const newAnimations = xpAnimations.filter(
      anim => !visibleAnimations.find(v => v.id === anim.id)
    )
    
    if (newAnimations.length > 0) {
      setVisibleAnimations(prev => [...prev, ...newAnimations])
      
      // Remove animations after animation completes
      newAnimations.forEach(anim => {
        setTimeout(() => {
          setVisibleAnimations(prev => prev.filter(a => a.id !== anim.id))
        }, 1500)
      })
    }
  }, [xpAnimations])
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {visibleAnimations.map((animation) => (
        <div
          key={animation.id}
          className="xp-animation absolute flex items-center gap-1"
          style={{ 
            left: animation.x, 
            top: animation.y,
            '--start-y': `${animation.y}px`,
            '--end-y': `${animation.y - 80}px`
          } as React.CSSProperties}
        >
          <span className="text-2xl font-bold text-yellow-500 drop-shadow-lg">
            +{animation.amount}
          </span>
          <span className="text-xl">⚡</span>
        </div>
      ))}
      
      <style jsx>{`
        .xp-animation {
          animation: xpFloat 1.5s ease-out forwards;
        }
        
        @keyframes xpFloat {
          0% {
            opacity: 1;
            transform: scale(0.5) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(1.2) translateY(-80px);
          }
        }
      `}</style>
    </div>
  )
}

// Hook to trigger XP animation at mouse position
export function useXPAnimation() {
  const { addXPAnimation } = useXPStore()
  
  const showXPGain = (amount: number, event?: React.MouseEvent) => {
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    
    if (event) {
      x = event.clientX
      y = event.clientY
    }
    
    addXPAnimation(amount, x, y)
  }
  
  return { showXPGain }
}