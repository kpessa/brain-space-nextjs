# Quick Start Guide - Brain Space Development

**Purpose**: Rapidly resume development after context switch or new session.

## 🚀 Immediate Start (< 2 minutes)

```bash
# 1. Check current state
git status
git log -1 --oneline

# 2. Start development server
pnpm run dev
# Opens at http://localhost:3000

# 3. Run tests (in another terminal)
pnpm test
```

## 📊 Current Performance Baseline

```bash
# Check bundle sizes (CRITICAL - /nodes at 83.3kB)
pnpm run build | grep "nodes\|calendar\|timebox"

# Analyze bundle composition
pnpm run analyze
# Opens bundle analyzer in browser
```

## 🎯 Priority Tasks

### 1. Bundle Size Reduction (CRITICAL)
```bash
# Quick win #1: Consolidate icon imports
grep -r "from 'lucide-react'" --include="*.tsx" --include="*.ts" | wc -l
# Currently: 75+ individual imports

# Quick win #2: Check for duplicate date libraries
grep -r "from 'date-fns'" --include="*.tsx" --include="*.ts" | head -5
grep -r "from 'dayjs'" --include="*.tsx" --include="*.ts" | head -5
# Both present - remove date-fns
```

### 2. Testing Coverage
```bash
# Current coverage: 1/15 stores tested
ls store/*.ts | wc -l  # Total stores
ls __tests__/**/*.test.* | wc -l  # Test files

# Priority stores to test next:
# - nodeStore.ts
# - authStore.ts  
# - braindumpStore.ts
```

### 3. PWA Setup
```bash
# Check PWA readiness
ls public/manifest.json  # ✅ Exists
ls public/sw.js         # ❌ Missing - needs implementation
```

## 🔧 Common Development Tasks

### Add a New Feature
```bash
# 1. Check knowledge base first
cat knowledge/architecture/component-hierarchy.md | grep -A5 "patterns"

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Follow existing patterns
cat components/nodes/NodeDetailModal.tsx | head -50  # Example component
```

### Fix a Bug
```bash
# 1. Check for related issues
grep -r "error\|Error" --include="*.tsx" | grep -v console

# 2. Run type check
pnpm tsc --noEmit

# 3. Test the fix
pnpm test -- --watch
```

### Optimize Performance
```bash
# 1. Measure current state
pnpm run build
pnpm run analyze

# 2. Find heavy imports
grep -r "import.*from" --include="*.tsx" | grep -E "xyflow|lucide|firebase" | wc -l

# 3. Implement lazy loading
# See: knowledge/research/optimizations/performance-analysis.md
```

## 📁 Key File Locations

### Critical Files
- **Main Config**: `next.config.js`, `tailwind.config.ts`
- **Node Logic**: `store/nodeStore.ts`, `app/(dashboard)/nodes/nodes-client.tsx`
- **AI Services**: `services/ai.ts`, `app/api/ai/categorize/route.ts`
- **Auth**: `contexts/AuthContext.tsx`, `lib/firebase.ts`

### Documentation
- **Current Focus**: `knowledge/CURRENT_FOCUS.md`
- **Architecture**: `knowledge/architecture/overview.md`
- **Roadmap**: `knowledge/roadmap/technical-debt.md`

## 🔍 Quick Debugging

### Check Logs
```bash
# Development console
# Browser: Open DevTools > Console

# Build errors
pnpm run build 2>&1 | grep -E "Error|Warning" | head -10

# TypeScript errors
pnpm tsc --noEmit 2>&1 | head -10
```

### Common Issues

#### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
# Or use: pnpm run dev -- -p 3001
```

#### Firebase Auth Issues
```bash
# Check env vars
grep FIREBASE .env.local | wc -l  # Should be 7+
```

#### Bundle Too Large
```bash
# Quick check
du -sh .next/static/chunks/*.js | sort -rh | head -5
```

## 🚦 Health Checks

```bash
# All systems check (run these in order)
pnpm install          # ✅ Dependencies
pnpm tsc --noEmit    # ✅ TypeScript
pnpm run lint        # ⚠️  293 warnings (non-critical)
pnpm test            # ✅ Tests pass
pnpm run build       # ✅ Builds successfully
```

## 📈 Metrics to Track

### Performance Targets
- **Bundle Size**: < 50kB per route (currently /nodes at 83.3kB)
- **Build Time**: < 30s
- **Test Coverage**: > 80% (currently ~7%)
- **Lighthouse Score**: > 90 (unmeasured)

### Quick Measurement
```bash
# Bundle sizes
pnpm run build | grep "First Load JS"

# Test coverage
pnpm test -- --coverage

# Type coverage
npx type-coverage
```

## 🎬 Next Actions

Based on current state (2024-08-17):

1. **NOW**: Run `pnpm run analyze` to visualize bundle
2. **NEXT**: Consolidate lucide-react imports 
3. **THEN**: Remove date-fns, keep dayjs only
4. **LATER**: Implement lazy loading for NodeDetailModal

---

*For detailed information, see `/knowledge/CURRENT_FOCUS.md`*
*For full setup, see `/knowledge/guides/setup.md`*