---
tags: [quick-reference, developer-guide, navigation]
created: 2025-01-23T15:15:00Z
updated: 2025-01-23T15:15:00Z
---

# Quick Reference Guide - Brain Space Development

## 🚀 Current Project Status
**Health Score: 9.3/10** - Enterprise-ready with high-ROI opportunities  
**Ready for: Rapid prototyping and feature development**  
**Next Phase: Testing infrastructure and iOS feature deployment**

## 🎯 Where to Find Information

### 📊 Project Health & Status
- **Current State**: `/00-Overview/CURRENT_STATE.md` - Latest health assessment (9.3/10)
- **Action Items**: `/00-Overview/ACTION_ITEMS.md` - Implementation-ready action plan
- **Implementation Roadmap**: `/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md` - 3-phase strategy

### 🔍 Research & Analysis
- **Complete Index**: `/00-Overview/INDEX.md` - Navigation to all research
- **Audit Navigation**: `/00-Overview/AUDIT_INDEX.md` - All 21 audit documents
- **Research Gaps**: `/00-Overview/RESEARCH_GAPS.md` - Future research priorities

### 📚 Domain-Specific Research
- **Security**: `/01-Research/Security/audit-2025-01-23.md` - 10/10 security implementation
- **Architecture**: `/02-Architecture/audit-2025-01-23.md` - 10/10 modular design
- **Performance**: `/01-Research/Performance/audit-2025-01-23.md` - Bundle optimization success
- **Testing**: `/01-Research/Testing/audit-2025-01-23-1515.md` - Testing strategy and patterns
- **iOS/Mobile**: `/01-Research/iOS/audit-2025-01-23.md` - Mobile optimization guide
- **React Patterns**: `/01-Research/React/audit-2025-01-23.md` - Hook architecture excellence
- **Next.js**: `/01-Research/NextJS/audit-2025-01-23.md` - App Router reference implementation
- **Firebase**: `/01-Research/Firebase/audit-2025-01-23.md` - Production security setup

## ⚡ Priority Action Items (START IMMEDIATELY)

### Week 1 - Testing & iOS Deployment
```bash
# Hook Testing Setup
mkdir -p __tests__/hooks
npm install @testing-library/react-hooks --save-dev

# iOS Global Deployment  
# Edit app/layout.tsx to add IOSKeyboardProvider
# Activate haptic feedback in useHaptics hook

# Priority Hooks to Test:
# 1. useFocusTrap (accessibility critical)
# 2. useDebounce (performance critical)  
# 3. useNodesLogic (business logic critical)
# 4. useMatrixState (complex state)
# 5. useAI (external service integration)
```

### Week 2 - API Testing & Components
```bash
# API Route Testing
mkdir -p __tests__/api
# Test: /api/auth, /api/ai/categorize

# Component Testing
# Test: NodeCard, IOSButton, TimeboxCard, Dashboard Navigation
```

## 🛠️ Development Commands

### Essential Commands
```bash
# Development
pnpm run dev              # Start with Turbopack
pnpm run build           # Production build
pnpm run test            # Run Jest tests
pnpm run test:coverage   # Coverage report

# Analysis
pnpm run analyze         # Bundle analysis (IMPORTANT)
pnpm tsc --noEmit       # TypeScript check
pnpm run lint           # ESLint check

# iOS Testing
pnpm run dev -- --host 0.0.0.0  # Network testing for iOS devices
```

### Performance Monitoring
```bash
# Bundle size tracking
npm run bundlesize

# Performance analysis
npm run lighthouse

# Core Web Vitals
# Check Network tab for FCP, LCP metrics
```

## 📊 Success Metrics to Track

### Current Baseline (Achieved)
- **Overall Health**: 9.3/10
- **Security**: 10/10 (all vulnerabilities resolved)
- **Architecture**: 10/10 (modular, clean boundaries)
- **Performance**: 9/10 (bundle optimized to 1.2MB)
- **Testing Coverage**: 57% stores (strong foundation)

### Phase 1 Targets (Week 1-2)
- [ ] Hook test coverage: 80% of critical hooks
- [ ] iOS features: Global deployment active
- [ ] API testing: 75% route coverage
- [ ] Component testing: 4 high-usage components

### Phase 2 Targets (Week 3-4)
- [ ] Real-time sync: Active with <500ms latency
- [ ] Bundle size: <500kB initial load
- [ ] Accessibility: WCAG AA compliance verified
- [ ] Performance: <3s load time on 3G

## 🏗️ Architecture Guidelines

