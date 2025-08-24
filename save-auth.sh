#!/bin/bash

echo "🔐 Manual Authentication Setup for Brain Space"
echo "=============================================="
echo ""
echo "This script will help you save your Google authentication"
echo "for use in Playwright tests (including Mobile Safari)."
echo ""
echo "Steps:"
echo "1. Open Chrome and go to: http://localhost:3000/login"
echo "2. Click 'Continue with Google'"
echo "3. Sign in with kpessa@gmail.com"
echo "4. Once logged in, open Chrome DevTools (F12)"
echo "5. Go to Application > Cookies"
echo "6. Copy the authentication cookies"
echo ""
echo "Press Enter when you're logged in to continue..."
read

# Create a simple Playwright script to capture the current browser state
cat > /tmp/capture-auth.js << 'EOF'
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Opening browser to capture authentication...');
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('\n📌 INSTRUCTIONS:');
  console.log('1. Navigate to http://localhost:3000');
  console.log('2. Sign in with Google (kpessa@gmail.com)');
  console.log('3. Once logged in, press Enter here...\n');
  
  await page.goto('http://localhost:3000');
  
  // Wait for user to manually authenticate
  await page.pause();
  
  // Save the storage state
  const dir = path.join(process.cwd(), 'e2e', 'storage-states');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await context.storageState({ path: path.join(dir, 'realUser.json') });
  console.log('✅ Authentication saved!');
  
  await browser.close();
})();
EOF

echo ""
echo "Running authentication capture..."
node /tmp/capture-auth.js