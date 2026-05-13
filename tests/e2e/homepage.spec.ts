import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    expect(page).toHaveTitle(/Next.js/i)
  })

  test('should have visible content', async ({ page }) => {
    await page.goto('/')
    const body = await page.locator('body')
    await expect(body).toBeVisible()
  })
})