### Component Standards (ENFORCED)
```typescript
// MAX 300-500 lines per component (current: all compliant)
// Decomposition example from audit:
// - NodeCard.tsx (<400 lines)
// - NodeFilters.tsx (<200 lines) 
// - NodeActions.tsx (<250 lines)
```

### Store Architecture (OPTIMIZED)
```typescript
// Current: 6 domain stores (consolidated from 14)
// - coreStore (auth + preferences)
// - nodesStore (split into 7 modules, all <350 lines)
// - planningStore (timebox functionality, 601 lines)
// - contentStore (braindump + journal)
// - tasksStore (todos + calendar + routines)
// - uiStore (UI state + XP system)
```

### TypeScript Safety (IMPROVED)
```typescript
// Current: 193 'any' types (down from 302, -36%)
// Target: <60 'any' types for next phase
// Use proper interfaces for API responses
// Avoid 'any' in new code (ESLint enforcement coming)
```

## 🔒 Security Status (10/10 - EXCELLENT)

### ✅ Implemented Security Features
- **Firebase Admin SDK**: Full JWT verification in production
- **XSS Protection**: DOMPurify with multi-context sanitization
- **CSRF Protection**: Timing-safe token comparison
- **Multi-layer Authentication**: Edge → Server → API validation
- **Security Headers**: Comprehensive protection implemented

### 🛡️ Security Patterns
```typescript
// JWT Verification (implemented)
import { verifyIdToken } from '@/lib/firebase-admin'

// XSS Protection (implemented)
import { sanitize } from '@/lib/sanitization'

// API Route Security (pattern established)
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')
  const decodedToken = await verifyIdToken(token)
  // Proceed with verified user
}
```

## 📱 iOS/Mobile Features (READY FOR DEPLOYMENT)

### ✅ Implemented Features (Need Global Activation)
```typescript
// iOS Keyboard Avoidance - ACTIVATE GLOBALLY
import { IOSKeyboardProvider } from '@/contexts/IOSKeyboardContext'

// Haptic Feedback - ACTIVATE GLOBALLY  
const useHaptics = () => {
  const isIOS = useIOSDetection()
  return {
    success: () => isIOS && window.navigator.vibrate?.(100),
    // ... other patterns
  }
}

// Safe Area Handling - ALREADY ACTIVE
className="pb-safe-bottom" // iOS safe areas
```

### 📱 Mobile Testing Workflow
```bash
# 1. Start dev server for network access
pnpm run dev -- --host 0.0.0.0

# 2. Test on iOS device via network IP
# http://[your-ip]:3000

# 3. Test PWA installation
# Safari > Share > Add to Home Screen

# 4. Test offline functionality
# Developer tools > Network > Offline
```

## 🧪 Testing Strategy

### 🎯 Priority Testing Areas
1. **Hooks** (Week 1): useFocusTrap, useDebounce, useNodesLogic, useMatrixState, useAI
2. **API Routes** (Week 2): /api/auth, /api/ai/categorize, error handling
3. **Components** (Week 2): NodeCard, IOSButton, TimeboxCard, Navigation
4. **Integration** (Week 3+): Real-time sync, offline functionality

### 🧪 Testing Patterns
```typescript
// Hook Testing Pattern
import { renderHook, act } from '@testing-library/react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

describe('useFocusTrap', () => {
  it('should trap focus within container', () => {
    // Test implementation with JSDOM
  })
})

// API Route Testing Pattern
import { POST } from '@/app/api/auth/route'
import { NextRequest } from 'next/server'

describe('/api/auth', () => {
  it('should validate Firebase JWT tokens', async () => {
    // Mock Firebase Admin SDK
    // Test authentication flow
  })
})

// Component Testing Pattern  
import { render, screen, fireEvent } from '@testing-library/react'
import { NodeCard } from '@/components/nodes/NodeCard'

describe('NodeCard', () => {
  it('should render node information correctly', () => {
    // Mock store state
    // Test component rendering
  })
})
```

## 🔄 Real-time Architecture (Phase 2 Ready)

### 🔥 Firebase Real-time Implementation
```typescript
// Real-time Sync Service (ready for implementation)
import { onSnapshot, collection } from 'firebase/firestore'

export const useRealtimeSync = (userId: string) => {
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, 'nodes'),
      (snapshot) => {
        const changes = snapshot.docChanges()
        handleRealtimeUpdates(changes)
      }
    )
    return unsubscribe
  }, [userId])
}

// Optimistic Updates (enhanced pattern ready)
export const updateNodeOptimistic = async (nodeId: string, updates: Partial<Node>) => {
  // 1. Immediate local update
  updateLocalState(nodeId, updates)
  
  try {
    // 2. Firebase update
    await updateFirestore(nodeId, updates)
  } catch (error) {
    // 3. Rollback on failure
    rollbackLocalState(nodeId)
    throw error
  }
}
```

