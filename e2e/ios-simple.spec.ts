import { test, expect, devices } from '@playwright/test'

test.describe('Simple iOS Test', () => {
  test('iPhone 13 device emulation works', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
    })
    const page = await context.newPage()
    
    await page.goto('/')
    
    // Just verify we can access the page
    const title = await page.title()
    expect(title).toBeTruthy()
    
    // Check viewport is mobile-sized
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeLessThan(500)
    expect(viewport?.height).toBeGreaterThan(500)
    
    await context.close()
  })
  
  test('iPad Pro device emulation works', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro 11'],
    })
    const page = await context.newPage()
    
    await page.goto('/')
    
    // Just verify we can access the page
    const title = await page.title()
    expect(title).toBeTruthy()
    
    // Check viewport is tablet-sized
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeGreaterThan(700)
    expect(viewport?.height).toBeGreaterThan(1000)
    
    await context.close()
  })
})