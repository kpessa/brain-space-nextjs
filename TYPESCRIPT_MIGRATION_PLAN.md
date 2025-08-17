# TypeScript Strict Mode Migration Plan

## Current Status
- **Strict mode**: Disabled
- **Error count with strict**: 140 errors
- **Main issues**: Type mismatches, missing properties, undefined types

## Migration Strategy

Rather than enabling strict mode all at once (which would break the build), we'll use a **gradual migration approach**.

### Phase 1: Incremental Strict Checks (Immediate)

Enable individual strict checks one at a time in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,        // Phase 1a - Start here
    "strictNullChecks": false,     // Phase 1b 
    "strictFunctionTypes": false,  // Phase 2
    "strictBindCallApply": true,   // Phase 3 (usually safe)
    "strictPropertyInitialization": false, // Phase 4
    "noImplicitThis": true,        // Phase 5
    "alwaysStrict": true           // Phase 6 (usually safe)
  }
}
```

### Phase 2: Fix Type Definitions

1. **Add Jest type definitions**:
```bash
pnpm add -D @types/jest @testing-library/jest-dom
```

2. **Create type definition file** for Jest matchers:
```typescript
// jest.d.ts
import '@testing-library/jest-dom'
```

3. **Fix component prop types**:
- Add proper prop interfaces to components accepting userId
- Update store types to include all properties

### Phase 3: Progressive File Migration

Use `// @ts-strict-check` directive to enable strict mode per file:

1. Start with utility files and types
2. Move to smaller components
3. Then stores and hooks
4. Finally, complex page components

### Phase 4: Full Strict Mode

Once all files are migrated, enable full strict mode:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

## Common Fixes Required

### 1. Missing Properties in Types

**Problem:**
```typescript
error TS2339: Property 'isPersonal' does not exist on type
```

**Solution:**
```typescript
interface NodeData {
  // ... existing properties
  isPersonal?: boolean;
  children?: NodeData[];
  parent?: string;
}
```

### 2. Component Props Not Defined

**Problem:**
```typescript
Type '{ userId: string; }' is not assignable to type 'IntrinsicAttributes'
```

**Solution:**
```typescript
interface CalendarClientProps {
  userId: string;
}

export default function CalendarClient({ userId }: CalendarClientProps) {
  // ...
}
```

### 3. Implicit Any Types

**Problem:**
```typescript
Parameter 'error' implicitly has an 'any' type
```

**Solution:**
```typescript
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
}
```

### 4. Null/Undefined Checks

**Problem:**
```typescript
Object is possibly 'null' or 'undefined'
```

**Solution:**
```typescript
// Use optional chaining
user?.displayName

// Or null guards
if (user) {
  console.log(user.displayName);
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Add missing type packages (@types/jest, etc.)
- [ ] Enable `noImplicitAny` and fix ~30 errors
- [ ] Create proper interfaces for all store states

### Week 2: Core Components
- [ ] Enable `strictNullChecks` gradually
- [ ] Fix component prop types
- [ ] Add proper event handler types

### Week 3: Advanced Types
- [ ] Enable remaining strict flags
- [ ] Fix function signatures
- [ ] Add generics where appropriate

### Week 4: Completion
- [ ] Enable full strict mode
- [ ] Run comprehensive type checking
- [ ] Document type patterns

## Benefits of Migration

1. **Catch bugs early**: Type errors caught at compile time
2. **Better IDE support**: Improved autocomplete and refactoring
3. **Documentation**: Types serve as inline documentation
4. **Refactoring safety**: Changes validated by compiler
5. **Team scalability**: Easier for new developers to understand

## Quick Start Commands

```bash
# Check current errors
pnpm tsc --noEmit

# Check with strict mode
pnpm tsc --strict --noEmit

# Check specific file
pnpm tsc --strict --noEmit path/to/file.ts

# Auto-fix some issues
pnpm tsc --noEmit --pretty
```

## Priority Files to Fix First

1. `/types/*.ts` - Type definitions
2. `/lib/*.ts` - Utility functions  
3. `/hooks/*.ts` - Custom hooks
4. `/store/*.ts` - Zustand stores
5. `/components/ui/*.tsx` - UI components
6. `/app/api/*.ts` - API routes

## Monitoring Progress

Track migration progress:
- Current: 0/140 errors fixed
- Target: Full strict mode enabled
- Deadline: 4 weeks

Use this command to track progress:
```bash
echo "Errors remaining: $(pnpm tsc --strict --noEmit 2>&1 | grep 'error TS' | wc -l)/140"
```