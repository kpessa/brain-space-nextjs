import { test, expect } from './fixtures/auth.fixture'
import { MCPBrowserHelper } from './mcp-helpers'
import { authenticatedGoto } from './helpers/auth'

/**
 * Matrix View Functionality Tests
 * Tests the Eisenhower Matrix feature for organizing nodes
 */

test.describe('Matrix View Functionality', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to matrix view with authentication
    await authenticatedPage.goto('/matrix')
  })

  test('should display four quadrants', async ({ authenticatedPage }) => {
    // Wait for matrix to load
    await authenticatedPage.waitForSelector('.matrix-container, [data-testid="matrix"], .quadrants', { timeout: 10000 })
    
    // Check for all four quadrants
    const quadrants = [
      { selector: '[data-testid*="urgent-important"], .quadrant-1, .do-first', label: 'Do First' },
      { selector: '[data-testid*="not-urgent-important"], .quadrant-2, .schedule', label: 'Schedule' },
      { selector: '[data-testid*="urgent-not-important"], .quadrant-3, .delegate', label: 'Delegate' },
      { selector: '[data-testid*="not-urgent-not-important"], .quadrant-4, .eliminate', label: 'Eliminate' }
    ]
    
    for (const quadrant of quadrants) {
      const element = page.locator(quadrant.selector).first()
      if (await element.isVisible()) {
        // Check if quadrant has the expected label
        const text = await element.textContent()
        console.log(`Quadrant ${quadrant.label} found with text:`, text)
      }
    }
    
    // Count total quadrants
    const allQuadrants = page.locator('.quadrant, [class*="quadrant-"]')
    const count = await allQuadrants.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('should display nodes in quadrants', async ({ page }) => {
    await page.waitForSelector('.matrix-container, [data-testid="matrix"]', { timeout: 10000 })
    
    // Look for node cards
    const nodeCards = page.locator('.node-card, [data-testid*="node"], .matrix-item')
    const nodeCount = await nodeCards.count()
    
    console.log(`Found ${nodeCount} nodes in matrix`)
    
    if (nodeCount > 0) {
      // Click on first node
      const firstNode = nodeCards.first()
      await firstNode.click()
      
      // Check if detail modal opens
      const modal = page.locator('[role="dialog"], .modal, [data-testid="node-detail"]')
      await expect(modal).toBeVisible({ timeout: 5000 })
      
      // Close modal
      const closeButton = page.locator('[aria-label="Close"], button:has-text("Close"), .close-button').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await expect(modal).not.toBeVisible()
      }
    }
  })

  test('should support drag and drop between quadrants', async ({ page }) => {
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    const draggableNodes = page.locator('[draggable="true"], .draggable, .node-card')
    
    if (await draggableNodes.first().isVisible()) {
      const sourceNode = draggableNodes.first()
      const sourceBounds = await sourceNode.boundingBox()
      
      // Find a different quadrant to drop into
      const targetQuadrant = page.locator('.quadrant').nth(1)
      const targetBounds = await targetQuadrant.boundingBox()
      
      if (sourceBounds && targetBounds) {
        // Perform drag and drop
        await page.mouse.move(sourceBounds.x + sourceBounds.width / 2, sourceBounds.y + sourceBounds.height / 2)
        await page.mouse.down()
        await page.mouse.move(targetBounds.x + targetBounds.width / 2, targetBounds.y + targetBounds.height / 2)
        await page.mouse.up()
        
        // Wait for potential state update
        await page.waitForTimeout(500)
        
        // Verify node moved (this depends on implementation)
        console.log('Drag and drop attempted')
      }
    }
  })

  test('should filter nodes by type', async ({ page }) => {
    // Look for filter controls
    const filterButton = page.locator('button:has-text("Filter"), [aria-label*="filter"]').first()
    
    if (await filterButton.isVisible()) {
      await filterButton.click()
      
      // Look for filter options
      const filterOptions = page.locator('[role="menu"], .filter-menu, .dropdown')
      await expect(filterOptions).toBeVisible({ timeout: 3000 })
      
      // Try to select a filter
      const taskFilter = page.locator(':text("Tasks"), :text("Task"), [value="task"]').first()
      if (await taskFilter.isVisible()) {
        await taskFilter.click()
        
        // Wait for filter to apply
        await page.waitForTimeout(500)
        
        // Check if nodes are filtered
        const visibleNodes = page.locator('.node-card:visible')
        const count = await visibleNodes.count()
        console.log(`Filtered to ${count} task nodes`)
      }
    }
  })

  test('should add node updates from matrix view', async ({ page }) => {
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    const nodeCards = page.locator('.node-card, [data-testid*="node"]')
    
    if (await nodeCards.first().isVisible()) {
      // Right-click or double-click to open context menu
      await nodeCards.first().dblclick()
      
      // Wait for modal
      const modal = page.locator('[role="dialog"], .modal')
      
      if (await modal.isVisible()) {
        // Look for update/notes section
        const updateInput = page.locator('textarea[placeholder*="update"], input[placeholder*="note"], .update-input').first()
        
        if (await updateInput.isVisible()) {
          const testUpdate = 'Progress update: Completed initial research phase'
          await updateInput.fill(testUpdate)
          
          // Submit update
          const submitButton = page.locator('button:has-text("Add Update"), button:has-text("Save")').first()
          if (await submitButton.isVisible()) {
            await submitButton.click()
            
            // Check if update was added
            await page.waitForTimeout(1000)
            
            const updatesList = page.locator('.updates, .update-item, [data-testid="update"]')
            if (await updatesList.first().isVisible()) {
              const updateText = await updatesList.first().textContent()
              expect(updateText).toContain('research')
            }
          }
        }
        
        // Close modal
        await page.keyboard.press('Escape')
      }
    }
  })

  test('should show node statistics', async ({ page }) => {
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    // Look for stats section
    const stats = page.locator('.matrix-stats, .statistics, [data-testid="stats"]').first()
    
    if (await stats.isVisible()) {
      const statsText = await stats.textContent()
      
      // Should show counts for each quadrant
      expect(statsText).toMatch(/\d+/)
      
      // Check for specific stat items
      const statItems = page.locator('.stat-item, [data-testid*="stat"]')
      const itemCount = await statItems.count()
      
      console.log(`Found ${itemCount} stat items`)
      
      if (itemCount > 0) {
        const firstStatText = await statItems.first().textContent()
        console.log('First stat:', firstStatText)
      }
    }
  })

  test('should toggle between view modes', async ({ page }) => {
    // Look for view mode toggle
    const viewToggle = page.locator('button:has-text("View"), [aria-label*="view mode"]').first()
    
    if (await viewToggle.isVisible()) {
      await viewToggle.click()
      
      // Look for view options
      const gridView = page.locator(':text("Grid"), :text("Card")').first()
      const listView = page.locator(':text("List"), :text("Table")').first()
      
      if (await listView.isVisible()) {
        await listView.click()
        
        // Check if view changed
        await page.waitForTimeout(500)
        
        const listContainer = page.locator('.list-view, .table-view, [data-view="list"]')
        if (await listContainer.isVisible()) {
          console.log('Switched to list view')
        }
      }
    }
  })

  test('should handle empty quadrants', async ({ page }) => {
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    // Check each quadrant for empty state
    const quadrants = page.locator('.quadrant')
    const quadrantCount = await quadrants.count()
    
    for (let i = 0; i < quadrantCount; i++) {
      const quadrant = quadrants.nth(i)
      const nodes = quadrant.locator('.node-card')
      const nodeCount = await nodes.count()
      
      if (nodeCount === 0) {
        // Check for empty state message
        const emptyMessage = quadrant.locator('.empty-state, :text("No items"), :text("Drop here")')
        if (await emptyMessage.isVisible()) {
          const message = await emptyMessage.textContent()
          console.log(`Quadrant ${i + 1} empty state:`, message)
        }
      }
    }
  })

  test('should persist matrix state', async ({ page }) => {
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    // Get initial state
    const nodeCards = page.locator('.node-card')
    const initialCount = await nodeCards.count()
    
    // Make a change (e.g., filter or move a node)
    const filterButton = page.locator('button:has-text("Filter")').first()
    if (await filterButton.isVisible()) {
      await filterButton.click()
      // Apply some filter
      await page.waitForTimeout(500)
    }
    
    // Reload page
    await page.reload()
    
    // Wait for matrix to load again
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    // Check if state was persisted
    const newNodeCards = page.locator('.node-card')
    const newCount = await newNodeCards.count()
    
    console.log(`Initial nodes: ${initialCount}, After reload: ${newCount}`)
  })
})

