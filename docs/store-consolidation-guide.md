# Store Consolidation Migration Guide

## Overview
On January 23, 2025, we consolidated 14 Zustand stores into 6 domain-focused stores to improve performance and reduce re-render storms. This document tracks the changes and compatibility measures.

## Store Mapping

### 1. Core Store (`/store/coreStore.ts`)
Consolidates authentication, user preferences, and scheduling functionality.

**Old Stores → New Store:**
- `authStore` → `coreStore`
- `userPreferencesStore` → `coreStore`
- `scheduleStore` → `coreStore`

**Key Changes:**
- `scheduleStore.preferences` → `coreStore.schedulePreferences`
- All auth, user preference, and schedule functions consolidated

### 2. Planning Store (`/store/planningStore.ts`)
Manages timebox scheduling and task planning.

**Old Stores → New Store:**
- `timeboxStore` → `planningStore`
- `optimizedTimeboxStore` → `planningStore` (merged)

### 3. Content Store (`/store/contentStore.ts`)
Handles brain dumps and journal entries.

**Old Stores → New Store:**
- `braindumpStore` → `contentStore`
- `journalStore` → `contentStore`

**Key Changes:**
- `journalStore.getTodayEntry()` → `contentStore.getTodayJournalEntry()`
- Functions prefixed with domain (e.g., `createJournalEntry`, `addBrainDumpThought`)

### 4. Tasks Store (`/store/tasksStore.ts`)
Manages todos, calendar events, and routines.

**Old Stores → New Store:**
- `todoStore` → `tasksStore`
- `calendarStore` → `tasksStore`
- `routineStore` → `tasksStore`

### 5. UI Store (`/store/uiStore.ts`)
Controls UI state and gamification features.

**Old Stores → New Store:**
- `uiStore` → `uiStore` (enhanced)
- `xpStore` → `uiStore`

### 6. Node Store (`/store/nodes/`)
Already refactored into modular structure (not consolidated, just split).

## Backward Compatibility

All old store imports continue to work through compatibility shims:

```typescript
// These imports still work:
import { useAuthStore } from '@/store/authStore'
import { useJournalStore } from '@/store/journalStore'
import { useTimeboxStore } from '@/store/timeboxStore'
// etc...
```

### Compatibility Shims

Each old store file now acts as a compatibility layer:

1. **Simple Re-exports** (for stores with no API changes):
   ```typescript
   export { useCoreStore as useAuthStore } from './coreStore'
   ```

2. **Wrapper Stores** (for stores with API changes):
   ```typescript
   // Example: scheduleStore.ts
   export const useScheduleStore = create((set, get) => {
     // Maps old interface to new implementation
     // e.g., preferences → schedulePreferences
   })
   ```

## Known Breaking Changes Fixed

### 1. Schedule Store Preferences
**Issue:** `preferences.autoSwitchMode` was undefined  
**Fix:** Created wrapper that maps `schedulePreferences` to `preferences`

### 2. Journal Store Functions
**Issue:** `getTodayEntry` function not found  
**Fix:** Created wrapper that maps `getTodayJournalEntry` to `getTodayEntry`

### 3. BrainDump Store Naming
**Issue:** Case sensitivity in store name  
**Fix:** Export both `useBraindumpStore` and `useBrainDumpStore`

## Migration Path for New Code

For new code, import directly from the consolidated stores:

```typescript
// Old way (still works via compatibility shims)
import { useAuthStore } from '@/store/authStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'

// New way (recommended)
import { useCoreStore } from '@/store/coreStore'
const { user, isAuthenticated, currentMode, setMode } = useCoreStore()
```

## Performance Benefits

1. **Reduced Re-renders:** Fewer store subscriptions mean fewer component re-renders
2. **Better State Colocation:** Related state is kept together
3. **Simplified Dependencies:** Stores that need to interact no longer create circular dependencies
4. **Smaller Bundle:** Less Zustand boilerplate code

## Testing

Run the verification script to ensure all compatibility shims are working:

```bash
node scripts/verify-store-compatibility.js
```

## Rollback Plan

If critical issues arise, the changes can be rolled back by:

1. Restore the original store files from `/store/_backup/`
2. Remove the new consolidated store files
3. Update imports in components back to original stores

## Future Improvements

1. Gradually migrate components to use consolidated stores directly
2. Remove compatibility shims once all components are migrated
3. Add TypeScript strict types to consolidated stores
4. Implement proper state persistence with Firebase sync