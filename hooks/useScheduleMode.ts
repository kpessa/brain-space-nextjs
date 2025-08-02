import { useEffect } from 'react'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { useScheduleStore } from '@/store/scheduleStore'

/**
 * Hook that automatically switches user mode based on schedule preferences
 * Checks every minute to see if mode should change
 */
export function useScheduleMode() {
  const { setMode, currentMode } = useUserPreferencesStore()
  const { preferences, getSuggestedMode } = useScheduleStore()
  
  useEffect(() => {
    if (!preferences.autoSwitchMode) {
      return
    }
    
    // Check immediately on mount
    const suggestedMode = getSuggestedMode()
    if (suggestedMode !== 'all' && suggestedMode !== currentMode) {
      setMode(suggestedMode)
    }
    
    // Set up interval to check every minute
    const interval = setInterval(() => {
      const newSuggestedMode = getSuggestedMode()
      if (newSuggestedMode !== 'all' && newSuggestedMode !== currentMode) {
        setMode(newSuggestedMode)
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [preferences.autoSwitchMode, currentMode, setMode, getSuggestedMode])
}