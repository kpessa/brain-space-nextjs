// Backward compatibility re-export
// This file provides backward compatibility for existing imports
// Use useContentStore from './contentStore' for new code

export {
  useContentStore as useBraindumpStore,
  useContentStore as useBrainDumpStore, // Also export with capital D for compatibility
  type BrainDumpNode,
  type BrainDumpEdge,
  type BrainDumpEntry
} from './contentStore'
