import { test, expect } from '@playwright/test'

/**
 * Test for Journal Entry Summaries Feature
 * 
 * Requirements:
 * - Journal entries should display meaningful summaries
 * - Not just dates and XP points
 * - Should show content preview or key insights
 */

test.describe('Journal Entry Summaries', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the journal route
    await page.goto('/journal')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display meaningful journal entry summaries', async ({ page }) => {
    // Check that journal entries are present
    const journalEntries = page.locator('[data-testid="journal-entry"]')
    const entryCount = await journalEntries.count()
    
    // Expect at least one journal entry to exist
    expect(entryCount).toBeGreaterThan(0)
    
    // For each journal entry, verify it has meaningful content
    for (let i = 0; i < Math.min(entryCount, 3); i++) {
      const entry = journalEntries.nth(i)
      
      // Check for date (this should already exist)
      const dateElement = entry.locator('[data-testid="journal-entry-date"]')
      await expect(dateElement).toBeVisible()
      const dateText = await dateElement.textContent()
      expect(dateText).toBeTruthy()
      
      // Check for XP (this should already exist)
      const xpElement = entry.locator('[data-testid="journal-entry-xp"]')
      await expect(xpElement).toBeVisible()
      
      // NEW REQUIREMENTS: Check for meaningful summary content
      
      // 1. Should have a summary or excerpt
      const summaryElement = entry.locator('[data-testid="journal-entry-summary"]')
      await expect(summaryElement).toBeVisible()
      const summaryText = await summaryElement.textContent()
      expect(summaryText).toBeTruthy()
      expect(summaryText!.length).toBeGreaterThan(20) // At least 20 characters
      
      // 2. Should have mood or emotion indicator (if available)
      const moodElement = entry.locator('[data-testid="journal-entry-mood"]')
      if (await moodElement.count() > 0) {
        await expect(moodElement).toBeVisible()
      }
      
      // 3. Should have key topics or tags
      const tagsElement = entry.locator('[data-testid="journal-entry-tags"]')
      if (await tagsElement.count() > 0) {
        await expect(tagsElement).toBeVisible()
        const tags = await tagsElement.locator('.tag').count()
        expect(tags).toBeGreaterThan(0)
      }
      
      // 4. Should have word count or length indicator
      const wordCountElement = entry.locator('[data-testid="journal-entry-word-count"]')
      if (await wordCountElement.count() > 0) {
        await expect(wordCountElement).toBeVisible()
      }
    }
  })

  test('should show preview on hover or have expandable summaries', async ({ page }) => {
    const firstEntry = page.locator('[data-testid="journal-entry"]').first()
    
    // Check if hovering shows more content
    await firstEntry.hover()
    
    // Wait a moment for any hover effects
    await page.waitForTimeout(500)
    
    // Check for expanded content or tooltip
    const expandedContent = page.locator('[data-testid="journal-entry-expanded"]')
    const tooltip = page.locator('[role="tooltip"]')
    
    // Either expanded content or tooltip should be visible
    const hasExpandedContent = await expandedContent.count() > 0
    const hasTooltip = await tooltip.count() > 0
    
    expect(hasExpandedContent || hasTooltip).toBeTruthy()
  })

  test('should be able to click through to full journal entry', async ({ page }) => {
    const firstEntry = page.locator('[data-testid="journal-entry"]').first()
    
    // Click on the entry
    await firstEntry.click()
    
    // Should navigate to detail view or open modal
    const detailView = page.locator('[data-testid="journal-entry-detail"]')
    const modal = page.locator('[data-testid="journal-entry-modal"]')
    
    // Wait for either detail view or modal to appear
    await expect(detailView.or(modal)).toBeVisible({ timeout: 5000 })
    
    // Should show full content
    const fullContent = page.locator('[data-testid="journal-entry-full-content"]')
    await expect(fullContent).toBeVisible()
    const contentText = await fullContent.textContent()
    expect(contentText!.length).toBeGreaterThan(100) // Substantial content
  })
})

// Test with mock data if no real entries exist
test.describe('Journal Entry Summaries with Mock Data', () => {
  test('should handle empty state gracefully', async ({ page }) => {
    await page.goto('/journal')
    
    const entries = page.locator('[data-testid="journal-entry"]')
    const entryCount = await entries.count()
    
    if (entryCount === 0) {
      // Should show empty state message
      const emptyState = page.locator('[data-testid="journal-empty-state"]')
      await expect(emptyState).toBeVisible()
      
      // Should have call to action to create first entry
      const ctaButton = page.locator('[data-testid="create-journal-entry-cta"]')
      await expect(ctaButton).toBeVisible()
    }
  })
})