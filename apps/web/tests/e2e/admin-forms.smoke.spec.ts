import { expect, test, type Page } from "@playwright/test"

// Smoke test of the Locations and Organizers forms. Global setup provisions a throwaway admin
// in events_test (see global-setup.ts); a missing setup fails the run instead of skipping.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD
if (!email || !password) throw new Error("E2E admin credentials missing: global setup did not run.")

// Interactions before hydration would fall back to native form submits / dead buttons.
const hydrated = (page: Page) => page.waitForLoadState("networkidle")

const run = `itest-e2e-${Date.now()}`

test("unauthenticated visitors are redirected to login", async ({ page }) => {
  for (const path of ["/admin", "/admin/organizers", "/admin/locations/new"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login/)
  }
})

test.describe("signed in", () => {
test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL("**/admin")
})

test("organizer: validation, create, edit, delete", async ({ page }) => {
  await page.goto("/admin/organizers/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create organizer" }).click()
  await expect(page.getByText("Name is required.")).toBeVisible()

  await page.getByLabel("Name").fill(`${run} Club`)
  await page.getByRole("button", { name: "Create organizer" }).click()
  await expect(page.getByRole("status")).toHaveText("Organizer created.")

  await page.getByLabel("Search organizers").fill(run)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("link", { name: "Edit" }).click()
  await page.waitForURL("**/edit")
  await hydrated(page)
  await page.getByLabel("Description").fill("Edited")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("status")).toHaveText("Organizer updated.")

  await page.getByLabel("Search organizers").fill(run)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("button", { name: `Delete ${run} Club` }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Organizer deleted.")
})

test("location: validation, create, delete", async ({ page }) => {
  await page.goto("/admin/locations/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create location" }).click()
  await expect(page.getByText("Country is required.")).toBeVisible()

  await page.getByLabel("Country").fill("Venezuela")
  await page.getByLabel("City").fill(run)
  await page.getByRole("button", { name: "Create location" }).click()
  await expect(page.getByRole("status")).toHaveText("Location created.")

  await page.getByLabel("Search locations").fill(run)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("button", { name: /^Delete / }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Location deleted.")
})
})
