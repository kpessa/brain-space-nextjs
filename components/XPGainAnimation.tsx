'use client'

import { useEffect } from 'react'
import { useXPStore } from '@/store/xpStore'
import { motion, AnimatePresence } from 'framer-motion'

export function XPGainAnimation() {
  const { xpAnimations } = useXPStore()
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {xpAnimations.map((animation) => (
          <motion.div
            key={animation.id}
            initial={{ 
              opacity: 1, 
              scale: 0.5,
              x: animation.x,
              y: animation.y
            }}
            animate={{ 
              opacity: 0,
              scale: 1.2,
              y: animation.y - 80,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.5,
              ease: "easeOut"
            }}
            className="absolute flex items-center gap-1"
            style={{ left: animation.x, top: animation.y }}
          >
            <span className="text-2xl font-bold text-yellow-500 drop-shadow-lg">
              +{animation.amount}
            </span>
            <span className="text-xl">⚡</span>
          </motion.div>
        ))}
      </AnimatePresence>
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