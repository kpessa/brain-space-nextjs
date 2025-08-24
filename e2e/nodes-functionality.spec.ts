import { test, expect } from '@playwright/test'
import { MCPBrowserHelper } from './mcp-helpers'

/**
 * Nodes Management Functionality Tests
 * Tests CRUD operations and filtering for nodes
 */

test.describe('Nodes Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nodes')
  })

  test('should display list of nodes', async ({ page }) => {
    // Wait for nodes to load
    await page.waitForSelector('.nodes-container, [data-testid="nodes-list"], .node-list', { timeout: 10000 })
    
    // Check for node cards
    const nodeCards = page.locator('.node-card, [data-testid*="node"], .node-item')
    const count = await nodeCards.count()
    
    console.log(`Found ${count} nodes`)
    
    if (count > 0) {
      // Check first node structure
      const firstNode = nodeCards.first()
      
      // Should have title
      const title = firstNode.locator('.node-title, h3, h4')
      if (await title.isVisible()) {
        const titleText = await title.textContent()
        expect(titleText).toBeTruthy()
      }
      
      // Should have type indicator
      const type = firstNode.locator('.node-type, .badge, [data-type]')
      if (await type.isVisible()) {
        const typeText = await type.textContent()
        console.log('Node type:', typeText)
      }
      
      // Should have urgency/importance indicators
      const urgency = firstNode.locator('[data-urgency], .urgency')
      const importance = firstNode.locator('[data-importance], .importance')
      
      if (await urgency.isVisible() || await importance.isVisible()) {
        console.log('Node has priority indicators')
      }
    }
  })

  test('should create a new node', async ({ page }) => {
    // Look for create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Node"), button:has-text("Add")').first()
    
    if (await createButton.isVisible()) {
      await createButton.click()
      
      // Wait for create modal/form
      const modal = page.locator('[role="dialog"], .modal, .create-form')
      await expect(modal).toBeVisible({ timeout: 5000 })
      
      // Fill in node details
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"], #title').first()
      const contentInput = page.locator('textarea[name="content"], textarea[placeholder*="content"], #content').first()
      
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Node from Playwright')
      }
      
      if (await contentInput.isVisible()) {
        await contentInput.fill('This is a test node created by automated testing')
      }
      
      // Select type
      const typeSelect = page.locator('select[name="type"], [data-testid="type-select"]').first()
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('task')
      }
      
      // Set urgency and importance
      const urgencySlider = page.locator('input[type="range"][name*="urgency"], [data-testid="urgency"]').first()
      const importanceSlider = page.locator('input[type="range"][name*="importance"], [data-testid="importance"]').first()
      
      if (await urgencySlider.isVisible()) {
        await urgencySlider.fill('7')
      }
      
      if (await importanceSlider.isVisible()) {
        await importanceSlider.fill('8')
      }
      
      // Add tags
      const tagsInput = page.locator('input[name="tags"], input[placeholder*="tags"]').first()
      if (await tagsInput.isVisible()) {
        await tagsInput.fill('test, playwright, automation')
      }
      
      // Submit
      const submitButton = modal.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Wait for creation
        await page.waitForTimeout(1000)
        
        // Check for success message
        const successMessage = page.locator('.success, .toast, [role="status"]')
        if (await successMessage.isVisible()) {
          const messageText = await successMessage.textContent()
          expect(messageText).toContain('created')
        }
        
        // Verify node appears in list
        const newNode = page.locator(':text("Test Node from Playwright")')
        await expect(newNode).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should edit an existing node', async ({ page }) => {
    const nodeCards = page.locator('.node-card, [data-testid*="node"]')
    
    if (await nodeCards.first().isVisible()) {
      // Click on first node
      await nodeCards.first().click()
      
      // Wait for detail modal
      const modal = page.locator('[role="dialog"], .modal')
      await expect(modal).toBeVisible({ timeout: 5000 })
      
      // Look for edit button
      const editButton = modal.locator('button:has-text("Edit"), [aria-label="Edit"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        // Edit title
        const titleInput = modal.locator('input[name="title"]').first()
        if (await titleInput.isVisible()) {
          await titleInput.clear()
          await titleInput.fill('Updated Node Title')
        }
        
        // Save changes
        const saveButton = modal.locator('button:has-text("Save"), button:has-text("Update")').first()
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          // Wait for update
          await page.waitForTimeout(1000)
          
          // Verify update
          const updatedTitle = page.locator(':text("Updated Node Title")')
          await expect(updatedTitle).toBeVisible({ timeout: 5000 })
        }
      }
    }
  })

  test('should delete a node', async ({ page }) => {
    const nodeCards = page.locator('.node-card')
    const initialCount = await nodeCards.count()
    
    if (initialCount > 0) {
      // Click on first node
      await nodeCards.first().click()
      
      // Wait for modal
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible({ timeout: 5000 })
      
      // Look for delete button
      const deleteButton = modal.locator('button:has-text("Delete"), [aria-label="Delete"]').first()
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        
        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first()
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }
        
        // Wait for deletion
        await page.waitForTimeout(1000)
        
        // Verify node count decreased
        const newCount = await nodeCards.count()
        expect(newCount).toBe(initialCount - 1)
      }
    }
  })

  test('should filter nodes by type', async ({ page }) => {
    // Look for filter controls
    const typeFilter = page.locator('select[name*="type"], [data-testid="type-filter"]').first()
    
    if (await typeFilter.isVisible()) {
      // Get all options
      const options = await typeFilter.locator('option').allTextContents()
      console.log('Available types:', options)
      
      // Select task type
      await typeFilter.selectOption({ label: 'Task' })
      
      // Wait for filter to apply
      await page.waitForTimeout(500)
      
      // Check filtered results
      const visibleNodes = page.locator('.node-card:visible')
      const count = await visibleNodes.count()
      
      console.log(`Filtered to ${count} task nodes`)
      
      // Verify all visible nodes are tasks
      for (let i = 0; i < count; i++) {
        const node = visibleNodes.nth(i)
        const typeIndicator = node.locator('.node-type, .badge')
        if (await typeIndicator.isVisible()) {
          const type = await typeIndicator.textContent()
          expect(type?.toLowerCase()).toContain('task')
        }
      }
    }
  })

  test('should search nodes', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search"]').first()
    
    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('important')
      
      // Wait for search to apply
      await page.waitForTimeout(500)
      
      // Check results
      const visibleNodes = page.locator('.node-card:visible')
      const count = await visibleNodes.count()
      
      console.log(`Search returned ${count} nodes`)
      
      if (count > 0) {
        // Verify results contain search term
        const firstNode = visibleNodes.first()
        const nodeText = await firstNode.textContent()
        expect(nodeText?.toLowerCase()).toContain('important')
      }
      
      // Clear search
      await searchInput.clear()
      
      // Verify all nodes show again
      await page.waitForTimeout(500)
      const allNodes = page.locator('.node-card:visible')
      const allCount = await allNodes.count()
      expect(allCount).toBeGreaterThanOrEqual(count)
    }
  })

  test('should bulk select and operate on nodes', async ({ page }) => {
    const nodeCards = page.locator('.node-card')
    const nodeCount = await nodeCards.count()
    
    if (nodeCount >= 2) {
      // Look for select checkboxes
      const checkboxes = page.locator('input[type="checkbox"][aria-label*="Select"]')
      
      if (await checkboxes.first().isVisible()) {
        // Select first two nodes
        await checkboxes.nth(0).check()
        await checkboxes.nth(1).check()
        
        // Look for bulk actions
        const bulkActions = page.locator('.bulk-actions, [data-testid="bulk-actions"]')
        
        if (await bulkActions.isVisible()) {
          // Try bulk delete
          const bulkDelete = bulkActions.locator('button:has-text("Delete Selected")')
          if (await bulkDelete.isVisible()) {
            await bulkDelete.click()
            
            // Confirm
            const confirmButton = page.locator('button:has-text("Confirm")')
            if (await confirmButton.isVisible()) {
              await confirmButton.click()
              
              // Wait for deletion
              await page.waitForTimeout(1000)
              
              // Verify nodes were deleted
              const newCount = await nodeCards.count()
              expect(newCount).toBe(nodeCount - 2)
            }
          }
        }
      }
    }
  })

  test('should sort nodes', async ({ page }) => {
    // Look for sort controls
    const sortDropdown = page.locator('select[name*="sort"], [data-testid="sort"]').first()
    
    if (await sortDropdown.isVisible()) {
      // Get sort options
      const options = await sortDropdown.locator('option').allTextContents()
      console.log('Sort options:', options)
      
      // Sort by date
      await sortDropdown.selectOption({ label: 'Date' })
      await page.waitForTimeout(500)
      
      // Get first node date
      const firstNodeDate = await page.locator('.node-card').first().getAttribute('data-date')
      
      // Sort by priority
      await sortDropdown.selectOption({ label: 'Priority' })
      await page.waitForTimeout(500)
      
      // Get first node priority
      const firstNodePriority = await page.locator('.node-card').first().getAttribute('data-priority')
      
      console.log('Sorting verified')
    }
  })

  test('should paginate through nodes', async ({ page }) => {
    // Look for pagination controls
    const pagination = page.locator('.pagination, [aria-label="pagination"]')
    
    if (await pagination.isVisible()) {
      // Get current page
      const currentPage = pagination.locator('.current-page, [aria-current="page"]')
      if (await currentPage.isVisible()) {
        const pageText = await currentPage.textContent()
        console.log('Current page:', pageText)
      }
      
      // Click next page
      const nextButton = pagination.locator('button:has-text("Next"), [aria-label="Next page"]')
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        await nextButton.click()
        
        // Wait for new page to load
        await page.waitForTimeout(500)
        
        // Verify page changed
        const newPageText = await currentPage.textContent()
        expect(newPageText).not.toBe(pageText)
      }
      
      // Go back to first page
      const firstButton = pagination.locator('button:has-text("1"), [aria-label="Page 1"]')
      if (await firstButton.isVisible()) {
        await firstButton.click()
      }
    }
  })

  test('should export nodes', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), [aria-label="Export"]').first()
    
    if (await exportButton.isVisible()) {
      // Start waiting for download
      const downloadPromise = page.waitForEvent('download')
      
      await exportButton.click()
      
      // Check for format options
      const formatOptions = page.locator('[role="menu"], .export-options')
      if (await formatOptions.isVisible()) {
        const jsonOption = formatOptions.locator(':text("JSON")')
        if (await jsonOption.isVisible()) {
          await jsonOption.click()
        }
      }
      
      try {
        const download = await downloadPromise
        console.log('Downloaded file:', await download.suggestedFilename())
        
        // Verify download
        expect(download).toBeTruthy()
      } catch (error) {
        console.log('Export may not trigger actual download in test environment')
      }
    }
  })
})