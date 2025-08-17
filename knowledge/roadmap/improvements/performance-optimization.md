# Performance Optimization Roadmap: Brain Space

## Overview

This roadmap outlines specific, actionable optimizations for the Brain Space application based on comprehensive performance analysis. Each optimization includes implementation details, expected impact metrics, and priority levels.

## Phase 1: Foundation & Quick Wins (Sprint 1-2)

### 1.1 Icon Optimization System 🎯 **High Priority**

**Problem:** 75+ files importing individual lucide-react icons, causing bundle bloat
**Impact:** 20-30KB bundle reduction

**Implementation:**
```typescript
// Create: lib/icons/index.ts
export {
  // Navigation & UI
  Plus,
  Search,
  MoreHorizontal,
  
  // Actions
  Edit,
  Trash2,
  Download,
  Upload,
  
  // Status
  CheckCircle,
  Circle,
  Pin,
  
  // Types & Categories
  Network,
  Target,
  Tag,
  
  // System
  Calendar,
  Home,
  Settings,
} from 'lucide-react'

// Migration script: scripts/migrate-icons.js
const fs = require('fs')
const path = require('path')

const migrateIconImports = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8')
  
  // Replace direct lucide-react imports
  content = content.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g,
    "import { $1 } from '@/lib/icons'"
  )
  
  fs.writeFileSync(filePath, content)
}
```

**Verification:**
- Bundle analyzer shows reduced lucide-react chunk size
- Tree-shaking effectiveness improved
- No runtime icon loading errors

### 1.2 Date Library Consolidation 🎯 **Medium Priority**

**Problem:** Both date-fns and dayjs dependencies increase bundle size
**Impact:** 15-20KB bundle reduction

**Implementation:**
```bash
# Remove date-fns
pnpm remove date-fns

# Update imports across codebase
# Find all date-fns imports: grep -r "from 'date-fns'" --include="*.ts" --include="*.tsx" .

# Migration examples:
# date-fns: format(date, 'MMM d, yyyy')
# dayjs:    dayjs(date).format('MMM D, YYYY')

# date-fns: isAfter(date1, date2)  
# dayjs:    dayjs(date1).isAfter(date2)
```

**Migration Script:**
```typescript
// scripts/migrate-dates.ts
const dateFnsMigrations = {
  'format\\(([^,]+),\\s*[\'"]([^\'"]+)[\'"]\\)': 'dayjs($1).format(\'$2\')',
  'isAfter\\(([^,]+),\\s*([^)]+)\\)': 'dayjs($1).isAfter($2)',
  'isBefore\\(([^,]+),\\s*([^)]+)\\)': 'dayjs($1).isBefore($2)',
  'addDays\\(([^,]+),\\s*([^)]+)\\)': 'dayjs($1).add($2, \'day\')',
}
```

### 1.3 Lazy Loading Infrastructure 🎯 **High Priority**

**Problem:** Heavy components loaded eagerly, blocking initial render
**Impact:** 40-60KB initial bundle reduction

**Implementation:**
```typescript
// Enhanced: components/LazyComponents.tsx

// Route-level lazy loading
export const LazyNodesPage = dynamic(
  () => import('@/app/(dashboard)/nodes/nodes-client'),
  {
    loading: () => <NodePageSkeleton />,
    ssr: false
  }
)

export const LazyCalendarPage = dynamic(
  () => import('@/app/(dashboard)/calendar/calendar-client'),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false
  }
)

// Heavy modals
export const LazyNodeGraphView = dynamic(
  () => import('@/components/nodes/NodeGraphView').then(mod => ({ default: mod.NodeGraphView })),
  {
    loading: () => <GraphViewSkeleton />,
    ssr: false
  }
)

// Third-party dependencies
export const LazyReactFlow = dynamic(
  () => import('@xyflow/react'),
  {
    loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
    ssr: false
  }
)
```

**Skeleton Components:**
```typescript
// components/skeletons/NodePageSkeleton.tsx
export const NodePageSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-16 bg-gray-200 rounded-lg" />
    <div className="grid grid-cols-3 gap-4">
      {Array(9).fill(0).map((_, i) => (
        <div key={i} className="h-32 bg-gray-200 rounded-lg" />
      ))}
    </div>
  </div>
)
```

### 1.4 Bundle Analysis Setup 🎯 **High Priority**

**Implementation:**
```bash
# Add bundle analysis to CI/CD
pnpm run analyze

# Create bundle monitoring
npm install --save-dev webpack-bundle-analyzer
```

**Monitoring Configuration:**
```typescript
// scripts/bundle-monitor.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const BUNDLE_LIMITS = {
  maxAssetSize: 244000,    // 244KB
  maxEntrypointSize: 244000,
  hints: 'error'
}

module.exports = {
  performance: BUNDLE_LIMITS,
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    })
  ]
}
```

## Phase 2: Core Optimizations (Sprint 3-4)

### 2.1 Advanced Code Splitting 🎯 **High Priority**

