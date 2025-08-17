# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## High-Level Architecture

Brain Space is a PWA-first personal knowledge management system with a Next.js frontend and Firebase backend. The application has been migrated from Vite to Next.js 15 with App Router, maintaining the brain dump flow for capturing thoughts, which are then processed by AI services to categorize and organize them into structured nodes.

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

**Last Updated**: 2024-08-17

### Active Priorities
1. **🔴 CRITICAL**: Bundle size optimization - /nodes route at 83.3kB (target: <50kB)
2. **🟡 HIGH**: Testing coverage - Only 1/15 stores tested
3. **🟡 HIGH**: PWA implementation - Service Worker needed for offline
4. **🟢 MEDIUM**: Performance monitoring setup

### Recent Completions
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
- Bundle size exceeds target on /nodes route
- Limited test coverage (6.7% stores, 0% components)

<!-- AUDIT SECTION - Last Updated: 2025-08-17 -->
## Project Health Status
Generated by comprehensive audit on 2025-08-17

### Overall Health Score: 7.8/10

#### Metrics
- **Build Status**: ✅ Passing
- **Test Coverage**: 6.7% stores, 0% components
- **Bundle Size**: 83.3kB on /nodes route (66% over target)
- **Security Score**: 7.5/10 (Good - secrets properly managed via Vercel)
- **Performance Score**: 6.5/10 
- **Architecture Score**: 7.2/10
- **Accessibility Score**: 6.0/10

### Critical Issues Requiring Immediate Attention

#### P0 - CRITICAL (Fix Within 24 Hours)
1. ~~**Exposed API Keys in Version Control**~~ ✅ **FALSE POSITIVE - VERIFIED SECURE**
   - **Verification**: `.env.local` has NEVER been committed to git
   - **Status**: All API keys properly stored in Vercel's encrypted environment variables
   - **Confirmed**: 24 environment variables configured securely in Vercel
   - **No Action Required**: Professional secret management already in place
   
2. **Production Authentication Bypass**
   - Location: `/lib/firebase-admin.ts:45-52`
   - Impact: Firebase Admin SDK missing in production, enables auth bypass
   - Recommended Fix: Configure Firebase service account for production

3. **Bundle Size Regression on Critical Route**
   - Location: `/app/(dashboard)/nodes/nodes-client.tsx`
   - Impact: 83.3kB bundle (target: <50kB) causing mobile performance issues
   - Recommended Fix: Implement dynamic imports for @xyflow/react and heavy components

#### P1 - HIGH Priority (Fix This Week)
1. **TypeScript Safety Completely Disabled**
   - Location: `tsconfig.json` - strict mode disabled
   - Impact: 100+ `any` types compromising type safety
   - Files: Multiple components and stores with untyped functions
   
2. **Critical Accessibility Gaps**
   - Location: All modal components missing focus trapping
   - Impact: WCAG non-compliance, poor screen reader support
   - Files: `QuickAddModal.tsx`, `NodeDetailModal.tsx`, etc.

3. **Date Library Duplication**
   - Location: 15 files using both date-fns and dayjs
   - Impact: 25-30kB unnecessary bundle overhead
   - Files: Listed in `_knowledge/01-Research/Performance/AUDIT-2025-08-17.md`

#### P2 - MEDIUM Priority (Next Sprint)
1. **Store Fragmentation**: 13 separate Zustand stores causing state management complexity
2. **Missing Test Coverage**: Critical components and API routes untested
3. **Console Log Pollution**: 150+ console statements in production code
4. **Large Component Files**: Multiple components >1000 lines

### Discovered Project Patterns

#### Effective Patterns (Keep Using)
- **Edge Middleware Authentication**: Excellent security pattern with proper header passing
- **Optimistic Updates**: Well-implemented with rollback mechanisms in stores
- **Dynamic Imports**: Good foundation for code splitting (needs expansion)
- **PWA Implementation**: Strong iOS optimization and safe area handling
- **Firebase Integration**: Clean separation of client/admin SDKs

#### Anti-Patterns to Avoid
- **Barrel Exports**: Creating circular dependencies in `/store/index.ts`
- **Component Monoliths**: Files like `nodes-client.tsx` with 1000+ lines
- **Inconsistent Error Handling**: Different patterns across stores
- **Direct Store-to-Store Communication**: Creating tight coupling
- **Mixed Modal Patterns**: Three different modal implementations

#### Recommended Refactors (Exceeding Complexity Thresholds)
1. `/app/(dashboard)/nodes/nodes-client.tsx` - Split into smaller components
2. `/components/NodeDetailModal.tsx` (1159 lines) - Extract tab content
3. `/store/` - Consolidate 13 stores into 4-6 domain-focused stores
4. Date library migration - Complete transition to dayjs

### Project-Specific Commands

```bash
# Development
pnpm run dev              # Start with Turbopack
pnpm run build           # Production build
pnpm run lint            # ESLint check
pnpm run test            # Run Jest tests
pnpm run test:watch      # Watch mode testing
pnpm run test:coverage   # Coverage report

# Bundle Analysis (CRITICAL)
pnpm run analyze         # Analyze bundle sizes

# Type Checking
pnpm tsc --noEmit       # Check TypeScript errors

# Firebase
firebase emulators:start # Local Firebase emulators
firebase deploy         # Deploy to production
```

### Tech Stack Updates (Discovered Dependencies)

#### Core Stack
- **Next.js**: 15.4.5 (latest)
- **React**: 19.0.0-rc (release candidate)
- **TypeScript**: 5.7.3
- **Zustand**: 5.0.3 (state management)
- **Firebase**: 11.2.0 (auth, firestore, storage)

#### UI/UX Libraries
- **@xyflow/react**: 12.5.3 (node graphs - causing bundle issues)
- **Tailwind CSS**: 3.4.2
- **Framer Motion**: 11.18.0
- **React Icons**: 5.4.0

#### Development Tools
- **Jest**: 29.7.0 + React Testing Library
- **Playwright**: 1.49.1 (E2E testing)
- **Bundle Analyzer**: Configured but underutilized

### Knowledge Base References

For detailed analysis and implementation guides:
- **Comprehensive Audit**: `_knowledge/06-Reviews/COMPREHENSIVE-AUDIT-2025-08-17.md`
- **Architecture Analysis**: `_knowledge/02-Architecture/AUDIT-2025-08-17.md`
- **Security Report**: `_knowledge/01-Research/Security/AUDIT-2025-08-17.md`
- **Performance Analysis**: `_knowledge/01-Research/Performance/AUDIT-2025-08-17.md`
- **Current State**: `_knowledge/00-Overview/CURRENT_STATE.md`

### Success Metrics for Next 30 Days

1. **Security**: ✅ API keys verified secure in Vercel, Firebase Admin needs config
2. **Performance**: Bundle size <50kB on all routes
3. **Testing**: >50% store coverage, >30% component coverage
4. **Accessibility**: WCAG AA compliance on core flows
5. **TypeScript**: Strict mode enabled, <10 `any` types

### Security Configuration Status

**✅ VERIFIED SECURE**: All API keys and secrets are properly managed through Vercel's encrypted environment variables. The `.env.local` file is correctly gitignored and has never been committed to version control.

**Current Setup**:
- 24 environment variables configured in Vercel
- Proper separation of server-side secrets (no `NEXT_PUBLIC_` prefix)
- Client-side config uses `NEXT_PUBLIC_` prefix appropriately
- Local development uses `vercel env pull .env.local`