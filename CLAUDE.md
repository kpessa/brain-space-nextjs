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