**Implementation:**
```typescript
// Enhanced: next.config.js
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@xyflow/react', 
      'firebase',
      'dayjs'
    ],
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Framework chunk
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          
          // Firebase chunk  
          firebase: {
            name: 'firebase',
            test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
            priority: 35,
            enforce: true,
            chunks: 'all',
          },
          
          // Graph visualization chunk
          graph: {
            name: 'graph',
            test: /[\\/]node_modules[\\/](@xyflow|d3|dagre)[\\/]/,
            priority: 30,
            enforce: true,
            chunks: 'async',
          },
          
          // Icons chunk
          icons: {
            name: 'icons',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            priority: 25,
            enforce: true,
          },
          
          // Vendor commons
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            minChunks: 2,
            reuseExistingChunk: true,
          }
        },
        maxAsyncRequests: 30,
        maxInitialRequests: 25,
      }
    }
    return config
  }
}
```

### 2.2 Component Virtualization 🎯 **Medium Priority**

**Problem:** Large lists in nodes view cause performance issues
**Impact:** 60%+ rendering performance improvement

**Implementation:**
```typescript
// Install react-window
pnpm add react-window react-window-infinite-loader

// Enhanced: components/nodes/VirtualizedNodeGrid.tsx
import { FixedSizeGrid as Grid } from 'react-window'
import { memo } from 'react'

interface VirtualizedNodeGridProps {
  nodes: Node[]
  onNodeClick: (node: Node) => void
  selectMode: boolean
  selectedNodes: Set<string>
  onNodeSelect: (nodeId: string, selected: boolean) => void
}

const ITEM_WIDTH = 350
const ITEM_HEIGHT = 200
const GUTTER_SIZE = 16

const VirtualizedNodeGrid = memo(({ 
  nodes, 
  onNodeClick, 
  selectMode, 
  selectedNodes, 
  onNodeSelect 
}: VirtualizedNodeGridProps) => {
  const columnCount = Math.floor((window.innerWidth - 64) / (ITEM_WIDTH + GUTTER_SIZE))
  const rowCount = Math.ceil(nodes.length / columnCount)

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex
    const node = nodes[index]
    
    if (!node) return null
    
    return (
      <div style={{
        ...style,
        left: style.left + GUTTER_SIZE,
        top: style.top + GUTTER_SIZE,
        width: style.width - GUTTER_SIZE,
        height: style.height - GUTTER_SIZE,
      }}>
        <NodeCard
          node={node}
          onNodeClick={onNodeClick}
          isSelected={selectedNodes.has(node.id)}
          onSelect={onNodeSelect}
          selectMode={selectMode}
        />
      </div>
    )
  }

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={ITEM_WIDTH + GUTTER_SIZE}
      height={600}
      rowCount={rowCount}
      rowHeight={ITEM_HEIGHT + GUTTER_SIZE}
      width="100%"
    >
      {Cell}
    </Grid>
  )
})
```

### 2.3 Service Worker Enhancement 🎯 **Medium Priority**

**Implementation:**
```typescript
// public/sw.js - Enhanced service worker
const CACHE_NAME = 'brain-space-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'

const STATIC_ASSETS = [
  '/',
  '/nodes',
  '/calendar',
  '/braindump',
  '/offline',
  // Add critical CSS/JS files
]

// Cache strategies
const cacheStrategies = {
  // Static assets - Cache First
  static: (request) => {
    return caches.match(request).then(response => {
      return response || fetch(request).then(fetchResponse => {
        const responseClone = fetchResponse.clone()
        caches.open(STATIC_CACHE).then(cache => {
          cache.put(request, responseClone)
        })
        return fetchResponse
      })
    })
  },
  
  // API calls - Network First  
  api: (request) => {
    return fetch(request).then(response => {
      const responseClone = response.clone()
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(request, responseClone)
      })
      return response
    }).catch(() => {
      return caches.match(request)
    })
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(cacheStrategies.api(request))
  } else {
    event.respondWith(cacheStrategies.static(request))
  }
})
```

### 2.4 Image Optimization 🎯 **Low Priority**

**Implementation:**
```typescript
// Enhanced: next.config.js
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  }
}

// Convert PWA icons to WebP
// scripts/convert-images.sh
#!/bin/bash
for file in public/*.png; do
  cwebp "$file" -o "${file%.png}.webp"
done
```

## Phase 3: Advanced Performance (Sprint 5-6)

### 3.1 Web Workers Integration 🎯 **Medium Priority**

**Implementation:**
```typescript
// workers/aiWorker.ts - Offload AI processing
export class AIWorker {
  private worker: Worker
  
  constructor() {
    this.worker = new Worker('/workers/ai-processor.js')
  }
  
  async processNodes(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ type: 'PROCESS_NODES', payload: text })
      this.worker.onmessage = (e) => {
        if (e.data.type === 'NODES_PROCESSED') {
          resolve(e.data.payload)
        }
      }
    })
  }
}

// public/workers/ai-processor.js
self.onmessage = function(e) {
  if (e.data.type === 'PROCESS_NODES') {
    // Heavy AI processing logic here
    const result = processAIRequest(e.data.payload)
    self.postMessage({ type: 'NODES_PROCESSED', payload: result })
  }
}
```

### 3.2 Memory Management 🎯 **High Priority**

