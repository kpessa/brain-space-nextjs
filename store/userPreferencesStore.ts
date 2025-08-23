// Backward compatibility re-export
// This file provides backward compatibility for existing imports
// Use useCoreStore from './coreStore' for new code

export {
  useCoreStore as useUserPreferencesStore,
  type UserMode,
  type ThemeMode,
  TAG_CATEGORIES,
  shouldShowNode
} from './coreStore'