## 🎨 Performance Optimization

### 📊 Current Performance Status
- **Bundle Size**: 1.2MB (down from 2.5MB) ✅
- **Initial Load**: Currently fast, target <3s on 3G
- **Core Web Vitals**: Good scores, monitoring ready for Phase 3
- **Mobile Performance**: Excellent iOS optimization

### ⚡ Performance Patterns
```typescript
// Dynamic Imports (implemented)
const NodesClient = dynamic(() => import('./nodes-client'), {
  ssr: false,
  loading: () => <LoadingSkeleton />
})

// Bundle Splitting (optimized)
// next.config.js optimizations already in place

// Image Optimization (Next.js built-in)
import Image from 'next/image'
```

## 🎯 Common Development Scenarios

### 🆕 Adding New Features
1. **Check architecture guidelines** (component size limits)
2. **Write tests first** (TDD approach encouraged)
3. **Use established patterns** (hooks, store modules, security)
4. **Test on iOS devices** (mobile-first approach)

### 🔧 Debugging Issues
```bash
# Performance issues
pnpm run analyze  # Bundle analysis
# Check Network tab in DevTools

# TypeScript issues  
pnpm tsc --noEmit  # Type checking
# Check for 'any' types

# iOS issues
# Test on actual iOS device via network
# Check console for iOS-specific errors
```

### 🧪 Adding Tests
```bash
# Hook tests
mkdir -p __tests__/hooks
# Follow patterns in existing store tests

# Component tests
mkdir -p __tests__/components  
# Use React Testing Library patterns

# API tests
mkdir -p __tests__/api
# Mock Firebase Admin SDK
```

## 📈 Development Velocity Tips

### ⚡ Productivity Boosters
1. **Use established patterns** - Don't reinvent, follow audit recommendations
2. **Leverage existing optimizations** - iOS features ready, just activate
3. **Build on strong foundation** - 9.3/10 health enables fast development
4. **Test incrementally** - Strong testing infrastructure ready

### 🚫 Common Pitfalls to Avoid
1. **Don't violate component size limits** (300-500 lines max)
2. **Don't introduce 'any' types** (TypeScript safety degradation)
3. **Don't skip iOS testing** (mobile-first approach crucial)
4. **Don't ignore bundle size** (monitor with each change)

## 🤝 Team Collaboration

### 📋 Daily Standup Questions (Phase 1)
1. How many hooks tested today?
2. iOS features deployment progress?
3. Any blockers for API testing?
4. Component testing infrastructure status?

### 📊 Weekly Review Metrics
- Hook test coverage percentage
- iOS feature deployment status  
- API route test coverage
- Development velocity improvements

### 🔄 Code Review Checklist
- [ ] Component size within limits (<500 lines)
- [ ] No new 'any' types introduced
- [ ] Tests included for new functionality
- [ ] iOS compatibility considered
- [ ] Security patterns followed

## 🎉 Success Milestones

### Week 1 Celebrations
- ✅ First hook test passing
- ✅ iOS features globally deployed

### Week 2 Celebrations
- ✅ API testing complete
- ✅ Component testing infrastructure ready

### Month 1 Celebrations
- ✅ Real-time sync working
- ✅ Performance targets achieved

### Month 2 Celebrations
- ✅ PWA features live
- ✅ 9.5/10 health score achieved

## 📞 Need Help?

### 🔍 Research Resources
- **Comprehensive Analysis**: `/06-Reviews/comprehensive-audit-2025-01-23.md`
- **Domain-Specific Guides**: `/01-Research/[Domain]/audit-2025-01-23.md`
- **Implementation Roadmap**: `/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md`

### 🛠️ Technical Support
- **Architecture Questions**: Reference `/02-Architecture/audit-2025-01-23.md`
- **Security Concerns**: Reference `/01-Research/Security/audit-2025-01-23.md`
- **Performance Issues**: Reference `/01-Research/Performance/audit-2025-01-23.md`
- **Testing Strategy**: Reference `/01-Research/Testing/audit-2025-01-23-1515.md`

---

**Quick Reference Updated**: 2025-01-23T15:15:00Z  
**Project Status**: Enterprise-ready (9.3/10 health score)  
**Next Actions**: Execute Phase 1 immediately for maximum ROI  
**Support**: All implementation guidance available in knowledge base

**Key Success Factor**: The enterprise-grade foundation (10/10 security, 10/10 architecture) enables rapid, confident development with exceptional ROI. Focus on Phase 1 priorities for immediate velocity gains.