# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## High-Level Architecture

Brain Space is a PWA-first personal knowledge management system with a Next.js frontend and Firebase backend. The application has been migrated from Vite to Next.js 15 with App Router, maintaining the brain dump flow for capturing thoughts, which are then processed by AI services to categorize and organize them into structured nodes.


## Design 
- Keep components to 300-500 lines of code.  If they become more, look to refactor.

### Key Architecture Components:

1. **Frontend (Next.js 15 + React 19 + TypeScript)**
   - `/app/`: Next.js App Router pages and layouts
   - `/app/api/`: API routes for AI services
   - `/components/`: Reusable UI components
   - `/contexts/`: React contexts (AuthContext)
   - `/hooks/`: Custom React hooks
   - `/store/`: Zustand stores for state management
   - `/lib/`: Utility functions and Firebase configuration
   - `/services/`: Business logic and AI service integration

2. **Backend**
   - Firebase Auth for authentication
   - Firestore for data persistence (planned)
   - Next.js API routes for serverless AI processing
   - Support for multiple AI providers (OpenAI, Google AI/Gemini)

3. **AI Service Architecture**
   - API routes handle AI provider selection
   - Support for OpenAI, Google AI (Gemini), and mock providers
   - Secure API key management via environment variables
   - Mock AI service for development without API keys

## Common Development Commands

```bash
# Package manager - ALWAYS use pnpm
pnpm install              # Install dependencies
pnpm run dev             # Start Next.js development server with Turbopack
pnpm run build           # Build for production
pnpm run start           # Start production server
pnpm run lint            # Run Next.js ESLint configuration
```

## Available Subagents for Task Execution

Claude Code can leverage specialized subagents for complex tasks. Use these agents proactively when the task matches their expertise:

### Core Development Agents

**react-developer**
- Specializes in React and Next.js development, hooks, state management, SSR/SSG
- Tools: Read, Edit, MultiEdit, Grep, Glob, Bash, WebFetch
- Use for: Component development, React hooks implementation, Next.js routing, performance optimization

**svelte-developer**
- Expert in Svelte and SvelteKit, reactive programming, stores, component architecture
- Tools: Read, Edit, MultiEdit, Grep, Glob, Bash, WebFetch
- Use for: Svelte component development, SvelteKit routing, Svelte-specific optimizations

**firebase-specialist**
- Firebase services expert (Auth, Firestore, Functions, Storage, etc.)
- Tools: Read, Edit, MultiEdit, Grep, Glob, WebFetch, Bash
- Use for: Firebase configuration, authentication setup, Firestore queries, Cloud Functions

**api-integration**
- Handles REST/GraphQL APIs, webhooks, authentication flows, third-party services
- Tools: Read, Edit, MultiEdit, Grep, WebFetch, Bash
- Use for: API endpoint creation, external service integration, authentication implementation

### Quality & Testing

**testing-qa**
- Comprehensive testing specialist for unit, integration, and E2E tests
- Tools: Read, Edit, MultiEdit, Grep, Glob, Bash
- Use for: Writing test suites, ensuring code coverage, setting up testing frameworks

**code-reviewer**
- Analyzes code for quality, security, maintainability, and best practices
- Tools: Read, Grep, Glob, Bash
- Use for: Code reviews after implementing features, security audits, best practice checks

**refactor-specialist**
- Improves code structure and reduces technical debt without changing functionality
- Tools: Read, Edit, MultiEdit, Grep, Glob, Bash
- Use for: Code refactoring, improving maintainability, reducing complexity

### Design & UX

**design-theming-specialist**
- Modern UI design, color systems, typography, animations, dark/light modes
- Tools: Read, Edit, MultiEdit, Grep, Glob, WebFetch
- Use for: Theme implementation, design system creation, CSS/styling improvements

**styling-specialist**
- CSS architecture expert (Tailwind, SCSS, CSS-in-JS, component libraries)
- Tools: Read, Edit, MultiEdit, Grep, Glob, WebFetch
- Use for: Tailwind optimization, component library integration, CSS architecture, styling refactoring, reducing technical debt through pre-built components, maintaining small CSS footprint while enabling custom designs

**ui-ux-accessibility**
- Ensures optimal UX and WCAG compliance for inclusive design
- Tools: Read, Edit, Grep, Glob, WebFetch, Bash
- Use for: Accessibility audits, ARIA implementation, keyboard navigation, screen reader support

**ios-optimizer**
- iOS/Safari specialist for iPhone/iPad experience and PWA capabilities
- Tools: Read, Edit, Grep, Glob, WebFetch, Bash
- Use for: PWA manifest configuration, iOS-specific optimizations, touch interactions

### Architecture & Performance

