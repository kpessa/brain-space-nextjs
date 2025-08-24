/**
 * Connect to an existing Edge browser with authentication
 * This allows you to use your current logged-in session
 */

import { chromium } from '@playwright/test'

export async function connectToExistingBrowser() {
  console.log('🌐 Connecting to existing Edge browser...')
  console.log('Make sure Edge is running with: --remote-debugging-port=9222')
  
  try {
    // Connect to the existing browser instance
    const browser = await chromium.connectOverCDP('http://localhost:9222')
    console.log('✅ Connected to existing browser')
    
    // Get the existing contexts (browser windows)
    const contexts = browser.contexts()
    console.log(`Found ${contexts.length} browser context(s)`)
    
    if (contexts.length === 0) {
      console.log('Creating new context from existing browser...')
      // If no contexts, we need to get the default context
      // This happens when connecting to a fresh browser
      const defaultContext = browser.contexts()[0] || await browser.newContext()
      return { browser, context: defaultContext }
    }
    
    // Use the first context (main browser window)
    const context = contexts[0]
    
    // Get all pages in the context
    const pages = context.pages()
    console.log(`Found ${pages.length} page(s) in context`)
    
    // Find or create a page
    let page = pages.find(p => !p.isClosed()) || await context.newPage()
    
    return { browser, context, page }
  } catch (error) {
    console.error('❌ Failed to connect to browser:', error)
    console.log('')
    console.log('To fix this, start Edge with remote debugging:')
    console.log('')
    console.log('Windows:')
    console.log('1. Close all Edge windows')
    console.log('2. Run: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222')
    console.log('')
    console.log('Mac:')
    console.log('1. Close all Edge windows')
    console.log('2. Run: /Applications/Microsoft\\ Edge.app/Contents/MacOS/Microsoft\\ Edge --remote-debugging-port=9222')
    console.log('')
    console.log('Linux:')
    console.log('1. Close all Edge windows')  
    console.log('2. Run: microsoft-edge --remote-debugging-port=9222')
    throw error
  }
}

// Helper to launch Edge with debugging if not already running
export async function launchEdgeWithDebugging() {
  const { exec } = require('child_process')
  const platform = process.platform
  
  let command: string
  
  if (platform === 'win32') {
    command = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222 --user-data-dir="C:\\temp\\edge-debug"'
  } else if (platform === 'darwin') {
    command = '/Applications/Microsoft\\ Edge.app/Contents/MacOS/Microsoft\\ Edge --remote-debugging-port=9222 --user-data-dir=/tmp/edge-debug'
  } else {
    command = 'microsoft-edge --remote-debugging-port=9222 --user-data-dir=/tmp/edge-debug'
  }
  
  return new Promise((resolve, reject) => {
    console.log('🚀 Launching Edge with debugging port...')
    exec(command, (error: any) => {
      if (error && !error.message.includes('already running')) {
        reject(error)
      } else {
        // Wait a bit for browser to start
        setTimeout(resolve, 3000)
      }
    })
  })
}