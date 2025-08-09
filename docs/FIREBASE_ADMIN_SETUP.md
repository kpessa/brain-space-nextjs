# Firebase Admin SDK Setup Guide

The Firebase Admin SDK is optional but enables server-side features like:
- Token verification without client SDK
- Server-side data operations
- Batch operations
- Admin operations

## Setup Instructions

### 1. Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (brain-space-5d787)
3. Navigate to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file securely

### 2. Add Environment Variables

Add these variables to your `.env.local` file:

```env
# Firebase Admin SDK (optional - for server-side operations)
FIREBASE_ADMIN_PROJECT_ID=brain-space-5d787
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@brain-space-5d787.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- The private key must include the BEGIN/END markers
- Keep the quotes around the private key value
- Replace `\n` with actual newlines or keep them escaped
- Never commit these values to version control

### 3. Verify Configuration

Run the verification script:

```bash
pnpm run verify:firebase
```

### 4. Deploy to Production

For Vercel deployment:

1. Go to your Vercel dashboard
2. Navigate to Project Settings > Environment Variables
3. Add the same three variables
4. Redeploy your application

## Troubleshooting

### Private Key Format Issues

If you get errors about the private key format:

1. Make sure the key is wrapped in double quotes
2. Either keep `\n` escaped or replace with actual newlines
3. Ensure BEGIN/END markers are present

### Missing Credentials

The app works without Firebase Admin SDK. Features that require it will gracefully degrade to client-side alternatives.

## Security Notes

- Never expose these credentials in client-side code
- Always use environment variables
- Keep service account keys secure
- Rotate keys periodically
- Use minimal permissions for service accounts