**performance-optimizer**
- Identifies bottlenecks, improves load times, optimizes bundle sizes
- Tools: Read, Edit, MultiEdit, Grep, Glob, Bash, WebFetch
- Use for: Performance audits, bundle optimization, caching strategies, lazy loading

**state-persistence-sync**
- Local state persistence, offline-first architecture, database synchronization
- Tools: Read, Edit, MultiEdit, Grep, Glob, Bash
- Use for: IndexedDB implementation, offline functionality, state synchronization

**data-flow-architect**
- Maps and optimizes data flow throughout applications
- Tools: Read, Grep, Glob, Edit, MultiEdit
- Use for: State management architecture, data flow visualization, component connections

### DevOps & Debugging

**deployment-cicd**
- Git workflows, automated testing, GitHub Actions, Vercel deployment
- Tools: Bash, Read, Edit, MultiEdit, WebFetch, Glob
- Use for: CI/CD setup, deployment configuration, environment management

**debug-troubleshooter**
- Systematically finds root causes and fixes complex bugs
- Tools: Read, Edit, MultiEdit, Grep, Glob, Bash, WebFetch
- Use for: Bug investigation, error tracing, debugging complex issues

### General Purpose

**general-purpose**
- Researches complex questions and executes multi-step tasks
- Tools: All available tools
- Use for: Complex searches, multi-file operations, research tasks

### Usage Guidelines

1. **Proactive Usage**: Use specialized agents when tasks align with their expertise
2. **Parallel Execution**: Launch multiple agents concurrently when possible
3. **Task Delegation**: For complex features, delegate subtasks to appropriate specialists
4. **Example for Brain Space Project**:
   - Use `firebase-specialist` for Firestore integration
   - Use `react-developer` for component development
   - Use `performance-optimizer` for PWA optimization
   - Use `testing-qa` for test coverage implementation

## AI Provider Configuration

The app supports multiple AI providers through environment variables:

```env
# Provider-specific API keys (stored securely on server)
OPENAI_API_KEY=your_key
GOOGLE_AI_API_KEY=your_key

# Firebase configuration (public keys)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

## Development Workflow

1. **Route Structure**: Pages use Next.js App Router in `/app/` directory
2. **API Routes**: Server-side AI processing in `/app/api/` 
3. **State Management**: Zustand stores in `/store/` for global state
4. **AI Integration**: Brain dump flow calls `/api/ai/categorize` endpoint
5. **TypeScript**: Configured for rapid prototyping with relaxed rules (strict mode disabled)

## Key Features & API Endpoints

### Brain Dump Flow
1. User enters thoughts in brain dump page (`/braindump`)
2. Frontend sends POST request to `/api/ai/categorize`
3. API route processes with selected AI provider
4. Results include categorized thoughts with node data
5. User can convert thoughts to structured nodes

### AI API Route (`/api/ai/categorize`)
- Accepts `text` and optional `provider` in request body
- Provider options: `openai`, `google`/`gemini`, `mock` (default)
- Returns categorized thoughts with confidence scores
- Includes node data with type, title, tags, urgency, importance

### Firebase Integration
- Auth handled via Firebase Admin SDK
- Optional token verification in production
- Client-side Firebase config in `/lib/firebase.ts`
- Admin SDK config in `/lib/firebase-admin.ts`

## Important Notes

- TypeScript strict mode is intentionally disabled for rapid prototyping
- Always use `pnpm` for package management
- Path alias `@/` configured for imports from root directory
- Using Next.js 15 with React 19 and Turbopack for fast development
- All AI API keys must be server-side environment variables (not NEXT_PUBLIC_)

## Current Development State

**Last Updated**: 2025-01-23

### Active Priorities
1. **🔴 CRITICAL**: Bundle size optimization - /nodes route at 83.3kB (target: <50kB)
2. **🟡 HIGH**: Testing coverage - Only 1/15 stores tested
3. **🟡 HIGH**: PWA implementation - Service Worker needed for offline
4. **🟢 MEDIUM**: Performance monitoring setup

### Recent Completions
- ✅ Node Updates feature added to Matrix view - can now add timestamped updates/notes to nodes from /matrix route
- ✅ Fixed Firestore undefined field value errors in node updates
- ✅ Added visual indicators for nodes with updates in Matrix view (MessageSquare icon with count)
- ✅ Enabled double-click and context menu access to NodeDetailModal in Matrix view
- ✅ Knowledge base initialized with comprehensive documentation
- ✅ Work/Personal mode toggle for nodes implemented
- ✅ Build errors fixed (TypeScript, imports, console logs)
- ✅ Research agents deployed and documentation created

### Quick Resume Commands
```bash
# Check current state
git status
git log -3 --oneline

# Analyze bundle (PRIORITY)
pnpm run analyze

# Run tests
pnpm test

