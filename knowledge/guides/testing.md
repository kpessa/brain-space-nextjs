# Testing Guide for Brain Space Developers

*Guide Version: 1.0*  
*Last Updated: 2024-08-17*

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

## Testing Philosophy

Brain Space follows a pragmatic testing approach focused on:
1. **Critical Path Coverage**: Test the most important user flows first
2. **State Management Focus**: Extensive testing of Zustand stores
3. **Accessibility First**: Every component tested for a11y compliance
4. **Realistic Testing**: Use real-world scenarios, not contrived examples
5. **Fast Feedback**: Unit tests provide immediate feedback during development

## Test Structure

```
__tests__/
├── store/              # Zustand store tests
├── components/         # React component tests  
├── api/               # API route tests
├── utils/             # Utility function tests
├── integration/       # Cross-system integration tests
└── accessibility/     # Dedicated a11y tests

e2e/
├── auth.spec.ts       # Authentication flows
├── braindump.spec.ts  # Brain dump workflows
├── timebox.spec.ts    # Timebox functionality  
└── mobile.spec.ts     # Mobile-specific tests
```

## Writing Store Tests

### Zustand Store Testing Pattern

```typescript
// __tests__/store/exampleStore.test.ts
import { renderHook, act } from '@testing-library/react'
import { useExampleStore } from '@/store/exampleStore'

describe('ExampleStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useExampleStore.setState({
      items: [],
      isLoading: false,
      error: null,
    })
  })

  describe('Basic Operations', () => {
    it('adds item to store', () => {
      const { result } = renderHook(() => useExampleStore())
      
      act(() => {
        result.current.addItem({ id: '1', name: 'Test Item' })
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0]).toMatchObject({
        id: '1',
        name: 'Test Item'
      })
    })

    it('removes item from store', () => {
      const { result } = renderHook(() => useExampleStore())
      
      // Setup initial state
      act(() => {
        result.current.addItem({ id: '1', name: 'Test Item' })
      })

      // Test removal
      act(() => {
        result.current.removeItem('1')
      })

      expect(result.current.items).toHaveLength(0)
    })
  })

  describe('Async Operations', () => {
    it('handles loading states correctly', async () => {
      const { result } = renderHook(() => useExampleStore())
      
      // Start async operation
      const promise = act(async () => {
        await result.current.loadItems()
      })

      // Check loading state
      expect(result.current.isLoading).toBe(true)
      
      await promise
      
      expect(result.current.isLoading).toBe(false)
    })

    it('handles errors gracefully', async () => {
      // Mock Firebase to throw error
      jest.spyOn(console, 'error').mockImplementation(() => {})
      
      const { result } = renderHook(() => useExampleStore())
      
      await act(async () => {
        await result.current.loadItemsWithError()
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Optimistic Updates', () => {
    it('handles optimistic updates with rollback on failure', async () => {
      // Mock Firebase to fail
      const mockUpdate = jest.fn().mockRejectedValue(new Error('Network error'))
      
      const { result } = renderHook(() => useExampleStore())
      
      // Setup initial item
      act(() => {
        result.current.addItem({ id: '1', name: 'Original Name' })
      })

      // Attempt optimistic update
      await act(async () => {
        await result.current.updateItem('1', { name: 'New Name' })
      })

      // Verify rollback occurred
      expect(result.current.items[0].name).toBe('Original Name')
      expect(result.current.error).toBeTruthy()
    })
  })
})
```

### Firebase Integration Testing

```typescript
// Mock Firebase operations
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user' }
  }
}))

// Mock Firestore operations
const mockDoc = jest.fn()
const mockUpdateDoc = jest.fn()
const mockDeleteDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  serverTimestamp: () => ({ seconds: 1234567890 })
}))
```

## Writing Component Tests

### Basic Component Testing

```typescript
// __tests__/components/ExampleComponent.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExampleComponent } from '@/components/ExampleComponent'

describe('ExampleComponent', () => {
  const defaultProps = {
    title: 'Test Title',
    onSubmit: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with correct title', () => {
    render(<ExampleComponent {...defaultProps} />)
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    
    render(<ExampleComponent {...defaultProps} onSubmit={onSubmit} />)
    
    const button = screen.getByRole('button', { name: /submit/i })
    await user.click(button)
    
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('displays loading state', () => {
    render(<ExampleComponent {...defaultProps} isLoading={true} />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays error state', () => {
    const error = 'Something went wrong'
    render(<ExampleComponent {...defaultProps} error={error} />)
    
    expect(screen.getByText(error)).toBeInTheDocument()
  })
})
```

