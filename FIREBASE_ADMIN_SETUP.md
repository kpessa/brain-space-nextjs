# Firebase Admin SDK Setup Guide

## Overview
The Firebase Admin SDK is required for secure authentication in production. Without it, the app cannot verify Firebase Auth tokens server-side.

## Current Status
- ✅ Code is properly configured to use Firebase Admin SDK
- ✅ Environment variables are configured in Vercel (Added: August 9, 2024)
- ✅ Service account credentials are active in production
- ✅ **SETUP COMPLETE** - Production authentication is fully secured

## Setup Instructions

### Step 1: Generate Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the downloaded JSON file securely

### Step 2: Extract Required Values

From the downloaded JSON file, you need:
- `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
- `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`  
- `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`

### Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables for Production:

```bash
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- Keep the `\n` characters in the private key
- Ensure all three variables are set
- These should only be set on the server (no `NEXT_PUBLIC_` prefix)

### Step 4: Verify Configuration

After deployment, check the logs for:
- ✅ No "Firebase Admin SDK not initialized" warnings
- ✅ Authentication working properly
- ✅ `/api/auth/session` returning proper responses

## Security Considerations

1. **Never commit the service account JSON to git**
2. **Only set these variables in Vercel's dashboard**
3. **Use different service accounts for staging/production**
4. **Regularly rotate service account keys**

## Troubleshooting

### Issue: "Authentication service unavailable" in production
**Solution:** Ensure all three environment variables are properly set in Vercel

### Issue: Private key format errors
**Solution:** Make sure to preserve the `\n` characters in the private key string

### Issue: Permission denied errors
**Solution:** Ensure the service account has the necessary Firebase Admin permissions

## Testing Locally

For local development with Firebase Admin:

1. Create `.env.local` file (already gitignored):
```env
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="your-service-account-email"
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key-with-newlines"
```

2. Or use Firebase emulators (recommended):
```bash
firebase emulators:start
```

## Current Code Implementation

The Firebase Admin SDK is initialized in `/lib/firebase-admin.ts`:
- Automatically reads environment variables
- Gracefully handles missing credentials
- Provides `adminAuth` and `adminDb` exports

The authentication flow in `/app/api/auth/session/route.ts`:
- Checks for Firebase Admin availability
- Falls back to development mode if not in production
- Properly verifies tokens when Admin SDK is available

## Action Required

To complete the Firebase Admin setup:
1. Generate service account credentials from Firebase Console
2. Add the three environment variables to Vercel
3. Redeploy the application
4. Test authentication flow

Once configured, the app will have:
- ✅ Secure server-side token verification
- ✅ No authentication bypass in production
- ✅ Proper session management
- ✅ Enhanced security posture