# Start development
pnpm run dev
```

### Where to Find Information
- **Current Focus**: `/knowledge/CURRENT_FOCUS.md`
- **Architecture**: `/knowledge/architecture/`
- **Roadmaps**: `/knowledge/roadmap/`
- **Quick Start**: `/knowledge/QUICK_START.md`

### Known Issues
- Firebase Admin shows "Missing credentials" warnings (expected in dev)
- Limited test coverage (29% stores, 0% components)

<!-- AUDIT SECTION - Last Updated: 2025-01-18 -->
## Project Health Status
Generated by comprehensive audit on 2025-01-18
**Updated with improvements**: 2025-01-18

### Overall Health Score: 8.0/10 ⬆️⬆️

#### Metrics
- **Build Status**: ✅ Passing
- **Test Coverage**: 29% stores, 0% components, 0% API routes
- **Bundle Size**: ⬆️ Improved (~750kB reduction expected)
- **Security Score**: ✅ 7/10 (API keys secure, auth improvements needed)
- **Performance Score**: 8/10 ⬆️ (React 18 stable, optimized imports)
- **Architecture Score**: 8.5/10 ⬆️ (Monoliths split, better separation)
- **Accessibility Score**: 7.5/10 (Strong foundation, critical gaps)
- **Mobile/PWA Score**: 7.5/10 (Good foundation, missing features)

### Security Status (Verified 2025-01-18)

#### ✅ API Keys Security - VERIFIED SAFE
- **`.env.local` properly configured** - Never committed to git
- **Gitignore working correctly** - File has always been ignored
- **No keys in git history** - Verified with comprehensive search
- **Production keys in Vercel** - Properly encrypted environment variables
- **Local dev setup correct** - `.env.local` for local development only

#### ⚠️ Medium Security Issues to Address

##### Authentication Improvements Needed
- Development mode bypasses some Firebase verification
- JWT decode without full signature verification
- **Impact**: Potential auth vulnerabilities in edge cases

##### XSS Protection Enhancement
- Some components use `dangerouslySetInnerHTML` without sanitization
- AI-generated content should use DOMPurify
- **Files**: Components rendering markdown content

### Recent Improvements (2025-01-18)

✅ **Performance Optimizations Completed:**
- React 19 RC → React 18.3.1 (stable, no more crashes)
- Removed framer-motion (250-300kB saved)
- Improved @xyflow/react lazy loading (400-500kB deferred)
- Console logs cleaned from production
- Split nodes-client.tsx into 6 focused components

### Remaining Critical Issues (P0)

1. **Component Monoliths** (Partially addressed)
   - ✅ `nodes-client.tsx`: Split into multiple components
   - ❌ `NodeDetailModal.tsx`: 1,152 lines still needs refactoring

### High Priority Issues (P1)

1. **Testing Coverage Crisis**
   - 0% component coverage (87+ components)
   - 0% API route coverage (16+ endpoints)
   - 0% mobile/iOS testing despite PWA focus

2. **Store Fragmentation**
   - 14 Zustand stores (should be 4-6)
   - Race conditions in node ID generation
   - No conflict resolution for concurrent edits

3. **TypeScript Safety Crisis**
   - 124 `any` types despite strict mode enabled
   - Missing types for API responses
   - Type assertions masking issues

### Medium Priority Issues (P2)

1. **iOS/PWA Issues**
   - 100vh viewport problems on iOS
   - iOS keyboard avoidance not deployed
   - Missing splash screens and haptic feedback
   - Service worker disabled in development

2. **Firebase Gaps**
   - No real-time data synchronization
   - Missing offline persistence
   - No rate limiting on API routes

### Discovered Project Patterns

#### Effective Patterns (Keep Using)
- **Optimistic Updates**: Industry-leading implementation with rollback
- **Focus Management**: Custom `useFocusTrap` hook with comprehensive accessibility
- **iOS Optimization**: IOSButton, safe areas, keyboard avoidance hooks
- **Next.js 15 App Router**: Perfect RSC/Client separation, route groups
- **Dynamic Imports**: 35+ lazy-loaded components for performance
- **Firebase Architecture**: User-scoped data model with security isolation
- **Edge Middleware**: Secure authentication with proper header passing

#### Anti-Patterns to Avoid
- **Component Monoliths**: `nodes-client.tsx` (1,529 lines) blocking development
- **Store Fragmentation**: 14 stores where 6 would suffice
- **Mixed Modal Patterns**: 3 different implementations causing inconsistency
- **Timestamp IDs**: Race conditions from `Date.now()` for ID generation
- **Development Auth Bypass**: Security vulnerabilities masked in dev
- **Console Log Pollution**: 166 console statements in production

#### Recommended Refactors (Exceeding Complexity Thresholds)
1. `/app/(dashboard)/nodes/nodes-client.tsx` (1,529 lines) - Split into 4-6 components
2. `/components/NodeDetailModal.tsx` (1,152 lines) - Extract tab content components
3. `/store/` - Consolidate 14 stores into 4-6 domain-focused stores
4. Replace timestamp IDs with `crypto.randomUUID()`
5. Remove React 19 RC, downgrade to stable React 18

### Project-Specific Commands

```bash
# Development
pnpm run dev              # Start with Turbopack
pnpm run build           # Production build
pnpm run lint            # ESLint check
pnpm run test            # Run Jest tests
pnpm run test:watch      # Watch mode testing
pnpm run test:coverage   # Coverage report