**Implementation:**
```typescript
// lib/memoryManager.ts
export class MemoryManager {
  private static instance: MemoryManager
  private objectPool = new Map()
  private subscriptions = new Set()
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new MemoryManager()
    }
    return this.instance
  }
  
  // Object pooling for nodes
  borrowNode(): Node {
    if (this.objectPool.has('node')) {
      return this.objectPool.get('node').pop()
    }
    return {} as Node
  }
  
  returnNode(node: Node) {
    if (!this.objectPool.has('node')) {
      this.objectPool.set('node', [])
    }
    // Reset node properties
    Object.keys(node).forEach(key => delete node[key])
    this.objectPool.get('node').push(node)
  }
  
  // Cleanup subscriptions
  addSubscription(cleanup: () => void) {
    this.subscriptions.add(cleanup)
  }
  
  cleanup() {
    this.subscriptions.forEach(cleanup => cleanup())
    this.subscriptions.clear()
    this.objectPool.clear()
  }
}

// Usage in components
const NodeComponent = memo(({ node }: { node: Node }) => {
  useEffect(() => {
    const memManager = MemoryManager.getInstance()
    const cleanup = () => {
      // Cleanup heavy resources
    }
    memManager.addSubscription(cleanup)
    
    return cleanup
  }, [])
})
```

### 3.3 Performance Monitoring 🎯 **High Priority**

**Implementation:**
```typescript
// lib/performance/monitor.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics = new Map()
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new PerformanceMonitor()
    }
    return this.instance
  }
  
  // Track Core Web Vitals
  trackCoreWebVitals() {
    if (typeof window === 'undefined') return
    
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.recordMetric('LCP', lastEntry.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })
    
    // FID
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime)
      })
    }).observe({ entryTypes: ['first-input'] })
    
    // CLS
    let cls = 0
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          cls += entry.value
        }
      })
      this.recordMetric('CLS', cls)
    }).observe({ entryTypes: ['layout-shift'] })
  }
  
  // Custom performance tracking
  startTiming(label: string) {
    performance.mark(`${label}-start`)
  }
  
  endTiming(label: string) {
    performance.mark(`${label}-end`)
    performance.measure(label, `${label}-start`, `${label}-end`)
    const measure = performance.getEntriesByName(label)[0]
    this.recordMetric(label, measure.duration)
  }
  
  private recordMetric(name: string, value: number) {
    this.metrics.set(name, value)
    
    // Send to analytics
    if (process.env.NODE_ENV === 'production') {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
      })
    }
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics)
  }
}

// Usage in _app.tsx or layout
useEffect(() => {
  const monitor = PerformanceMonitor.getInstance()
  monitor.trackCoreWebVitals()
}, [])
```

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Icon optimization system
- [ ] Bundle analysis setup  
- [ ] Basic lazy loading

### Week 3-4: Core Optimizations
- [ ] Advanced code splitting
- [ ] Date library migration
- [ ] Service worker enhancement

### Week 5-6: Advanced Features
- [ ] Component virtualization
- [ ] Web Workers integration
- [ ] Performance monitoring

### Week 7-8: Testing & Refinement
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Production deployment

## Success Metrics

### Performance Targets
- **Bundle Size:** 50% reduction (from ~300KB to <150KB)
- **LCP:** < 2.5 seconds
- **FID:** < 100ms  
- **CLS:** < 0.1

### User Experience Metrics
- **Perceived Load Time:** 40% improvement
- **Task Completion Rate:** Maintain 95%+
- **User Satisfaction:** 90%+ positive feedback

### Technical Metrics
- **Build Time:** < 30 seconds
- **Bundle Analysis Score:** 90+
- **Lighthouse Performance:** 95+

## Risk Mitigation

### High Risk Items
1. **Service Worker Changes:** Thorough testing required
2. **Component Refactoring:** Maintain feature parity
3. **Bundle Splitting:** Monitor for over-splitting

### Mitigation Strategies
1. **Feature Flags:** Gradual rollout of optimizations
2. **A/B Testing:** Compare performance metrics
3. **Rollback Plan:** Quick revert capability
4. **Progressive Enhancement:** Ensure fallbacks work

## Monitoring & Maintenance

### Continuous Monitoring
```typescript
// Performance budget enforcement
const performanceBudget = {
  bundleSizeWarning: 200000,  // 200KB
  bundleSizeError: 250000,    // 250KB
  lcpWarning: 2000,           // 2s
  lcpError: 3000,             // 3s
}

// Automated alerts
const checkPerformanceBudget = (metrics) => {
  Object.entries(performanceBudget).forEach(([key, limit]) => {
    if (metrics[key] > limit) {
      console.error(`Performance budget exceeded: ${key}`)
      // Send alert to monitoring system
    }
  })
}
```

### Regular Audits
- **Weekly:** Bundle size monitoring
- **Monthly:** Performance regression testing  
- **Quarterly:** Comprehensive performance review

This roadmap provides a clear, actionable path to significant performance improvements while maintaining the rich functionality of the Brain Space application. Each optimization is designed to provide measurable improvements with minimal risk to existing features.