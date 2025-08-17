import { test, expect } from '@playwright/test'

test.describe('Matrix - Completed Tasks Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/matrix')
    await page.waitForLoadState('networkidle')
  })

  test('completed tasks should disappear from matrix view', async ({ page }) => {
    // Skip if no tasks exist
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    if (!(await nodeElement.isVisible())) {
      // Create a test task first
      const addButton = page.locator('button:has(svg)').first()
      await addButton.click()
      
      const input = page.locator('input[type="text"]')
      await input.fill('Task to Complete')
      
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Add")')
      await submitButton.click()
      
      // Wait for the task to appear
      await expect(page.locator('text=Task to Complete')).toBeVisible()
    }
    
    // Get the task text before completing
    const taskNode = page.locator('.rounded-lg.shadow-sm.border').first()
    const taskTitle = await taskNode.locator('h4').textContent()
    
    // Right-click to open context menu
    await taskNode.click({ button: 'right' })
    
    // Wait for context menu
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // Click "Done" button to mark as completed
    const doneButton = contextMenu.locator('button:has-text("Done")')
    await doneButton.click()
    
    // Context menu should close
    await expect(contextMenu).not.toBeVisible()
    
    // Wait a moment for state update
    await page.waitForTimeout(500)
    
    // The task should no longer be visible in the matrix
    if (taskTitle) {
      await expect(page.locator(`h4:has-text("${taskTitle}")`)).not.toBeVisible()
    }
    
    // Verify the task is gone from all quadrants
    const allTasks = page.locator('.rounded-lg.shadow-sm.border h4')
    const taskTexts = await allTasks.allTextContents()
    
    // The completed task should not be in the list
    expect(taskTexts).not.toContain(taskTitle)
  })

  test('marking task as pending should keep it visible', async ({ page }) => {
    // Skip if no tasks exist
    const nodeElement = page.locator('.rounded-lg.shadow-sm.border').first()
    
    if (!(await nodeElement.isVisible())) {
      test.skip()
      return
    }
    
    const taskTitle = await nodeElement.locator('h4').textContent()
    
    // Right-click to open context menu
    await nodeElement.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    // First mark as completed
    const doneButton = contextMenu.locator('button:has-text("Done")')
    await doneButton.click()
    
    // Task should disappear
    await page.waitForTimeout(500)
    if (taskTitle) {
      await expect(page.locator(`h4:has-text("${taskTitle}")`)).not.toBeVisible()
    }
    
    // Now we need to verify it can be brought back
    // This would require a separate "completed tasks" view or admin interface
    // For now, we'll create a new task and verify the pending status works
    
    const addButton = page.locator('button:has(svg)').first()
    await addButton.click()
    
    const input = page.locator('input[type="text"]')
    await input.fill('New Pending Task')
    
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Add")')
    await submitButton.click()
    
    // Verify the new task appears
    await expect(page.locator('text=New Pending Task')).toBeVisible()
    
    // Right-click the new task
    const newTask = page.locator('h4:has-text("New Pending Task")').locator('..')
    await newTask.click({ button: 'right' })
    
    await expect(contextMenu).toBeVisible()
    
    // Click Pending (it should already be pending, but this tests the button)
    const pendingButton = contextMenu.locator('button:has-text("Pending")')
    await pendingButton.click()
    
    // Task should still be visible
    await expect(page.locator('text=New Pending Task')).toBeVisible()
  })

  test('completed status persists across page refresh', async ({ page }) => {
    // Create a task and complete it
    const addButton = page.locator('button:has(svg)').first()
    await addButton.click()
    
    const input = page.locator('input[type="text"]')
    const uniqueTitle = `Test Task ${Date.now()}`
    await input.fill(uniqueTitle)
    
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Add")')
    await submitButton.click()
    
    // Wait for task to appear
    await expect(page.locator(`text="${uniqueTitle}"`)).toBeVisible()
    
    // Complete the task
    const taskNode = page.locator(`h4:has-text("${uniqueTitle}")`).locator('..')
    await taskNode.click({ button: 'right' })
    
    const contextMenu = page.locator('.fixed.z-50.bg-white.rounded-lg.shadow-xl')
    await expect(contextMenu).toBeVisible()
    
    const doneButton = contextMenu.locator('button:has-text("Done")')
    await doneButton.click()
    
    // Task should disappear
    await expect(page.locator(`text="${uniqueTitle}"`)).not.toBeVisible()
    
    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Task should still not be visible after refresh
    await expect(page.locator(`text="${uniqueTitle}"`)).not.toBeVisible()
  })
})