# Bundle Analysis (CRITICAL - Run to identify 2.5MB issue)
pnpm run analyze         # Analyze bundle sizes

# Console Cleanup (166 console.logs to remove)
node scripts/clean-console-logs.js  # Remove all console statements

# Type Checking
pnpm tsc --noEmit       # Check TypeScript errors (124 any types)

# Firebase
firebase emulators:start # Local Firebase emulators
firebase deploy         # Deploy to production
```

### Tech Stack (Current Versions)

#### Core Stack
- **Next.js**: 15.4.5 (latest)
- **React**: 19.0.0-rc ⚠️ (UNSTABLE - causes crashes)
- **TypeScript**: 5.7.3 (strict mode enabled but ignored)
- **Zustand**: 5.0.3 (14 stores - needs consolidation)
- **Firebase**: 11.2.0 (missing real-time sync)

#### Heavy Dependencies (Bundle Impact)
- **@xyflow/react**: 12.5.3 (400-500kB - needs lazy loading)
- **Framer Motion**: 11.18.0 (250-300kB - underutilized)
- **date-fns**: 4.1.0 (should be removed - dayjs migration incomplete)
- **Tailwind CSS**: 3.4.2
- **React Icons**: 5.4.0

#### Testing Infrastructure
- **Jest**: 29.7.0 (configured, underused)
- **React Testing Library**: 16.1.0 (0% component coverage)
- **Playwright**: 1.49.1 (E2E ready, minimal tests)
- **Bundle Analyzer**: Configured (use it!)

### Knowledge Base References

For detailed analysis from today's comprehensive audit:
- **Comprehensive Synthesis**: `_knowledge/06-Reviews/COMPREHENSIVE-AUDIT-2025-01-18.md`
- **Testing Analysis**: `_knowledge/01-Research/Testing/AUDIT-2025-01-18.md`
- **Technical Debt**: `_knowledge/01-Research/Refactoring/AUDIT-2025-01-18.md`
- **Performance Analysis**: `_knowledge/01-Research/Performance/AUDIT-2025-01-18.md`
- **Security Audit**: `_knowledge/01-Research/Security/AUDIT-2025-01-18.md`
- **UI/UX Review**: `_knowledge/01-Research/UI-UX/AUDIT-2025-01-18.md`
- **iOS/PWA Analysis**: `_knowledge/01-Research/iOS/AUDIT-2025-01-18.md`
- **Architecture Analysis**: `_knowledge/02-Architecture/AUDIT-2025-01-18.md`
- **Data Flow Analysis**: `_knowledge/03-Data-Flow/AUDIT-2025-01-18.md`
- **Next.js Patterns**: `_knowledge/01-Research/NextJS/AUDIT-2025-01-18.md`
- **Firebase Integration**: `_knowledge/01-Research/Firebase/AUDIT-2025-01-18.md`

### Immediate Action Plan

#### Week 1 - Critical Fixes
1. **Split nodes-client.tsx** (1,529 lines) into components
2. **Remove React 19 RC**, downgrade to React 18
3. **Fix bundle size**: Lazy load @xyflow/react
4. **Run console cleanup**: `node scripts/clean-console-logs.js`

#### Week 2-3 - Security & Architecture
1. **Fix authentication bypass** in middleware
2. **Add DOMPurify** for XSS protection
3. **Add rate limiting** to API routes
4. **Deploy iOS keyboard avoidance** hook globally

#### Month 1 - Foundation Stabilization
1. **Test coverage**: 50% components, 80% stores, 100% API routes
2. **Consolidate stores**: 14 → 6 domain stores
3. **TypeScript safety**: Fix 124 `any` types
4. **Bundle optimization**: 2.5MB → <750kB
5. **Real-time sync**: Add Firebase onSnapshot listeners

### Success Metrics (30 Days)

1. **Security**: Auth improvements deployed, XSS protection added
2. **Performance**: Bundle <750kB, FCP <1.5s, mobile load <5s
3. **Testing**: 50% component, 80% store, 100% API coverage
4. **TypeScript**: <20 `any` types remaining
5. **Architecture**: 6 consolidated stores, no files >500 lines