# Firebase Admin SDK Production Setup Guide

This guide walks you through configuring Firebase Admin SDK for secure production authentication in Brain Space.

## Overview

The Firebase Admin SDK is required for:
- Secure server-side token verification
- Production authentication without client-side vulnerabilities
- Access to Firebase services from API routes
- Proper JWT signature verification

## Current Status

### Development Mode
- ✅ Works without Firebase Admin SDK
- ⚠️ Uses basic JWT decode (less secure)
- ⚠️ No signature verification
- ✅ Allows development without service account setup

### Production Mode
- ❌ Requires Firebase Admin SDK configuration
- ✅ Full JWT signature verification
- ✅ Secure token validation
- ❌ Will fail without proper credentials

## Setup Instructions

### Step 1: Generate Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **Generate new private key**
6. Save the JSON file securely (never commit to git!)

### Step 2: Choose Configuration Method

#### Option 1: Service Account Key File (Recommended)

**Best for:** Production servers, Docker containers, local development

```bash
# Place the downloaded JSON file in a secure location
# Example: /opt/secrets/firebase-service-account.json

# Set environment variable
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_PATH=/path/to/your/service-account-key.json
```

#### Option 2: Environment Variables

**Best for:** Serverless deployments, CI/CD pipelines

Extract values from the JSON file:

```bash
# From your service-account-key.json file:
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
```

#### Option 3: Application Default Credentials (Google Cloud)

**Best for:** Google Cloud Run, App Engine, Compute Engine

```bash
# Only set the project ID, ADC handles the rest
FIREBASE_ADMIN_PROJECT_ID=your-project-id

# Or use the public project ID
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### Step 3: Environment Configuration

#### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the required variables:

```bash
# Option 1: Service Account Key (as JSON string)
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_PATH=Not applicable for Vercel

# Option 2: Individual variables (recommended for Vercel)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
```

**Important:** 
- Enclose the private key in quotes
- Keep the `\n` characters for line breaks
- Set these as **Production** and **Preview** environment variables

#### For Docker/Container Deployment

```dockerfile
# Option 1: Mount key file as volume
VOLUME /app/secrets
ENV FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_PATH=/app/secrets/firebase-service-account.json

# Option 2: Use environment variables
ENV FIREBASE_ADMIN_PROJECT_ID=your-project-id
ENV FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
ENV FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
```

### Step 4: Verify Configuration

After deployment, check the Firebase Admin status:

```bash
# Check initialization status
curl https://your-app.vercel.app/api/auth/session

# Look for:
# ✅ Success: "mode": "production"
# ❌ Error: "error": "Authentication service unavailable"
```

## Security Best Practices

### 1. Never Commit Credentials

```bash
# ❌ NEVER do this:
git add service-account-key.json
git add .env.local

# ✅ Always in .gitignore:
service-account-key.json
.env.local
.env
*.pem
*.key
```

### 2. Use Least Privilege

- Only grant necessary Firebase permissions
- Regularly rotate service account keys
- Monitor service account usage

### 3. Environment Separation

```bash
# Development
FIREBASE_ADMIN_PROJECT_ID=my-app-dev

# Staging  
FIREBASE_ADMIN_PROJECT_ID=my-app-staging

# Production
FIREBASE_ADMIN_PROJECT_ID=my-app-production
```

### 4. Secure Key Storage

- Use encrypted environment variables
- Consider secret management services
- Implement key rotation policies

## Troubleshooting

### Common Issues

#### 1. "Firebase Admin SDK not initialized"

```bash
# Check environment variables are set
echo $FIREBASE_ADMIN_PROJECT_ID
echo $FIREBASE_ADMIN_CLIENT_EMAIL
echo $FIREBASE_ADMIN_PRIVATE_KEY | head -1

# Verify file path exists
ls -la $FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_PATH
```

#### 2. "Invalid token format" or "Token verification failed"

- Check that the private key includes proper line breaks
- Ensure the key is enclosed in quotes
- Verify the client email matches the project

#### 3. "Token expired"

- Client-side tokens have limited lifetime (1 hour)
- Implement token refresh logic
- Check system clock synchronization

### Debug Mode

Enable detailed logging:

```bash
# In development
NODE_ENV=development
LOG_AUTH_EVENTS=true

# Check logs for:
# [Edge Auth] Token decode failed
# [Session API] Token verification failed
# 🔥 Firebase Admin SDK: initialization details
```

### Health Check

Create a simple health check script:

```javascript
// scripts/check-firebase-admin.js
const { getFirebaseAdminStatus } = require('./lib/firebase-admin');

const status = getFirebaseAdminStatus();
console.log('Firebase Admin Status:', {
  success: status.success,
  mode: status.mode,
  details: status.details,
  error: status.error
});

process.exit(status.success ? 0 : 1);
```

## Migration Guide

### From Development to Production

1. **Test locally first:**
   ```bash
   # Add credentials to .env.local
   npm run dev
   # Test auth flows
   ```

2. **Deploy to staging:**
   ```bash
   # Set staging environment variables
   vercel env add FIREBASE_ADMIN_PROJECT_ID staging
   vercel deploy --target staging
   ```

3. **Deploy to production:**
   ```bash
   # Set production environment variables
   vercel env add FIREBASE_ADMIN_PROJECT_ID production
   vercel deploy --prod
   ```

### Rollback Plan

If Firebase Admin configuration fails:

1. **Immediate:** Remove environment variables to fall back to development mode
2. **Short-term:** Fix configuration issues
3. **Long-term:** Implement proper credential management

## Monitoring and Alerting

### Key Metrics to Monitor

- Authentication success/failure rates
- Token verification latency
- Firebase Admin SDK initialization errors
- Invalid token attempts (potential attacks)

### Recommended Alerts

```javascript
// Example: Monitor auth failures
if (authFailureRate > 10%) {
  alert('High authentication failure rate detected')
}

if (adminSdkInitialization.success === false) {
  alert('Firebase Admin SDK initialization failed')
}
```

## Next Steps

1. ✅ Set up Firebase Admin SDK credentials
2. ✅ Deploy and verify production authentication
3. 🔄 Implement monitoring and alerting
4. 🔄 Set up credential rotation schedule
5. 🔄 Add integration tests for auth flows

## Support

For issues with this setup:

1. Check the troubleshooting section above
2. Review Firebase Admin SDK logs
3. Test with the health check script
4. Verify environment variables are properly set

Remember: **Never commit credentials to version control!**