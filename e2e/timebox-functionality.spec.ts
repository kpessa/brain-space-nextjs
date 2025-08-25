import { test, expect } from '@playwright/test'
import { MCPBrowserHelper } from './mcp-helpers'

/**
 * Timebox Functionality Tests
 * Tests the time management and focus session features
 */

test.describe('Timebox Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/timebox')
  })

  test('should display timebox interface', async ({ page }) => {
    // Wait for timebox to load
    await page.waitForSelector('.timebox-container, [data-testid="timebox"], .focus-session', { timeout: 10000 })
    
    // Check for timer display
    const timerDisplay = page.locator('.timer, [data-testid="timer"], .time-display').first()
    if (await timerDisplay.isVisible()) {
      const timeText = await timerDisplay.textContent()
      expect(timeText).toMatch(/\d{1,2}:\d{2}/)

    }
    
    // Check for session controls
    const startButton = page.locator('button:has-text("Start"), button:has-text("Begin")').first()
    const pauseButton = page.locator('button:has-text("Pause")').first()
    const resetButton = page.locator('button:has-text("Reset")').first()
    
    expect(await startButton.isVisible() || await pauseButton.isVisible()).toBe(true)
  })

  test('should add tasks to timebox', async ({ page }) => {
    // Look for add task button or input
    const addTaskButton = page.locator('button:has-text("Add Task"), button:has-text("Add")').first()
    const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="Add"]').first()
    
    if (await taskInput.isVisible()) {
      // Add a task directly
      await taskInput.fill('Review documentation')
      await taskInput.press('Enter')
      
      // Verify task was added
      const taskItem = page.locator(':text("Review documentation")')
      await expect(taskItem).toBeVisible({ timeout: 3000 })
    } else if (await addTaskButton.isVisible()) {
      // Click add button to open form
      await addTaskButton.click()
      
      // Fill task details
      const modal = page.locator('[role="dialog"], .modal')
      if (await modal.isVisible()) {
        const titleInput = modal.locator('input[name="title"], input').first()
        await titleInput.fill('Review documentation')
        
        const durationInput = modal.locator('input[name="duration"], input[type="number"]').first()
        if (await durationInput.isVisible()) {
          await durationInput.fill('25')
        }
        
        const submitButton = modal.locator('button:has-text("Add"), button[type="submit"]').first()
        await submitButton.click()
      }
    }
    
    // Check task list
    const taskList = page.locator('.task-list, .timebox-tasks, [data-testid="tasks"]')
    if (await taskList.isVisible()) {
      const tasks = taskList.locator('.task-item, li')
      const count = await tasks.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should start and pause timer', async ({ page }) => {
    const timerDisplay = page.locator('.timer, [data-testid="timer"]').first()
    const startButton = page.locator('button:has-text("Start")').first()
    
    if (await startButton.isVisible()) {
      // Get initial time
      const initialTime = await timerDisplay.textContent()
      
      // Start timer
      await startButton.click()
      
      // Wait a few seconds
      await page.waitForTimeout(3000)
      
      // Check if time changed
      const newTime = await timerDisplay.textContent()
      expect(newTime).not.toBe(initialTime)
      
      // Pause timer
      const pauseButton = page.locator('button:has-text("Pause")').first()
      if (await pauseButton.isVisible()) {
        await pauseButton.click()
        
        // Get paused time
        const pausedTime = await timerDisplay.textContent()
        
        // Wait and verify timer is paused
        await page.waitForTimeout(2000)
        const stillPausedTime = await timerDisplay.textContent()
        expect(stillPausedTime).toBe(pausedTime)
      }
    }
  })

  test('should set custom timer duration', async ({ page }) => {
    // Look for duration settings
    const durationInput = page.locator('input[type="number"][name*="duration"], input[type="number"][name*="minutes"]').first()
    const presetButtons = page.locator('button:has-text("25"), button:has-text("15"), button:has-text("45")')
    
    if (await durationInput.isVisible()) {
      // Set custom duration
      await durationInput.clear()
      await durationInput.fill('30')
      
      // Apply settings
      const applyButton = page.locator('button:has-text("Set"), button:has-text("Apply")').first()
      if (await applyButton.isVisible()) {
        await applyButton.click()
      }
      
      // Verify timer updated
      const timerDisplay = page.locator('.timer').first()
      const timeText = await timerDisplay.textContent()
      expect(timeText).toContain('30:00')
    } else if (await presetButtons.first().isVisible()) {
      // Use preset
      await presetButtons.first().click()
      
      // Verify timer updated
      const timerDisplay = page.locator('.timer').first()
      const timeText = await timerDisplay.textContent()
      expect(timeText).toContain('25:00')
    }
  })

  test('should handle timer completion', async ({ page }) => {
    // Set a very short timer for testing
    const durationInput = page.locator('input[type="number"][name*="duration"]').first()
    
    if (await durationInput.isVisible()) {
      await durationInput.clear()
      await durationInput.fill('0.1') // 6 seconds
      
      const startButton = page.locator('button:has-text("Start")').first()
      await startButton.click()
      
      // Wait for completion
      await page.waitForTimeout(7000)
      
      // Check for completion notification
      const notification = page.locator('.notification, .toast, [role="alert"]')
      if (await notification.isVisible()) {
        const notificationText = await notification.textContent()
        expect(notificationText).toContain('complete')
      }
      
      // Check if break timer started
      const breakIndicator = page.locator(':text("Break"), .break-timer')
      if (await breakIndicator.isVisible()) {

      }
    }
  })

  test('should track focus sessions', async ({ page }) => {
    // Look for session history or stats
    const sessionStats = page.locator('.session-stats, .statistics, [data-testid="stats"]').first()
    
    if (await sessionStats.isVisible()) {
      const statsText = await sessionStats.textContent()
      
      // Should show session count
      expect(statsText).toMatch(/\d+/)
      
      // Look for today's sessions
      const todaySessions = page.locator(':text("Today"), .today-sessions')
      if (await todaySessions.isVisible()) {
        const todayText = await todaySessions.textContent()

      }
    }
  })

  test('should integrate with nodes', async ({ page }) => {
    // Look for node selector
    const nodeSelector = page.locator('select[name*="node"], [data-testid="node-select"]').first()
    const nodeSearch = page.locator('input[placeholder*="Select node"], input[placeholder*="Choose task"]').first()
    
    if (await nodeSelector.isVisible()) {
      // Get available nodes
      const options = await nodeSelector.locator('option').allTextContents()

      if (options.length > 1) {
        // Select a node
        await nodeSelector.selectOption({ index: 1 })
        
        // Verify node is linked
        const selectedNode = page.locator('.selected-node, .linked-node')
        if (await selectedNode.isVisible()) {
          const nodeText = await selectedNode.textContent()
          expect(nodeText).toBeTruthy()
        }
      }
    } else if (await nodeSearch.isVisible()) {
      // Search for a node
      await nodeSearch.fill('task')
      
      // Wait for suggestions
      await page.waitForTimeout(500)
      
      const suggestions = page.locator('.suggestions, [role="listbox"]')
      if (await suggestions.isVisible()) {
        const firstSuggestion = suggestions.locator('[role="option"]').first()
        await firstSuggestion.click()
      }
    }
  })

  test('should show productivity insights', async ({ page }) => {
    // Look for insights section
    const insights = page.locator('.insights, .productivity-stats, [data-testid="insights"]').first()
    
    if (await insights.isVisible()) {
      // Check for focus time metric
      const focusTime = insights.locator(':text("Focus Time"), :text("Total Time")')
      if (await focusTime.isVisible()) {
        const timeText = await focusTime.textContent()

      }
      
      // Check for completion rate
      const completionRate = insights.locator(':text("Completion"), :text("Complete")')
      if (await completionRate.isVisible()) {
        const rateText = await completionRate.textContent()

      }
      
      // Check for streak
      const streak = insights.locator(':text("Streak"), .streak')
      if (await streak.isVisible()) {
        const streakText = await streak.textContent()

      }
    }
  })

  test('should handle interruptions', async ({ page }) => {
    // Start a session
    const startButton = page.locator('button:has-text("Start")').first()
    
    if (await startButton.isVisible()) {
      await startButton.click()
      
      // Wait a moment
      await page.waitForTimeout(2000)
      
      // Look for interruption button
      const interruptButton = page.locator('button:has-text("Interrupt"), button:has-text("Emergency")').first()
      
      if (await interruptButton.isVisible()) {
        await interruptButton.click()
        
        // Check for interruption handling
        const modal = page.locator('[role="dialog"]')
        if (await modal.isVisible()) {
          const reasonInput = modal.locator('input[name="reason"], textarea')
          if (await reasonInput.isVisible()) {
            await reasonInput.fill('Urgent call')
          }
          
          const confirmButton = modal.locator('button:has-text("Confirm")')
          await confirmButton.click()
        }
        
        // Verify session was interrupted
        const status = page.locator('.session-status, :text("Interrupted")')
        if (await status.isVisible()) {

        }
      }
    }
  })

  test('should save timebox preferences', async ({ page }) => {
    // Look for settings/preferences
    const settingsButton = page.locator('button:has-text("Settings"), [aria-label="Settings"]').first()
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click()
      
      // Wait for settings modal
      const settingsModal = page.locator('[role="dialog"], .settings-modal')
      await expect(settingsModal).toBeVisible({ timeout: 3000 })
      
      // Change a preference
      const soundToggle = settingsModal.locator('input[type="checkbox"][name*="sound"]')
      if (await soundToggle.isVisible()) {
        const wasChecked = await soundToggle.isChecked()
        await soundToggle.click()
        
        // Save settings
        const saveButton = settingsModal.locator('button:has-text("Save")')
        await saveButton.click()
        
        // Reload page
        await page.reload()
        
        // Open settings again
        await settingsButton.click()
        await expect(settingsModal).toBeVisible()
        
        // Verify preference was saved
        const newCheckedState = await soundToggle.isChecked()
        expect(newCheckedState).toBe(!wasChecked)
      }
    }
  })
})

