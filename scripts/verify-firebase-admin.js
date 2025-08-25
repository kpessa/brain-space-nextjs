#!/usr/bin/env node

/**
 * Script to verify Firebase Admin SDK configuration
 * Run with: node scripts/verify-firebase-admin.js
 */

import { config } from 'dotenv';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('Firebase Admin Configuration Check\n' + '='.repeat(40));

  // Check required environment variables
  const requiredVars = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL', 
    'FIREBASE_ADMIN_PRIVATE_KEY'
  ];

  const publicVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  ];

  let hasErrors = false;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      if (varName === 'FIREBASE_PRIVATE_KEY') {
        // Check if private key has correct format
        const hasBegin = value.includes('-----BEGIN PRIVATE KEY-----');
        const hasEnd = value.includes('-----END PRIVATE KEY-----');
        const hasNewlines = value.includes('\\n') || value.includes('\n');
        
        console.log(`   ✓ ${varName}: Set (length: ${value.length})`);
        if (!hasBegin || !hasEnd) {
          console.log(`     ⚠️  Warning: Private key might be malformed (missing BEGIN/END markers)`);
          hasErrors = true;
        }
        if (!hasNewlines) {

          hasErrors = true;
        }
      } else {
        console.log(`   ✓ ${varName}: ${varName.includes('EMAIL') ? value : value.substring(0, 20) + '...'}`);
      }
    } else {

      hasErrors = true;
    }
  });

  publicVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✓ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`   ⚠️  ${varName}: NOT SET (optional but recommended)`);
    }
  });

  const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (adminProjectId && publicProjectId) {
    if (adminProjectId === publicProjectId) {

    } else {

      hasErrors = true;
    }
  } else if (adminProjectId && !publicProjectId) {
    // Try to infer from other sources

  }

  // Try to initialize Firebase Admin SDK directly (test implementation)

  try {
    // Import Firebase Admin modules
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    
    // Test initialization logic (similar to our implementation)
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const keyPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_PATH;
    
    let initSuccess = false;
    let initMode = 'disabled';
    let initDetails = '';
    
    // Skip if already initialized (from previous runs)
    if (getApps().length === 0) {
      // Method 1: Service Account Key File
      if (keyPath) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(keyPath)) {
            const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            initializeApp({ credential: cert(keyPath) });
            initSuccess = true;
            initMode = 'production';
            initDetails = 'Initialized with service account key file';

          } else {

          }
        } catch (error) {

        }
      }
      
      // Method 2: Environment Variables
      if (!initSuccess && projectId && clientEmail && privateKey) {
        try {
          initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
          });
          initSuccess = true;
          initMode = 'production';
          initDetails = 'Initialized with environment variables';

        } catch (error) {

        }
      }
      
      // Method 3: Application Default Credentials (simulated)
      if (!initSuccess && projectId && process.env.NODE_ENV === 'production') {

        initMode = 'production';
        initDetails = 'Would use ADC in Google Cloud environment';
      }
      
      // Development fallback
      if (!initSuccess) {
        initMode = process.env.NODE_ENV === 'development' ? 'development' : 'disabled';
        initDetails = 'No valid credentials - would use development fallback';

      }
      
    } else {
      initSuccess = true;
      initMode = 'production';
      initDetails = 'Already initialized (from previous test)';

    }
    
    // Test Auth instance
    if (initSuccess) {
      try {
        const auth = getAuth();

      } catch (error) {

        hasErrors = true;
      }
    }

    // Environment-specific warnings
    if (process.env.NODE_ENV === 'production' && !initSuccess) {

      hasErrors = true;
    } else if (initMode === 'development') {

    }
    
  } catch (error) {

    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(40));
  if (hasErrors) {

    process.exit(1);
  } else {

    process.exit(0);
  }
}

// Run the main function
main().catch(error => {

  process.exit(1);
});