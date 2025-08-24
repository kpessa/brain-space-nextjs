# Real User Authentication for Playwright Tests

This guide explains how to set up and use real Google account authentication for Playwright tests, including MCP browser control.

## Setup (One-Time)

1. **Start the development server:**
   ```bash
   pnpm run dev
   ```

2. **Run the authentication setup script:**
   ```bash
   pnpm run test:e2e:setup-auth
   ```
   
3. **Follow the prompts:**
   - A browser window will open
   - Click "Continue with Google"
   - Sign in with your Google account (kpessa@gmail.com)
   - Complete the authentication process
   - The script will save your authentication state

4. **Verify setup:**
   - Check that `e2e/storage-states/realUser.json` exists
   - This file is in `.gitignore` and won't be committed

## Using Real Authentication in Tests

### Method 1: Use the realUserPage Fixture

```typescript
import { test, expect } from './fixtures/auth.fixture'

test('test with real user', async ({ realUserPage }) => {
  await realUserPage.goto('/journal')
  // Your authenticated test code here
})
```

### Method 2: Run Real User Tests

```bash
# Run all real user tests
pnpm run test:e2e:real

# Or run specific test with real auth
PLAYWRIGHT_AUTH_MODE=real pnpm exec playwright test your-test.spec.ts
```

### Method 3: Use with Playwright MCP

When using Playwright MCP browser control, your real authentication will be available if you've run the setup. The browser will have access to your saved authentication state.

## Authentication State Management

### Refresh Authentication
If your authentication expires:
```bash
pnpm run test:e2e:setup-auth
```

### Check Authentication Status
The test will warn you if authentication has expired:
```
⚠️  Real user authentication may have expired.
Run: pnpm exec ts-node e2e/setup-real-auth.ts
```

### Storage Location
- Authentication state: `e2e/storage-states/realUser.json`
- This file contains cookies and localStorage data
- **Never commit this file** (it's in .gitignore)

## Writing Tests for Real User

### Check for Real User Mode
```typescript
test.skip(
  process.env.PLAYWRIGHT_AUTH_MODE !== 'real', 
  'Real user tests - set PLAYWRIGHT_AUTH_MODE=real to run'
)
```

### Access User Email
```typescript
const userEmail = process.env.REAL_USER_EMAIL || 'kpessa@gmail.com'
```

### Example Test
```typescript
test('access protected route with real account', async ({ realUserPage }) => {
  await realUserPage.goto('/journal')
  
  // Should not redirect to login
  await expect(realUserPage).not.toHaveURL(/.*login.*/)
  
  // Test real user data
  const entries = realUserPage.locator('[data-testid="journal-entry"]')
  expect(await entries.count()).toBeGreaterThan(0)
})
```

## Switching Between Test and Real Users

### Use Test Users (Default)
```bash
pnpm run test:e2e
```

### Use Real User
```bash
PLAYWRIGHT_AUTH_MODE=real pnpm run test:e2e
```

### Environment Variables
- `PLAYWRIGHT_AUTH_MODE`: Set to "real" for real user, "mock" for test users
- `REAL_USER_EMAIL`: Your Google account email (for reference)

## Troubleshooting

### Authentication Expired
Run setup again: `pnpm run test:e2e:setup-auth`

### Browser Doesn't Open in Setup
- Make sure you're not in headless mode
- Check that port 3000 is available
- Ensure dev server is running

### Tests Still Redirect to Login
1. Check authentication state exists: `ls e2e/storage-states/`
2. Re-run setup: `pnpm run test:e2e:setup-auth`
3. Check cookies in browser DevTools

### Permission Denied
Make sure the storage-states directory has write permissions:
```bash
chmod 755 e2e/storage-states
```

## Security Notes

1. **Never commit** `realUser.json` to version control
2. Authentication state includes sensitive cookies
3. Use test users for CI/CD pipelines
4. Real user auth is for local development only

## Benefits

- Test with real data
- Verify actual user experience
- Test production authentication flow
- Works with Playwright MCP browser control
- No need to mock authentication