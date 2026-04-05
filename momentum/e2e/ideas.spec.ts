import { test, expect } from '@playwright/test'

test.describe('Ideas page', () => {
  test('T-E01-01: opens ideas page', async ({ page }) => {
    await page.goto('/ideas')
    await expect(page.locator('h1, h3')).toContainText('Идеи')
  })

  test('T-E01-03: can create an idea', async ({ page }) => {
    await page.goto('/ideas')
    // Нажать кнопку "Новая идея"
    await page.click('button:has-text("Новая идея")')
    // Заполнить форму
    await page.fill('input[placeholder*="Название"]', 'Тестовая идея E2E')
    // Сохранить
    await page.click('button:has-text("Сохранить")')
    // Проверить что идея появилась
    await expect(page.locator('text=Тестовая идея E2E')).toBeVisible()
  })

  test('T-E01-04: validates empty title', async ({ page }) => {
    await page.goto('/ideas')
    await page.click('button:has-text("Новая идея")')
    await page.click('button:has-text("Сохранить")')
    // Ошибка валидации должна быть видна
    await expect(page.locator('.alert-danger, .is-invalid')).toBeVisible()
  })
})
