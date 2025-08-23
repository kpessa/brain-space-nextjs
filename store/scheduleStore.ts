// Backward compatibility re-export
// This file provides backward compatibility for existing imports
// Use useCoreStore from './coreStore' for new code

import { useCoreStore } from './coreStore'
import { create } from 'zustand'

export type { WorkSchedule, PTODay, SchedulePreferences } from './coreStore'

// Create a compatibility wrapper that maps the old interface to the new one
interface ScheduleStoreCompat {
  preferences: {
    autoSwitchMode: boolean
    defaultToWorkMode: boolean
    workStartHour: number
    workEndHour: number
  }
  getSuggestedMode: (date?: Date) => 'work' | 'personal' | 'all'
  workSchedule: ReturnType<typeof useCoreStore>['workSchedule']
  ptoCalendar: ReturnType<typeof useCoreStore>['ptoCalendar']
  setPreferences: ReturnType<typeof useCoreStore>['setSchedulePreferences']
  setWorkSchedule: ReturnType<typeof useCoreStore>['setWorkSchedule']
  addPTODay: ReturnType<typeof useCoreStore>['addPTODay']
  removePTODay: ReturnType<typeof useCoreStore>['removePTODay']
  isWorkingTime: ReturnType<typeof useCoreStore>['isWorkingTime']
  isPTODay: ReturnType<typeof useCoreStore>['isPTODay']
}

// Create a compatibility store that wraps the core store
export const useScheduleStore = create<ScheduleStoreCompat>((set, get) => {
  // Subscribe to core store changes
  useCoreStore.subscribe((state) => {
    set({
      preferences: {
        autoSwitchMode: state.schedulePreferences.autoSwitchMode,
        defaultToWorkMode: state.schedulePreferences.defaultToWorkMode,
        workStartHour: state.schedulePreferences.workStartHour,
        workEndHour: state.schedulePreferences.workEndHour,
      },
      getSuggestedMode: state.getSuggestedMode,
      workSchedule: state.workSchedule,
      ptoCalendar: state.ptoCalendar,
      setPreferences: state.setSchedulePreferences,
      setWorkSchedule: state.setWorkSchedule,
      addPTODay: state.addPTODay,
      removePTODay: state.removePTODay,
      isWorkingTime: state.isWorkingTime,
      isPTODay: state.isPTODay,
    })
  })

  // Get initial state from core store
  const coreState = useCoreStore.getState()
  
  return {
    preferences: {
      autoSwitchMode: coreState.schedulePreferences.autoSwitchMode,
      defaultToWorkMode: coreState.schedulePreferences.defaultToWorkMode,
      workStartHour: coreState.schedulePreferences.workStartHour,
      workEndHour: coreState.schedulePreferences.workEndHour,
    },
    getSuggestedMode: coreState.getSuggestedMode,
    workSchedule: coreState.workSchedule,
    ptoCalendar: coreState.ptoCalendar,
    setPreferences: coreState.setSchedulePreferences,
    setWorkSchedule: coreState.setWorkSchedule,
    addPTODay: coreState.addPTODay,
    removePTODay: coreState.removePTODay,
    isWorkingTime: coreState.isWorkingTime,
    isPTODay: coreState.isPTODay,
  }
})