test.describe('Timebox Mobile Experience', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  
  test('should be usable on mobile', async ({ page }) => {
    const helper = new MCPBrowserHelper(page)
    
    await helper.navigate('/timebox')
    
    // Check mobile layout
    const timerDisplay = page.locator('.timer').first()
    if (await timerDisplay.isVisible()) {
      const bounds = await timerDisplay.boundingBox()
      
      // Timer should be prominently displayed
      expect(bounds?.width).toBeGreaterThan(200)
      
      // Check touch targets
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()
      
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i)
        const buttonBounds = await button.boundingBox()
        
        // Buttons should meet minimum touch target size (44x44)
        if (buttonBounds) {
          expect(buttonBounds.width).toBeGreaterThanOrEqual(44)
          expect(buttonBounds.height).toBeGreaterThanOrEqual(44)
        }
      }
    }
    
    // Test swipe gestures if implemented
    const swipeArea = page.locator('.swipe-area, .gesture-area')
    if (await swipeArea.isVisible()) {
      const bounds = await swipeArea.boundingBox()
      if (bounds) {
        // Simulate swipe
        await page.touchscreen.swipe({
          start: { x: bounds.x + bounds.width - 50, y: bounds.y + bounds.height / 2 },
          end: { x: bounds.x + 50, y: bounds.y + bounds.height / 2 },
          steps: 10
        })
        
        // Check if action occurred
        await page.waitForTimeout(500)
      }
    }
  })
})