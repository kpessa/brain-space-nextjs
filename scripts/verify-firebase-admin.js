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

  console.log('\n1. Checking Firebase Admin SDK variables:');
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
          console.log(`     ⚠️  Warning: Private key might be missing newline characters`);
          hasErrors = true;
        }
      } else {
        console.log(`   ✓ ${varName}: ${varName.includes('EMAIL') ? value : value.substring(0, 20) + '...'}`);
      }
    } else {
      console.log(`   ✗ ${varName}: NOT SET`);
      hasErrors = true;
    }
  });

  console.log('\n2. Checking public Firebase variables:');
  publicVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✓ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`   ⚠️  ${varName}: NOT SET (optional but recommended)`);
    }
  });

  console.log('\n3. Checking project ID consistency:');
  const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (adminProjectId && publicProjectId) {
    if (adminProjectId === publicProjectId) {
      console.log(`   ✓ Project IDs match: ${adminProjectId}`);
    } else {
      console.log(`   ✗ Project ID mismatch!`);
      console.log(`     Admin: ${adminProjectId}`);
      console.log(`     Public: ${publicProjectId}`);
      hasErrors = true;
    }
  } else if (adminProjectId && !publicProjectId) {
    // Try to infer from other sources
    console.log(`   ⚠️  Using FIREBASE_PROJECT_ID: ${adminProjectId}`);
    console.log(`      Consider setting NEXT_PUBLIC_FIREBASE_PROJECT_ID for consistency`);
  }

  // Try to initialize Firebase Admin SDK directly (test implementation)
  console.log('\n4. Testing Firebase Admin initialization:');
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
            console.log('   ✓ Service account key file method successful');
          } else {
            console.log('   ✗ Service account key file not found');
          }
        } catch (error) {
          console.log(`   ✗ Service account key file error: ${error.message}`);
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
          console.log('   ✓ Environment variables method successful');
        } catch (error) {
          console.log(`   ✗ Environment variables method failed: ${error.message}`);
        }
      }
      
      // Method 3: Application Default Credentials (simulated)
      if (!initSuccess && projectId && process.env.NODE_ENV === 'production') {
        console.log('   ⚠️  Application Default Credentials would be attempted in Google Cloud');
        initMode = 'production';
        initDetails = 'Would use ADC in Google Cloud environment';
      }
      
      // Development fallback
      if (!initSuccess) {
        initMode = process.env.NODE_ENV === 'development' ? 'development' : 'disabled';
        initDetails = 'No valid credentials - would use development fallback';
        console.log('   ⚠️  No initialization method succeeded');
      }
      
    } else {
      initSuccess = true;
      initMode = 'production';
      initDetails = 'Already initialized (from previous test)';
      console.log('   ✓ Already initialized');
    }
    
    // Test Auth instance
    if (initSuccess) {
      try {
        const auth = getAuth();
        console.log('   ✓ Firebase Auth instance created successfully');
        console.log(`   ✓ Ready for production token verification`);
      } catch (error) {
        console.log(`   ✗ Failed to create Auth instance: ${error.message}`);
        hasErrors = true;
      }
    }
    
    console.log(`   Status: ${initSuccess ? '✓' : '✗'} ${initDetails}`);
    console.log(`   Mode: ${initMode}`);
    
    // Environment-specific warnings
    if (process.env.NODE_ENV === 'production' && !initSuccess) {
      console.log('   ⚠️  CRITICAL: This will cause authentication failures in production!');
      hasErrors = true;
    } else if (initMode === 'development') {
      console.log('   ⚠️  Development mode: Authentication will use less secure fallback');
    }
    
  } catch (error) {
    console.log('   ✗ Failed to test Firebase Admin SDK');
    console.log(`     Error: ${error.message}`);
    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(40));
  if (hasErrors) {
    console.log('❌ Configuration has errors. Please check the warnings above.');
    console.log('\nNext steps:');
    console.log('1. Ensure all required environment variables are set in .env.local');
    console.log('2. For production, add these variables to Vercel dashboard');
    console.log('3. See docs/firebase-admin-setup.md for detailed instructions');
    process.exit(1);
  } else {
    console.log('✅ Firebase Admin configuration looks good!');
    console.log('\nNext steps:');
    console.log('1. Run "vercel env pull" to sync with Vercel');
    console.log('2. Deploy to production with "vercel --prod"');
    process.exit(0);
  }
}

// Run the main function
main().catch(error => {
  console.error('\n❌ Script error:', error.message);
  process.exit(1);
});