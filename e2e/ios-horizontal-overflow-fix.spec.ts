import { test, expect, devices } from '@playwright/test'

// Use iPhone 13 with test user authentication
test.use({
    ...devices['iPhone 13'],
    storageState: 'e2e/storage-states/defaultUser.json'
})

test.describe('iOS Horizontal Overflow Fix', () => {
    test('should not have horizontal overflow on main pages', async ({ page }) => {

        // Navigate to journal page
        await page.goto('/journal')
        await expect(page).toHaveURL('/journal')

        // Check for horizontal overflow
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const viewportWidth = await page.evaluate(() => window.innerWidth)

        // Body should not be wider than viewport
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1) // Allow 1px tolerance

        // Check document element width
        const docWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        expect(docWidth).toBeLessThanOrEqual(viewportWidth + 1)

    })

    test('should allow vertical scrolling but prevent horizontal', async ({ page }) => {

        await page.goto('/nodes')
        await expect(page).toHaveURL('/nodes')

        // Get initial scroll position
        const initialScrollX = await page.evaluate(() => window.scrollX)
        const initialScrollY = await page.evaluate(() => window.scrollY)

        // Try to scroll horizontally (should not work)
        await page.evaluate(() => window.scrollBy(100, 0))
        const afterHorizontalScrollX = await page.evaluate(() => window.scrollX)

        // Try to scroll vertically (should work)
        await page.evaluate(() => window.scrollBy(0, 200))
        const afterVerticalScrollY = await page.evaluate(() => window.scrollY)

        // Horizontal scroll should remain at 0
        expect(afterHorizontalScrollX).toBe(0)

        // Vertical scroll should have changed
        expect(afterVerticalScrollY).toBeGreaterThan(initialScrollY)

    })

    test('should handle touch scrolling properly', async ({ page }) => {

        await page.goto('/journal')
        await expect(page).toHaveURL('/journal')

        // Get page dimensions
        const pageInfo = await page.evaluate(() => ({
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            scrollY: window.scrollY,
            bodyWidth: document.body.scrollWidth,
            viewportWidth: window.innerWidth
        }))

        // Page should be scrollable vertically
        expect(pageInfo.scrollHeight).toBeGreaterThan(pageInfo.clientHeight)

        // Page should not be wider than viewport
        expect(pageInfo.bodyWidth).toBeLessThanOrEqual(pageInfo.viewportWidth)

        // Simulate touch scroll
        const initialScrollY = pageInfo.scrollY
        await page.evaluate(() => {
            // Simulate touch scroll by 200px
            window.scrollBy(0, 200)
        })

        // Wait for scroll to settle
        await page.waitForTimeout(500)

        const finalScrollY = await page.evaluate(() => window.scrollY)

        // Should have scrolled vertically
        expect(finalScrollY).toBeGreaterThan(initialScrollY)

    })

    test('should work across all main pages', async ({ page }) => {

        const pages = ['/journal', '/nodes', '/braindump', '/matrix', '/todos']

        for (const pagePath of pages) {

            await page.goto(pagePath)
            await expect(page).toHaveURL(pagePath)

            // Check for horizontal overflow
            const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
            const viewportWidth = await page.evaluate(() => window.innerWidth)

            expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)

            // Check if page is scrollable vertically
            const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
            const clientHeight = await page.evaluate(() => document.documentElement.clientHeight)

            // Most pages should be scrollable (allow some pages to be short)
            if (scrollHeight > clientHeight) {
                // Test vertical scrolling
                const initialScrollY = await page.evaluate(() => window.scrollY)
                await page.evaluate(() => window.scrollBy(0, 100))
                const finalScrollY = await page.evaluate(() => window.scrollY)

                expect(finalScrollY).toBeGreaterThan(initialScrollY)
            }

        }
    })
})
