# Manual Authentication Capture for Testing

## The Problem
Google blocks authentication from automated browsers (Playwright, Puppeteer) for security reasons, showing "This browser or app may not be secure."

## Solution: Use Your Existing Browser Session

### Option 1: Copy Authentication from Your Regular Browser

1. **Open your regular Chrome/Safari browser**
2. **Go to http://localhost:3000**
3. **Sign in normally with Google (kpessa@gmail.com)**
4. **Open Developer Tools (F12 or Cmd+Option+I)**
5. **Go to Application Tab > Storage**
6. **Copy the authentication data:**
   - Cookies (especially Firebase auth cookies)
   - Local Storage items
   - Session Storage items

### Option 2: Connect Playwright to Your Existing Chrome

```bash
# 1. First, find your Chrome user data directory
# On Mac: ~/Library/Application Support/Google/Chrome

# 2. Close all Chrome windows

# 3. Start Chrome with remote debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# 4. Sign in to your app normally in this Chrome instance

# 5. In another terminal, run this script to connect and save auth
```

### Option 3: Use Browser Cookies Extension

1. Install a browser extension like "EditThisCookie" or "Cookie Editor"
2. Sign in to your app normally
3. Export cookies as JSON
4. Save to `e2e/storage-states/realUser.json`

### Option 4: Use Firebase Auth Token Directly

Since you're using Firebase Auth, we can extract and use the auth token directly:

1. Sign in normally in your browser
2. Open Console in DevTools
3. Run this to get your auth token:
```javascript
firebase.auth().currentUser.getIdToken().then(token => console.log(token))
```
4. Save this token for use in tests

## Recommended Approach for Your Setup

Since you want to test on Mobile Safari and desktop, let's use a hybrid approach:

1. **Manual sign-in in your regular browser**
2. **Extract the auth state**
3. **Use it in Playwright tests**

Here's a script to help extract your auth after manual login: