const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function setupAuth() {
  console.log('🔐 Setting up real user authentication for kpessa@gmail.com');
  console.log('================================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome' // Use Chrome instead of Chromium for better Google auth
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('📱 Opening login page...');
  await page.goto('http://localhost:3000/login');
  
  console.log('\n⚠️  MANUAL STEPS REQUIRED:');
  console.log('1. Click "Continue with Google" button');
  console.log('2. Sign in with kpessa@gmail.com');
  console.log('3. Complete the authentication');
  console.log('4. Wait until you are redirected to the app');
  console.log('\n🔄 Waiting for authentication...\n');
  
  // Wait for successful authentication (redirect away from login)
  await page.waitForFunction(
    () => !window.location.pathname.includes('login'),
    { timeout: 120000 } // 2 minutes timeout
  );
  
  console.log('✅ Authentication successful!');
  
  // Save the authentication state
  const storageDir = path.join(__dirname, 'storage-states');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  const authFile = path.join(storageDir, 'realUser.json');
  await context.storageState({ path: authFile });
  
  console.log(`💾 Authentication state saved to: ${authFile}`);
  console.log('\n✨ Setup complete! You can now run tests with real authentication.');
  console.log('\nTo use in tests:');
  console.log('  PLAYWRIGHT_AUTH_MODE=real pnpm exec playwright test');
  console.log('\nOr for Mobile Safari:');
  console.log('  PLAYWRIGHT_AUTH_MODE=real pnpm exec playwright test --project="Mobile Safari"');
  
  await browser.close();
}

setupAuth().catch(error => {
  console.error('❌ Authentication setup failed:', error);
  process.exit(1);
});