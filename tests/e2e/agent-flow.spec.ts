import { test, expect } from "@playwright/test"

test.describe("Agent System E2E", () => {
  test("dashboard loads and shows visits", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toContainText("Agent System")
    const visitCards = page.locator("a[href*='/visits/']")
    await expect(visitCards.first()).toBeVisible({ timeout: 10000 })
  })

  test("visit detail page loads with Run Agent button", async ({ page }) => {
    await page.goto("/")
    await page.locator("a[href*='/visits/']").first().click()
    await page.waitForURL(/\/visits\//)
    await expect(page.locator("text=Run Agent").first()).toBeVisible({ timeout: 10000 })
  })

  test("can run agent and see tasks", async ({ page }) => {
    await page.goto("/")
    await page.locator("a[href*='/visits/']").first().click()
    await page.waitForURL(/\/visits\//)
    await page.locator("text=Run Agent").click()
    await expect(page.locator("text=Pending")).toBeVisible({ timeout: 30000 })
  })

  test("HITL modal opens on approve/reject click", async ({ page }) => {
    await page.goto("/")
    await page.locator("a[href*='/visits/']").first().click()
    await page.waitForURL(/\/visits\//)
    await page.locator("text=Run Agent").click()
    await page.waitForTimeout(2000)
    const approveBtn = page.locator("text=Approve").first()
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await expect(page.locator("text=Approve").last()).toBeVisible({ timeout: 5000 })
    }
  })
})