### Testing with Store Integration

```typescript
// Testing components that use stores
import { renderWithProviders } from '../test-utils'

// test-utils.tsx
export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <TestProviders>
      {ui}
    </TestProviders>
  )
}

// In your test
it('updates store when user interacts', () => {
  renderWithProviders(<ComponentWithStore />)
  
  const button = screen.getByRole('button')
  fireEvent.click(button)
  
  // Access store state to verify update
  const store = useExampleStore.getState()
  expect(store.items).toHaveLength(1)
})
```

### Accessibility Testing

```typescript
// __tests__/accessibility/component.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Component Accessibility', () => {
  it('meets WCAG guidelines', async () => {
    const { container } = render(<AccessibleComponent />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('supports keyboard navigation', () => {
    render(<AccessibleComponent />)
    
    const firstButton = screen.getAllByRole('button')[0]
    firstButton.focus()
    
    fireEvent.keyDown(firstButton, { key: 'Tab' })
    
    const secondButton = screen.getAllByRole('button')[1]
    expect(secondButton).toHaveFocus()
  })

  it('provides proper ARIA labels', () => {
    render(<AccessibleComponent />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label')
    expect(button).toHaveAttribute('aria-describedby')
  })
})
```

## Writing API Tests

### API Route Testing Setup

```typescript
// __tests__/api/setup.ts
import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'

export function createMockRequest(options: {
  method?: string
  body?: any
  headers?: Record<string, string>
}) {
  const { req, res } = createMocks({
    method: options.method || 'GET',
    body: options.body,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  })

  return { req: req as NextRequest, res }
}

export const mockAuthHeader = 'Bearer mock-jwt-token'
```

### API Route Testing Pattern

```typescript
// __tests__/api/ai/categorize.test.ts
import { POST } from '@/app/api/ai/categorize/route'
import { createMockRequest, mockAuthHeader } from '../setup'

// Mock external dependencies
jest.mock('@/lib/auth-helpers')
jest.mock('@/lib/firebase')

describe('/api/ai/categorize', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 without auth header', async () => {
      const request = new Request('http://localhost/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ text: 'test' }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth header', async () => {
      const request = new Request('http://localhost/api/ai/categorize', {
        method: 'POST',
        headers: { authorization: 'Bearer invalid' },
        body: JSON.stringify({ text: 'test' }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(401)
    })
  })

  describe('Request Validation', () => {
    it('validates required fields', async () => {
      const request = new Request('http://localhost/api/ai/categorize', {
        method: 'POST',
        headers: { authorization: mockAuthHeader },
        body: JSON.stringify({}), // Missing required 'text' field
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('text')
    })

    it('validates text field type', async () => {
      const request = new Request('http://localhost/api/ai/categorize', {
        method: 'POST',
        headers: { authorization: mockAuthHeader },
        body: JSON.stringify({ text: 123 }), // Wrong type
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('AI Provider Integration', () => {
    it('processes text with mock provider', async () => {
      const request = new Request('http://localhost/api/ai/categorize', {
        method: 'POST',
        headers: { authorization: mockAuthHeader },
        body: JSON.stringify({ 
          text: 'Buy groceries and walk the dog',
          provider: 'mock'
        }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.categories).toBeDefined()
      expect(Array.isArray(data.categories)).toBe(true)
    })

    it('handles OpenAI provider when configured', async () => {
      // Mock environment variable
      process.env.OPENAI_API_KEY = 'test-key'
      
      // Mock fetch for OpenAI API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                categories: [{ name: 'Tasks', thoughts: [] }]
              })
            }
          }]
        })
      })

      const request = new Request('http://localhost/api/ai/categorize', {
        method: 'POST',
        headers: { authorization: mockAuthHeader },
        body: JSON.stringify({ 
          text: 'Buy groceries',
          provider: 'openai'
        }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('returns fallback response on AI provider failure', async () => {
      // Mock AI provider to throw error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const request = new Request('http://localhost/api/ai/categorize', {
        method: 'POST',
        headers: { authorization: mockAuthHeader },
        body: JSON.stringify({ 
          text: 'test text',
          provider: 'openai'
        }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.categories[0].name).toBe('Uncategorized')
      expect(data.error).toBeDefined()
    })
  })
})
```

## Writing E2E Tests

