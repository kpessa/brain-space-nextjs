// Backward compatibility re-export
// This file provides backward compatibility for existing imports
// Use useContentStore from './contentStore' for new code

import { useContentStore } from './contentStore'
import { create } from 'zustand'

// Create a compatibility wrapper that maps the old interface to the new one
export const useJournalStore = create((set, get) => {
  // Subscribe to content store changes
  useContentStore.subscribe((state) => {
    set({
      entries: state.journalEntries,
      userProgress: state.journalProgress,
      currentEntry: state.currentJournalEntry,
      isLoading: state.isLoading,
      error: state.error,
      // Map new function names to old ones
      getTodayEntry: state.getTodayJournalEntry,
      loadEntriesFromFirestore: state.loadJournalEntriesFromFirestore,
      loadUserProgressFromFirestore: state.loadJournalProgressFromFirestore,
      createEntry: state.createJournalEntry,
      updateEntry: state.updateJournalEntry,
      deleteEntry: state.deleteJournalEntry,
      calculateStreak: state.calculateJournalStreak,
      checkAchievements: state.checkJournalAchievements,
      setEntries: state.setJournalEntries,
      setProgress: state.setJournalProgress,
      recalculateProgress: state.recalculateJournalProgress,
      syncWithFirestore: state.syncJournalWithFirestore,
    })
  })

  // Get initial state from content store
  const contentState = useContentStore.getState()
  
  return {
    entries: contentState.journalEntries,
    userProgress: contentState.journalProgress,
    currentEntry: contentState.currentJournalEntry,
    isLoading: contentState.isLoading,
    error: contentState.error,
    // Map new function names to old ones
    getTodayEntry: contentState.getTodayJournalEntry,
    loadEntriesFromFirestore: contentState.loadJournalEntriesFromFirestore,
    loadUserProgressFromFirestore: contentState.loadJournalProgressFromFirestore,
    createEntry: contentState.createJournalEntry,
    updateEntry: contentState.updateJournalEntry,
    deleteEntry: contentState.deleteJournalEntry,
    calculateStreak: contentState.calculateJournalStreak,
    checkAchievements: contentState.checkJournalAchievements,
    setEntries: contentState.setJournalEntries,
    setProgress: contentState.setJournalProgress,
    recalculateProgress: contentState.recalculateJournalProgress,
    syncWithFirestore: contentState.syncJournalWithFirestore,
  }
})
