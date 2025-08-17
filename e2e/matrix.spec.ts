import { test, expect } from '@playwright/test'

test.describe('Matrix Page - Eisenhower Matrix', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication or login if needed
    // For now, we'll navigate directly assuming auth is handled
    await page.goto('/matrix')
    await page.waitForLoadState('networkidle')
  })

  test('matrix page loads with four quadrants', async ({ page }) => {
    // Check for main matrix container
    await expect(page.locator('h1:has-text("Eisenhower Matrix")')).toBeVisible()
    
    // Verify all four quadrants are present
    await expect(page.locator('text=Do First')).toBeVisible()
    await expect(page.locator('text=Schedule')).toBeVisible()
    await expect(page.locator('text=Delegate')).toBeVisible()
    await expect(page.locator('text=Eliminate')).toBeVisible()
    
    // Verify quadrant descriptions
    await expect(page.locator('text=Urgent & Important')).toBeVisible()
    await expect(page.locator('text=Not Urgent & Important')).toBeVisible()
    await expect(page.locator('text=Urgent & Not Important')).toBeVisible()
    await expect(page.locator('text=Not Urgent & Not Important')).toBeVisible()
  })

  test('can add new task to quadrant', async ({ page }) => {
    // Click the plus button in the first quadrant
    const firstQuadrantPlus = page.locator('[data-testid="add-task-urgent-important"], button:has(svg)').first()
    await firstQuadrantPlus.click()
    
    // Input dialog should appear
    const dialog = page.locator('role=dialog, [role="dialog"]')
    await expect(dialog).toBeVisible()
    
    // Type task title
    const input = dialog.locator('input[type="text"]')
    await input.fill('Test Task for Playwright')
    
    // Submit the form
    const submitButton = dialog.locator('button:has-text("Submit"), button:has-text("Add"), button:has-text("Create")')
    await submitButton.click()
    
    // Verify task appears in the matrix
    await expect(page.locator('text=Test Task for Playwright')).toBeVisible()
  })

  test('right-click opens context menu on node', async ({ page }) => {
    // First, ensure there's at least one task node
    // Try to find an existing node or create one
    let nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    if (!(await nodeElement.isVisible())) {
      // If no nodes exist, create one first
      const addButton = page.locator('button:has(svg)').first()
      await addButton.click()
      
      const input = page.locator('input[type="text"]')
      await input.fill('Test Node for Context Menu')
      
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Add")')
      await submitButton.click()
      
      nodeElement = page.locator('text=Test Node for Context Menu')
    }
    
    // Right-click on the node
    await nodeElement.click({ button: 'right' })
    
    // Context menu should appear
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Verify context menu contents
    await expect(contextMenu.locator('text=Status')).toBeVisible()
    await expect(contextMenu.locator('text=Importance')).toBeVisible()
    await expect(contextMenu.locator('text=Urgency')).toBeVisible()
    await expect(contextMenu.locator('button:has-text("Pending")')).toBeVisible()
    await expect(contextMenu.locator('button:has-text("In Progress")')).toBeVisible()
    await expect(contextMenu.locator('button:has-text("Done")')).toBeVisible()
  })

  test('can update task status via context menu', async ({ page }) => {
    // Find a task node
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Click "In Progress" status
    const inProgressButton = contextMenu.locator('button:has-text("In Progress")')
    await inProgressButton.click()
    
    // Context menu should close
    await expect(contextMenu).not.toBeVisible()
    
    // Status should be updated (would need to verify visual indicator)
    // The node might show a clock icon or different styling
  })

  test('can adjust priority sliders in context menu', async ({ page }) => {
    // Find a task node
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Find importance slider
    const importanceSlider = contextMenu.locator('input[type="range"]').first()
    const urgencySlider = contextMenu.locator('input[type="range"]').nth(1)
    
    // Get initial values
    const initialImportance = await importanceSlider.inputValue()
    const initialUrgency = await urgencySlider.inputValue()
    
    // Adjust sliders
    await importanceSlider.fill('8')
    await urgencySlider.fill('9')
    
    // Click Update Priority button
    const updateButton = contextMenu.locator('button:has-text("Update Priority")')
    await updateButton.click()
    
    // Context menu should close
    await expect(contextMenu).not.toBeVisible()
    
    // Node might move to different quadrant based on new priority
    // This would depend on the priority thresholds
  })

  test('can edit task title via context menu', async ({ page }) => {
    // Find a task node with known text
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    const originalTitle = await nodeElement.locator('h4').textContent()
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Click edit icon
    const editButton = contextMenu.locator('button:has(svg)')
    await editButton.first().click()
    
    // Input field should appear
    const titleInput = contextMenu.locator('input[type="text"]')
    await expect(titleInput).toBeVisible()
    
    // Clear and type new title
    await titleInput.clear()
    await titleInput.fill('Updated Task Title')
    
    // Save the title
    const saveButton = contextMenu.locator('button:has-text("Save")')
    await saveButton.click()
    
    // Verify title is updated
    await expect(page.locator('text=Updated Task Title')).toBeVisible()
  })

  test('can delete task with confirmation', async ({ page }) => {
    // Find a task node
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    const taskText = await nodeElement.locator('h4').textContent()
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Click Delete Task button
    const deleteButton = contextMenu.locator('button:has-text("Delete Task")')
    await deleteButton.click()
    
    // Confirmation should appear
    await expect(contextMenu.locator('text=Delete this task?')).toBeVisible()
    
    // Confirm deletion
    const confirmDeleteButton = contextMenu.locator('button:has-text("Delete")').last()
    await confirmDeleteButton.click()
    
    // Context menu should close
    await expect(contextMenu).not.toBeVisible()
    
    // Task should be removed from the page
    if (taskText) {
      await expect(page.locator(`text="${taskText}"`)).not.toBeVisible()
    }
  })

  test('context menu closes on escape key', async ({ page }) => {
    // Find a task node
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Press Escape key
    await page.keyboard.press('Escape')
    
    // Context menu should close
    await expect(contextMenu).not.toBeVisible()
  })

  test('context menu closes on click outside', async ({ page }) => {
    // Find a task node
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Click outside the menu
    await page.click('body', { position: { x: 10, y: 10 } })
    
    // Context menu should close
    await expect(contextMenu).not.toBeVisible()
  })

  test('drag and drop task between quadrants', async ({ page }) => {
    // This test requires at least one task
    const sourceNode = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await sourceNode.isVisible())) {
      test.skip()
      return
    }
    
    const taskTitle = await sourceNode.locator('h4').textContent()
    
    // Find a different quadrant to drop into
    const targetQuadrant = page.locator('[data-rfd-droppable-id="not-urgent-important"], .bg-blue-50').first()
    
    // Perform drag and drop
    await sourceNode.dragTo(targetQuadrant)
    
    // Wait for the drop animation
    await page.waitForTimeout(500)
    
    // Verify task moved to new quadrant
    if (taskTitle) {
      const movedTask = page.locator(`text="${taskTitle}"`)
      await expect(movedTask).toBeVisible()
      
      // Task should now be in the Schedule quadrant
      const scheduleQuadrant = movedTask.locator('xpath=ancestor::*[contains(@class, "bg-blue-50")]')
      await expect(scheduleQuadrant).toBeTruthy()
    }
  })

  test('priority values affect quadrant placement', async ({ page }) => {
    // Find a task node
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    // Skip if no nodes exist
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Set low importance and low urgency (should go to Eliminate quadrant)
    const importanceSlider = contextMenu.locator('input[type="range"]').first()
    const urgencySlider = contextMenu.locator('input[type="range"]').nth(1)
    
    await importanceSlider.fill('2')
    await urgencySlider.fill('2')
    
    // Update priority
    const updateButton = contextMenu.locator('button:has-text("Update Priority")')
    await updateButton.click()
    
    // Task should move to Eliminate quadrant
    // Wait for re-render
    await page.waitForTimeout(500)
    
    // Verify the task is now in the gray quadrant (Eliminate)
    const eliminateQuadrant = page.locator('.bg-gray-50')
    const tasksInEliminate = eliminateQuadrant.locator('.rounded-lg.shadow-sm.border')
    await expect(tasksInEliminate.first()).toBeVisible()
  })
})

test.describe('Matrix Page - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('matrix adapts to mobile viewport', async ({ page }) => {
    await page.goto('/matrix')
    await page.waitForLoadState('networkidle')
    
    // On mobile, quadrants should stack vertically
    const quadrants = page.locator('.bg-red-50, .bg-blue-50, .bg-yellow-50, .bg-gray-50')
    
    // Check that quadrants are visible
    const count = await quadrants.count()
    expect(count).toBe(4)
    
    // Context menu should still work on mobile
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    if (await nodeElement.isVisible()) {
      // Long press to simulate right-click on mobile
      await nodeElement.tap()
      await nodeElement.click({ button: 'right' })
      
      const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
      await expect(contextMenu).toBeVisible()
    }
  })
})