### E2E Testing Patterns

```typescript
// e2e/braindump-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Brain Dump to Timebox Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for E2E tests
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('test-auth', 'authenticated')
    })
  })

  test('complete workflow from thought to scheduled task', async ({ page }) => {
    // Navigate to brain dump
    await page.goto('/braindump')
    
    // Enter brain dump text
    await page.fill('[data-testid="brain-dump-input"]', 
      'Buy groceries for dinner party\nCall mom about weekend plans\nFinish project presentation')
    
    // Process thoughts
    await page.click('[data-testid="process-button"]')
    
    // Wait for AI processing
    await expect(page.getByText('Processing your thoughts')).toBeVisible()
    await expect(page.getByText('Processing your thoughts')).not.toBeVisible({ timeout: 10000 })
    
    // Verify categorization results
    await expect(page.getByText('Tasks')).toBeVisible()
    await expect(page.getByText('Buy groceries')).toBeVisible()
    await expect(page.getByText('Call mom')).toBeVisible()
    
    // Create nodes from thoughts
    await page.click('[data-testid="create-all-nodes"]')
    
    // Navigate to timebox
    await page.goto('/timebox')
    
    // Verify nodes appear in node pool
    await expect(page.getByText('Buy groceries')).toBeVisible()
    
    // Drag node to time slot
    const groceryTask = page.getByText('Buy groceries').first()
    const timeSlot = page.locator('[data-slot-time="09:00"]').first()
    
    await groceryTask.dragTo(timeSlot)
    
    // Verify task is assigned to slot
    await expect(timeSlot.getByText('Buy groceries')).toBeVisible()
    
    // Test task completion
    await timeSlot.getByText('Buy groceries').click()
    await page.click('[data-testid="mark-complete"]')
    
    // Verify task is marked complete
    await expect(timeSlot.getByText('Buy groceries')).toHaveClass(/completed/)
  })

  test('handles keyboard navigation for accessibility', async ({ page }) => {
    await page.goto('/timebox')
    
    // Focus first draggable item
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toHaveAttribute('draggable', 'true')
    
    // Start keyboard drag
    await page.keyboard.press('Enter')
    await expect(page.getByText(/started dragging/i)).toBeVisible()
    
    // Move with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    
    // Drop
    await page.keyboard.press('Enter')
    await expect(page.getByText(/dropped/i)).toBeVisible()
  })

  test('works offline and syncs on reconnection', async ({ page, context }) => {
    await page.goto('/timebox')
    
    // Go offline
    await context.setOffline(true)
    
    // Add task while offline
    await page.click('[data-testid="add-task"]')
    await page.fill('[data-testid="task-input"]', 'Offline task')
    await page.click('[data-testid="save-task"]')
    
    // Verify task appears locally
    await expect(page.getByText('Offline task')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Trigger sync
    await page.reload()
    
    // Verify task persisted
    await expect(page.getByText('Offline task')).toBeVisible()
  })
})
```

### Mobile E2E Testing

```typescript
// e2e/mobile.spec.ts
import { test, expect, devices } from '@playwright/test'

test.use(devices['iPhone 12'])

test.describe('Mobile Experience', () => {
  test('touch interactions work correctly', async ({ page }) => {
    await page.goto('/timebox')
    
    // Test touch drag and drop
    const task = page.getByText('Test Task').first()
    const slot = page.locator('[data-slot-time="10:00"]').first()
    
    // Touch and drag
    await task.touchStart()
    await page.mouse.move(slot.boundingBox()!.x, slot.boundingBox()!.y)
    await task.touchEnd()
    
    // Verify drop
    await expect(slot.getByText('Test Task')).toBeVisible()
  })

  test('responsive layout works correctly', async ({ page }) => {
    await page.goto('/timebox')
    
    // Verify mobile navigation
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
    
    // Verify layout adjustments
    const grid = page.locator('[data-testid="timebox-grid"]')
    await expect(grid).toHaveCSS('grid-template-columns', /1fr/)
  })
})
```

## Performance Testing

### Component Performance Tests

