#!/usr/bin/env node

/**
 * Script to fix common test issues
 */

const fs = require('fs')
const path = require('path')

// Fix 1: Add window.location.reload mock to jest.setup.js
const jestSetupPath = path.join(process.cwd(), 'jest.setup.js')
const jestSetup = fs.readFileSync(jestSetupPath, 'utf8')

if (!jestSetup.includes('window.location.reload')) {
  const locationMock = `
// Mock window.location.reload
delete window.location
window.location = {
  ...window.location,
  reload: jest.fn(),
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
}
`
  fs.writeFileSync(jestSetupPath, jestSetup + locationMock)
  console.log('✅ Added window.location.reload mock')
}

// Fix 2: Update package.json test script to exclude E2E and set memory limit
const packageJsonPath = path.join(process.cwd(), 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

packageJson.scripts['test:unit'] = 'NODE_OPTIONS="--max-old-space-size=4096" jest --testPathIgnorePatterns=e2e'
packageJson.scripts['test:e2e'] = 'playwright test'
packageJson.scripts['test'] = 'npm run test:unit'

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
console.log('✅ Updated test scripts in package.json')

console.log('\n📝 Test commands:')
console.log('  pnpm test        - Run unit tests only')
console.log('  pnpm test:unit   - Run unit tests with memory limit')
console.log('  pnpm test:e2e    - Run E2E tests with Playwright')