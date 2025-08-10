'use client'

import { useUserPreferencesStore, UserMode } from '@/store/userPreferencesStore'
import { Button } from '@/components/ui/Button'
import { Briefcase, Home, Globe } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ModeToggle() {
  const { currentMode, setMode } = useUserPreferencesStore()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Use safe default during SSR
  const displayMode = isClient ? currentMode : 'work'
  
  const getModeIcon = (mode: UserMode) => {
    switch (mode) {
      case 'work':
        return <Briefcase className="w-4 h-4" />
      case 'personal':
        return <Home className="w-4 h-4" />
      case 'all':
        return <Globe className="w-4 h-4" />
    }
  }
  
  const getModeColor = (mode: UserMode) => {
    switch (mode) {
      case 'work':
        return 'bg-info hover:bg-info/90 text-info-foreground'
      case 'personal':
        return 'bg-success hover:bg-success/90 text-success-foreground'
      case 'all':
        return 'bg-primary hover:bg-primary/90 text-primary-foreground'
    }
  }
  
  const getNextMode = (): UserMode => {
    switch (displayMode) {
      case 'work':
        return 'personal'
      case 'personal':
        return 'all'
      case 'all':
        return 'work'
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mode:</span>
      <Button
        onClick={() => setMode(getNextMode())}
        size="sm"
        className={`flex items-center gap-2 ${getModeColor(displayMode)}`}
        suppressHydrationWarning
      >
        <span suppressHydrationWarning>
          {getModeIcon(displayMode)}
        </span>
        <span className="capitalize" suppressHydrationWarning>{displayMode}</span>
      </Button>
    </div>
  )
}

export function ModeBadge() {
  const { currentMode } = useUserPreferencesStore()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Use safe default during SSR
  const displayMode = isClient ? currentMode : 'work'
  
  const getBadgeColor = () => {
    switch (displayMode) {
      case 'work':
        return 'bg-info/10 text-info'
      case 'personal':
        return 'bg-success/10 text-success'
      case 'all':
        return 'bg-primary/10 text-primary'
    }
  }
  
  const getIcon = () => {
    switch (displayMode) {
      case 'work':
        return <Briefcase className="w-3 h-3" />
      case 'personal':
        return <Home className="w-3 h-3" />
      case 'all':
        return <Globe className="w-3 h-3" />
    }
  }
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor()}`} suppressHydrationWarning>
      <span suppressHydrationWarning>
        {getIcon()}
      </span>
      <span className="capitalize" suppressHydrationWarning>{displayMode}</span>
    </div>
  )
}