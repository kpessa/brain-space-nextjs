import { useEffect } from 'react'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { useScheduleStore } from '@/store/scheduleStore'

/**
 * Hook that automatically switches user mode based on schedule preferences
 * Checks every minute to see if mode should change
 */
export function useScheduleMode() {
  const setMode = useUserPreferencesStore(state => state.setMode)
  const currentMode = useUserPreferencesStore(state => state.currentMode)
  const manualModeOverride = useUserPreferencesStore(state => state.manualModeOverride)
  const { preferences, getSuggestedMode } = useScheduleStore()
  
  useEffect(() => {
    if (!preferences.autoSwitchMode) {
      return
    }
    
    // If user has manually selected a mode, respect that choice
    if (manualModeOverride) {
      return
    }
    
    // Check immediately on mount
    const suggestedMode = getSuggestedMode()
    if (suggestedMode !== 'all' && suggestedMode !== currentMode) {
      setMode(suggestedMode, false) // Pass false to indicate auto-switch
    }
    
    // Set up interval to check every minute
    const interval = setInterval(() => {
      // Don't auto-switch if manual override is active
      if (manualModeOverride) {
        return
      }
      
      const newSuggestedMode = getSuggestedMode()
      if (newSuggestedMode !== 'all' && newSuggestedMode !== currentMode) {
        setMode(newSuggestedMode, false) // Pass false to indicate auto-switch
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [preferences.autoSwitchMode, currentMode, setMode, getSuggestedMode, manualModeOverride])
}