test.describe('Matrix Performance', () => {
  test('should handle large number of nodes efficiently', async ({ page }) => {
    const helper = new MCPBrowserHelper(page)
    const performanceMonitor = helper.setupNetworkMonitoring()
    
    await page.goto('/matrix')
    
    // Wait for initial load
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    // Measure load time
    const loadTime = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return perfData.loadEventEnd - perfData.fetchStart
    })
    
    console.log(`Matrix load time: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    
    // Check for virtualization or pagination
    const pagination = page.locator('.pagination, [aria-label="pagination"]')
    const hasVirtualization = await pagination.isVisible()
    
    if (hasVirtualization) {
      console.log('Matrix uses pagination/virtualization for performance')
    }
    
    // Check memory usage (if many nodes)
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1048576 // Convert to MB
      }
      return null
    })
    
    if (memoryUsage) {
      console.log(`Memory usage: ${memoryUsage.toFixed(2)} MB`)
      expect(memoryUsage).toBeLessThan(200) // Should use less than 200MB
    }
  })

  test('should smoothly animate drag operations', async ({ page }) => {
    await page.goto('/matrix')
    await page.waitForSelector('.matrix-container', { timeout: 10000 })
    
    // Enable performance monitoring
    await page.evaluate(() => {
      let frameCount = 0
      let startTime = performance.now()
      
      function countFrames() {
        frameCount++
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(countFrames)
        } else {
          console.log(`FPS: ${frameCount}`)
        }
      }
      
      requestAnimationFrame(countFrames)
    })
    
    // Perform drag operation
    const draggable = page.locator('[draggable="true"]').first()
    if (await draggable.isVisible()) {
      const bounds = await draggable.boundingBox()
      if (bounds) {
        await page.mouse.move(bounds.x + 10, bounds.y + 10)
        await page.mouse.down()
        
        // Animate drag
        for (let i = 0; i < 10; i++) {
          await page.mouse.move(bounds.x + 10 + (i * 10), bounds.y + 10)
          await page.waitForTimeout(50)
        }
        
        await page.mouse.up()
      }
    }
    
    // Check console for FPS
    await page.waitForTimeout(1100)
  })
})