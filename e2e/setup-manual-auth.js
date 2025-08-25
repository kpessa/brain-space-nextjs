const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function setupAuth() {

  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome' // Use Chrome instead of Chromium for better Google auth
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');

  // Wait for successful authentication (redirect away from login)
  await page.waitForFunction(
    () => !window.location.pathname.includes('login'),
    { timeout: 120000 } // 2 minutes timeout
  );

  // Save the authentication state
  const storageDir = path.join(__dirname, 'storage-states');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  const authFile = path.join(storageDir, 'realUser.json');
  await context.storageState({ path: authFile });

  await browser.close();
}

setupAuth().catch(error => {

  process.exit(1);
});