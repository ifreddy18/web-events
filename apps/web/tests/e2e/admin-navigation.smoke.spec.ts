import { expect, test, type Page } from "@playwright/test"
import { ADMIN_STORAGE_STATE } from "./global-setup"

const hydrated = (page: Page) => page.waitForLoadState("networkidle")

test.use({ storageState: ADMIN_STORAGE_STATE })

test.beforeEach(async ({ page }) => {
  await page.goto("/admin")
  await hydrated(page)
})

test("desktop sidebar navigates between modules and keeps the active item", async ({ page }) => {
  const sidebar = page.getByRole("complementary").getByRole("navigation", { name: "Admin" })
  await expect(sidebar.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")

  for (const [name, path] of [
    ["Event Series", "event-series"],
    ["Event Editions", "event-editions"],
    ["Competitions", "competitions"],
    ["Organizers", "organizers"],
    ["Locations", "locations"],
  ]) {
    await sidebar.getByRole("link", { name }).click()
    await page.waitForURL(`**/admin/${path}`)
    await expect(sidebar.getByRole("link", { name })).toHaveAttribute("aria-current", "page")
    await expect(sidebar.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current", "page")
  }

  // Same document: a full reload would drop this marker.
  await page.evaluate(() => ((window as unknown as { navMarker: boolean }).navMarker = true))
  await sidebar.getByRole("link", { name: "Event Editions" }).click()
  await page.waitForURL("**/admin/event-editions")
  expect(await page.evaluate(() => (window as unknown as { navMarker?: boolean }).navMarker)).toBe(true)
})

test("create page keeps the section active and shows breadcrumbs", async ({ page }) => {
  await page.goto("/admin/event-editions/new")
  await hydrated(page)
  const sidebar = page.getByRole("complementary").getByRole("navigation", { name: "Admin" })
  await expect(sidebar.getByRole("link", { name: "Event Editions" })).toHaveAttribute("aria-current", "page")

  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" })
  await expect(breadcrumb.getByRole("listitem")).toHaveText(["Events", "Event Editions", "New"])
  await breadcrumb.getByRole("link", { name: "Event Editions" }).click()
  await page.waitForURL("**/admin/event-editions")
})

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 700 } })

  test("drawer opens, navigates, closes and does not overflow", async ({ page }) => {
    await expect(page.getByRole("complementary")).toBeHidden()
    const trigger = page.getByRole("button", { name: "Open navigation menu" })
    await trigger.click()

    const drawer = page.getByRole("dialog")
    await expect(drawer.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.press("Enter")
    await expect(drawer).toBeVisible()
    await drawer.getByRole("link", { name: "Locations" }).click()
    await page.waitForURL("**/admin/locations")
    await expect(drawer).toBeHidden()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

// Own sign-in instead of the shared session: signing out ends the session server-side.
test.describe("sign out", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("signing out returns to login and locks the admin area", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL ?? "")
    await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD ?? "")
    await page.getByRole("button", { name: /sign in|log in/i }).click()
    await page.waitForURL("**/admin")
    await hydrated(page)
    await page.getByRole("button", { name: "Sign out" }).click()
    await page.waitForURL("**/login")
    await page.goto("/admin/locations")
    await expect(page).toHaveURL(/\/login/)
  })
})
