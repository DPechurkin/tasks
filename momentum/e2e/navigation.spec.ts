import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('T-E07-01: navbar shows active section', async ({ page }) => {
    await page.goto('/ideas')
    const ideasBtn = page.locator('nav').getByText('Идеи')
    await expect(ideasBtn).toHaveClass(/btn-primary/)
  })

  test('redirects from / to /ideas', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/ideas/)
  })

  test('T-E04-01: opens schedule page with 3 grids', async ({ page }) => {
    await page.goto('/schedule')
    // Должны быть три таблицы-календаря
    const tables = page.locator('table')
    await expect(tables).toHaveCount(3)
  })
})