```typescript
// __tests__/performance/components.test.tsx
import { render } from '@testing-library/react'
import { performance } from 'perf_hooks'

function measureRenderTime(component: React.ReactElement): number {
  const start = performance.now()
  render(component)
  return performance.now() - start
}

describe('Performance Tests', () => {
  it('renders large lists efficiently', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ 
      id: `item-${i}`, 
      name: `Item ${i}` 
    }))
    
    const renderTime = measureRenderTime(<ItemList items={items} />)
    
    expect(renderTime).toBeLessThan(100) // 100ms threshold
  })

  it('handles rapid state updates efficiently', () => {
    const { result } = renderHook(() => useTimeboxStore())
    
    const start = performance.now()
    
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.addTask(`task-${i}`)
      }
    })
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(50) // 50ms threshold
  })
})
```

## Testing Utilities

### Custom Test Utilities

```typescript
// __tests__/test-utils.tsx
import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Mock providers wrapper
function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ErrorBoundary>
  )
}

// Custom render function
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestProviders, ...options })
}

// Mock data generators
export function createMockNode(overrides?: Partial<Node>) {
  return {
    id: `node-${Math.random()}`,
    type: 'task',
    title: 'Mock Task',
    urgency: 5,
    importance: 5,
    ...overrides,
  }
}

export function createMockTimeSlot(overrides?: Partial<TimeSlot>) {
  return {
    id: `slot-${Math.random()}`,
    startTime: '09:00',
    endTime: '10:00',
    tasks: [],
    isBlocked: false,
    ...overrides,
  }
}

// Re-export everything
export * from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
```

### Firebase Test Helpers

```typescript
// __tests__/firebase-helpers.ts
export function mockFirestore() {
  const mockDoc = jest.fn()
  const mockCollection = jest.fn()
  const mockUpdateDoc = jest.fn()
  const mockDeleteDoc = jest.fn()
  const mockGetDocs = jest.fn()

  jest.mock('firebase/firestore', () => ({
    doc: mockDoc,
    collection: mockCollection,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    getDocs: mockGetDocs,
    serverTimestamp: () => ({ seconds: Date.now() / 1000 }),
  }))

  return {
    mockDoc,
    mockCollection,
    mockUpdateDoc,
    mockDeleteDoc,
    mockGetDocs,
  }
}

export function mockAuth(user?: any) {
  jest.mock('@/lib/firebase', () => ({
    auth: {
      currentUser: user || { uid: 'test-user', email: 'test@example.com' },
      signInWithPopup: jest.fn(),
      signOut: jest.fn(),
    },
  }))
}
```

## Running Tests

### Local Development

```bash
# Watch mode for active development
pnpm test:watch

# Run specific test file
pnpm test timeboxStore

# Run tests with coverage
pnpm test:coverage

# Debug tests in browser
pnpm test --debug
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:coverage
      - run: pnpm test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### Common Issues and Solutions

```typescript
// Issue: Timer-related tests failing
jest.useFakeTimers()

test('debounced function works', () => {
  const fn = jest.fn()
  const debouncedFn = debounce(fn, 100)
  
  debouncedFn()
  debouncedFn()
  debouncedFn()
  
  jest.advanceTimersByTime(100)
  
  expect(fn).toHaveBeenCalledTimes(1)
})

// Issue: Async tests not completing
test('async operation completes', async () => {
  const promise = someAsyncFunction()
  
  await expect(promise).resolves.toBe(expectedValue)
})

// Issue: Component not updating after state change
test('component updates on store change', async () => {
  render(<Component />)
  
  act(() => {
    store.setState({ value: 'new value' })
  })
  
  await waitFor(() => {
    expect(screen.getByText('new value')).toBeInTheDocument()
  })
})
```

## Test Coverage Goals

### Coverage Targets by Area

- **Stores**: 90% coverage (critical business logic)
- **Components**: 80% coverage (focus on user interactions)
- **API Routes**: 85% coverage (data integrity)
- **Utilities**: 95% coverage (pure functions)
- **Integration**: 70% coverage (cross-system interactions)

### Monitoring Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View coverage in browser
open coverage/lcov-report/index.html

# Check coverage thresholds
pnpm test:coverage --passWithNoTests
```

## Best Practices Summary

1. **Test Structure**: Follow AAA pattern (Arrange, Act, Assert)
2. **Test Names**: Use descriptive names that explain the scenario
3. **Test Data**: Use realistic, meaningful test data
4. **Mocking**: Mock external dependencies, not internal logic
5. **Assertions**: Be specific with assertions, avoid over-asserting
6. **Cleanup**: Always clean up side effects between tests
7. **Focus**: Test behavior, not implementation details
8. **Maintenance**: Keep tests simple and maintainable

---

*This guide is updated regularly. Check the knowledge base for the latest testing patterns and recommendations.*